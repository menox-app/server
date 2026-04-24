import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationProvider } from './providers/notification.provider';
import { Logger } from '@nestjs/common';
import { RedisService } from '@/infrastructure/redis/redis.service';

@WebSocketGateway({
    cors: {
        origin: "*",
        credentials: true,
        methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
})
export class NotificationsGateway extends NotificationProvider implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private logger: Logger = new Logger('NotificationsGateway');

    constructor(private readonly redisService: RedisService) {
        super();
    }

    async handleConnection(client: Socket) {
        const userId = client.handshake.query.userId as string;
        if (userId) {
            this.logger.log(`📱 User ${userId} connected via socket: ${client.id}`);
            
            // Kiểm tra Redis có sẵn sàng không
            if (this.redisService.getClient().status !== 'ready') return;

            try {
                const redisKey = `user:sockets:${userId}`;
                await this.redisService.getClient().sadd(redisKey, client.id);
                await this.redisService.getClient().expire(redisKey, 86400); // 24h
            } catch (error) {
                this.logger.error(`Error saving socket to redis: ${error.message}`);
            }
        }
    }

    async handleDisconnect(client: Socket) {
        const userId = client.handshake.query.userId as string;
        if (userId && this.redisService.getClient().status === 'ready') {
            try {
                this.logger.log(`📱 User ${userId} disconnected: ${client.id}`);
                await this.redisService.getClient().srem(`user:sockets:${userId}`, client.id);
            } catch (error) {
                this.logger.error(`Error removing socket from redis: ${error.message}`);
            }
        }
    }

    async sendToUser(userId: string, event: string, data: any) {
        if (this.redisService.getClient().status !== 'ready') return;

        try {
            const redisKey = `user:sockets:${userId}`;
            const socketIds = await this.redisService.getClient().smembers(redisKey);
            
            if (socketIds.length > 0) {
                this.server.to(socketIds).emit(event, data);
            }
        } catch (error) {
            this.logger.error(`Error sending message via socket: ${error.message}`);
        }
    }

    broadcast(event: string, data: any) {
        this.server.emit(event, data);
    }
}
