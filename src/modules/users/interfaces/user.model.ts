import { Role } from '@/modules/users/enums/role.enum';

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: Role;
  is_verified: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;

  // ✨ Các trường Social mới thêm vào
  follower_count?: number;
  following_count?: number;
  post_count?: number;
  is_following?: boolean;
}
