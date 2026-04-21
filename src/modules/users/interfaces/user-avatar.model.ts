export interface UserAvatar {
  id: string;
  userId: string;
  url: string;
  publicId: string | null;
  isCurrent: boolean;
  createdAt: Date;
}
