import { Role } from '@/modules/users/enums/role.enum';

export interface User {
  id: string;
  email: string;
  passwordHash: string | null;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isPro: boolean;
  avatarFrameId: string | null;
  role: Role;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
