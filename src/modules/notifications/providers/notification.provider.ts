export abstract class NotificationProvider {
  /**
   * Gửi thông báo đến một User cụ thể
   */
  abstract sendToUser(userId: string, event: string, data: any): void;

  /**
   * Gửi thông báo đến tất cả mọi người (nếu cần)
   */
  abstract broadcast(event: string, data: any): void;
}
