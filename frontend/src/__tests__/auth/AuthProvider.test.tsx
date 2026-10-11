import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../auth/AuthProvider';
import { useAuth } from '../../auth/useAuth';
import { fetchAuthenticatedIdentity } from '../../services/api';
import { createSupabaseBrowserClient } from '../../services/supabase';

vi.mock('../../services/api', () => ({
  fetchAuthenticatedIdentity: vi.fn(),
}));

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

const secondSession = {
  ...session,
  access_token: 'redacted-second-access-token',
  refresh_token: 'redacted-second-refresh-token',
  user: {
    ...session.user,
    id: '096e5c3c-30b1-4e5c-84ec-f2c3fb700d5e',
    email: 'second@example.com',
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

function BackendIdentityProbe() {
  const { loading, verifyBackendIdentity } = useAuth();

  if (loading) {
    return <div>Loading auth</div>;
  }

  return (
    <button type="button" onClick={() => void verifyBackendIdentity()}>
      Verify Backend Identity
    </button>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAuthenticatedIdentity).mockResolvedValue({
      user_id: '8d9bbdf8-1b5d-4c77-92a6-e8ab0a0fbdfa',
      email: 'test@example.com',
    });
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
    await waitFor(() => expect(fetchAuthenticatedIdentity).toHaveBeenCalledWith('redacted-access-token'));
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

  it('does not remain verified when backend identity verification fails', async () => {
    const { client } = createClientMock(session);
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(client as never);
    vi.mocked(fetchAuthenticatedIdentity).mockRejectedValue(new Error('Token is invalid.'));

    function IdentityProbe() {
      const { identityError, identityVerified, loading } = useAuth();

      if (loading) {
        return <div>Loading auth</div>;
      }

      return <div>{identityVerified ? 'Verified' : identityError}</div>;
    }

    render(
      <AuthProvider>
        <IdentityProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('Token is invalid.')).toBeInTheDocument();
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });

  it('prevents stale backend identity responses from overwriting a switched account', async () => {
    let authStateCallback: ((_event: string, nextSession: Session | null) => void) | null = null;
    const unsubscribe = vi.fn();
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
        onAuthStateChange: vi.fn().mockImplementation((callback) => {
          authStateCallback = callback;
          return { data: { subscription: { unsubscribe } } };
        }),
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
    };
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(client as never);
    let resolveFirst!: (value: { user_id: string; email: string | null }) => void;
    let resolveSecond!: (value: { user_id: string; email: string | null }) => void;
    vi.mocked(fetchAuthenticatedIdentity).mockImplementation((token) => (
      new Promise((resolve) => {
        if (token === 'redacted-access-token') {
          resolveFirst = resolve;
        } else {
          resolveSecond = resolve;
        }
      })
    ));

    function IdentityProbe() {
      const { backendIdentity, identityLoading } = useAuth();
      return <div>{identityLoading ? 'Verifying' : backendIdentity?.email || 'No identity'}</div>;
    }

    render(
      <AuthProvider>
        <IdentityProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(fetchAuthenticatedIdentity).toHaveBeenCalledWith('redacted-access-token'));
    expect(authStateCallback).not.toBeNull();
    const emitAuthStateChange = authStateCallback as unknown as (
      event: string,
      nextSession: Session | null
    ) => void;
    emitAuthStateChange('SIGNED_IN', secondSession);
    await waitFor(() => expect(fetchAuthenticatedIdentity).toHaveBeenCalledWith('redacted-second-access-token'));

    resolveSecond({ user_id: '096e5c3c-30b1-4e5c-84ec-f2c3fb700d5e', email: 'second@example.com' });
    expect(await screen.findByText('second@example.com')).toBeInTheDocument();

    resolveFirst({ user_id: '8d9bbdf8-1b5d-4c77-92a6-e8ab0a0fbdfa', email: 'test@example.com' });
    await waitFor(() => expect(screen.getByText('second@example.com')).toBeInTheDocument());
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
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

  it('uses the current Supabase access token for backend identity verification', async () => {
    const user = userEvent.setup();
    const { client } = createClientMock(session);
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(client as never);

    render(
      <AuthProvider>
        <BackendIdentityProbe />
      </AuthProvider>,
    );

    await user.click(await screen.findByRole('button', { name: /verify backend identity/i }));

    expect(fetchAuthenticatedIdentity).toHaveBeenCalledWith('redacted-access-token');
  });
});
