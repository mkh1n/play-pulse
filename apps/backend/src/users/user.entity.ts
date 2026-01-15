import { UserProfile } from './user-profile.entity';
export interface User {
  id: number;
  login: string;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
  profile?: UserProfile;
}