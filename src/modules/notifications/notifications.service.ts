import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '@/infrastructure/knex/knex.module';
import { BaseRepository } from '@/infrastructure/repositories/base.repository';
import { Collections } from '@/common/enums/collections.enum';
import { randomUUID } from 'crypto';
import { NotificationType } from './enums/notifications.enum';

@Injectable()
export class NotificationsService extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) knex: Knex) {
    super(knex);
  }

  async createNotification(data: {
    recipient_id: string;
    actor_id: string;
    type: NotificationType;
    entity_id?: string;
    content?: string;
  }) {
    const id = randomUUID();
    return this.knex(Collections.NOTIFICATIONS).insert({
      id,
      ...data,
      is_read: false,
      created_at: new Date(),
    });
  }

  async getUserNotifications(userId: string) {
    return this.knex(Collections.NOTIFICATIONS)
      .where({ recipient_id: userId })
      .orderBy('created_at', 'desc')
      .limit(50);
  }


  async markAsRead(id: string) {
    return this.knex(Collections.NOTIFICATIONS).where({ id }).update({ is_read: true });
  }
}
