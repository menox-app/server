import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationProvider } from './providers/notification.provider';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: "*",
        credentials: true,
        methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    namespace: 'notifications'
})
export class NotificationsGateway extends NotificationProvider implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private logger: Logger = new Logger('NotificationsGateway');


    private userSockets = new Map<string, string>();

    handleConnection(client: Socket) {
        const userId = client.handshake.query.userId as string;
        if (userId) {
            this.userSockets.set(userId, client.id);
            this.logger.log(`📱 User ${userId} connected via socket`);
        }
    }
    handleDisconnect(client: Socket) {
        // Xóa user khỏi map khi ngắt kết nối
        for (const [userId, socketId] of this.userSockets.entries()) {
            if (socketId === client.id) {
                this.userSockets.delete(userId);
                this.logger.log(`📱 User ${userId} disconnected`);
                break;
            }
        }
    }

    // Triển khai hàm sendToUser từ lớp cha
    sendToUser(userId: string, event: string, data: any) {
        const socketId = this.userSockets.get(userId);
        if (socketId) {
            this.server.to(socketId).emit(event, data);
        }
    }

    broadcast(event: string, data: any) {
        this.server.emit(event, data);
    }

}
