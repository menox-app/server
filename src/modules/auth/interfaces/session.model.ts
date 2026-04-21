export interface Session {
  id: string;
  userId: string;
  token: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  expiresAt: Date;
}
