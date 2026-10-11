import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { AuthContext, type AuthContextValue } from './auth-context';
import { fetchAuthenticatedIdentity, type BackendIdentity } from '../services/api';
import { createSupabaseBrowserClient } from '../services/supabase';

function authErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function redirectUrl(): string {
  return import.meta.env.VITE_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [backendIdentity, setBackendIdentity] = useState<BackendIdentity | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const verificationSequence = useRef(0);

  useEffect(() => {
    let active = true;

    try {
      const supabase = createSupabaseBrowserClient();
      setClient(supabase);

      void supabase.auth.getSession().then(({ data, error: sessionError }) => {
        if (!active) {
          return;
        }

        if (sessionError) {
          setError(authErrorMessage(sessionError, 'Unable to restore your session.'));
          setSession(null);
        } else {
          setSession(data.session);
        }

        setLoading(false);
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        if (!nextSession) {
          setBackendIdentity(null);
          setIdentityError(null);
          setIdentityLoading(false);
        }
        setError(null);
        setLoading(false);
      });

      return () => {
        active = false;
        listener.subscription.unsubscribe();
      };
    } catch (configError) {
      setError(authErrorMessage(configError, 'Supabase authentication is not configured.'));
      setSession(null);
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, []);

  const verifyBackendIdentity = useCallback(async () => {
    return fetchAuthenticatedIdentity(session?.access_token);
  }, [session?.access_token]);

  useEffect(() => {
    const token = session?.access_token;
    const sequence = verificationSequence.current + 1;
    verificationSequence.current = sequence;

    if (!token) {
      setBackendIdentity(null);
      setIdentityError(null);
      setIdentityLoading(false);
      return;
    }

    setBackendIdentity(null);
    setIdentityError(null);
    setIdentityLoading(true);

    void fetchAuthenticatedIdentity(token)
      .then((identity) => {
        if (verificationSequence.current !== sequence) {
          return;
        }

        setBackendIdentity(identity);
        setIdentityError(null);
      })
      .catch((verificationError) => {
        if (verificationSequence.current !== sequence) {
          return;
        }

        setBackendIdentity(null);
        setIdentityError(authErrorMessage(verificationError, 'Unable to verify backend identity.'));
      })
      .finally(() => {
        if (verificationSequence.current === sequence) {
          setIdentityLoading(false);
        }
      });
  }, [session?.access_token]);

  const requireClient = useCallback(() => {
    if (!client) {
      throw new Error('Supabase authentication is not configured.');
    }

    return client;
  }, [client]);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    const { data, error: signUpError } = await requireClient().auth.signUp({ email, password });

    if (signUpError) {
      const message = authErrorMessage(signUpError, 'Unable to create your account.');
      setError(message);
      throw new Error(message);
    }

    setSession(data.session);
  }, [requireClient]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const { data, error: signInError } = await requireClient().auth.signInWithPassword({ email, password });

    if (signInError) {
      const message = authErrorMessage(signInError, 'Unable to sign in.');
      setError(message);
      throw new Error(message);
    }

    setSession(data.session);
  }, [requireClient]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const { error: oauthError } = await requireClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl(),
      },
    });

    if (oauthError) {
      const message = authErrorMessage(oauthError, 'Unable to start Google sign-in.');
      setError(message);
      throw new Error(message);
    }
  }, [requireClient]);

  const signOut = useCallback(async () => {
    setError(null);
    const { error: signOutError } = await requireClient().auth.signOut();

    if (signOutError) {
      const message = authErrorMessage(signOutError, 'Unable to sign out.');
      setError(message);
      throw new Error(message);
    }

    setSession(null);
    setBackendIdentity(null);
    setIdentityError(null);
    setIdentityLoading(false);
  }, [requireClient]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    backendIdentity,
    loading,
    identityLoading,
    identityVerified: Boolean(backendIdentity && !identityLoading && !identityError),
    identityError,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    verifyBackendIdentity,
    clearError: () => setError(null),
  }), [
    backendIdentity,
    error,
    identityError,
    identityLoading,
    loading,
    session,
    signIn,
    signInWithGoogle,
    signOut,
    signUp,
    verifyBackendIdentity,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
