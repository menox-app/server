import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsListener } from './notifications.listener';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationProvider } from './providers/notification.provider';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsListener, {
    provide: NotificationProvider,
    useClass: NotificationsGateway
  }],
  exports: [NotificationsService, NotificationProvider]
})
export class NotificationsModule { }
