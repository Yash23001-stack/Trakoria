import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../auth/AuthProvider';
import { useAuth } from '../../auth/useAuth';
import { createSupabaseBrowserClient } from '../../services/supabase';

vi.mock('../../services/supabase', () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

const session = {
  access_token: 'redacted-access-token',
  refresh_token: 'redacted-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: '8d9bbdf8-1b5d-4c77-92a6-e8ab0a0fbdfa',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-10-10T00:00:00Z',
  },
} as Session;

function createClientMock(initialSession: Session | null = null) {
  const unsubscribe = vi.fn();
  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: initialSession }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe } } }),
      signUp: vi.fn().mockResolvedValue({ data: { session }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session }, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };

  return { client, unsubscribe };
}

function createSessionErrorClient() {
  const unsubscribe = vi.fn();
  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: new Error('Session expired') }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe } } }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  };

  return client;
}

function AuthProbe() {
  const { loading, session, signOut, user } = useAuth();

  if (loading) {
    return <div>Loading auth</div>;
  }

  return (
    <div>
      <div>{session ? user?.email : 'No session'}</div>
      <button type="button" onClick={() => void signOut()}>Sign Out</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores an existing Supabase session', async () => {
    const { client } = createClientMock(session);
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(client as never);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('test@example.com')).toBeInTheDocument();
    expect(client.auth.getSession).toHaveBeenCalledTimes(1);
    expect(client.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('treats a null restored session as signed out', async () => {
    const { client } = createClientMock(null);
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(client as never);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('No session')).toBeInTheDocument();
  });

  it('surfaces restoration errors such as expired stored sessions', async () => {
    const client = createSessionErrorClient();
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(client as never);

    function ErrorProbe() {
      const { error, loading, session } = useAuth();

      if (loading) {
        return <div>Loading auth</div>;
      }

      return <div>{error || (session ? 'Session found' : 'No session')}</div>;
    }

    render(
      <AuthProvider>
        <ErrorProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('Session expired')).toBeInTheDocument();
  });

  it('signs out and clears session state', async () => {
    const user = userEvent.setup();
    const { client } = createClientMock(session);
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(client as never);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('test@example.com')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(screen.getByText('No session')).toBeInTheDocument());
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('cleans up the Supabase auth-state subscription', async () => {
    const { client, unsubscribe } = createClientMock(null);
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(client as never);

    const { unmount } = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('No session')).toBeInTheDocument();
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
