import { Provider } from '@/modules/auth/enums/provider.enum';

export interface Account {
  id: string;
  userId: string;
  provider: Provider;
  providerAccountId: string;
  accessToken: string | null;
  idToken: string | null;
}
