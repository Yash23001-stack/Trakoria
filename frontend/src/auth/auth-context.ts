import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { BackendIdentity } from '../services/api';

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  backendIdentity: BackendIdentity | null;
  loading: boolean;
  identityLoading: boolean;
  identityVerified: boolean;
  identityError: string | null;
  isPasswordRecovery: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  verifyBackendIdentity: () => Promise<BackendIdentity>;
  clearError: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
