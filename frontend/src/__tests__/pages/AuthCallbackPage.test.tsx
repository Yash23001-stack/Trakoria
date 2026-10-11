import { render, screen, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../auth/AuthProvider';
import AuthCallbackPage from '../../pages/AuthCallbackPage';
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
    id: '8b5bdaaa-f7d6-4231-9a56-5801ba9f66ea',
    email: 'callback@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-10-10T00:00:00Z',
  },
} as Session;

function createClientMock(restoredSession: Session | null) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: restoredSession }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  };
}

function renderCallback(restoredSession: Session | null, redirectTo = vi.fn()) {
  const client = createClientMock(restoredSession);
  vi.mocked(createSupabaseBrowserClient).mockReturnValue(client as never);

  render(
    <AuthProvider>
      <AuthCallbackPage redirectTo={redirectTo} />
    </AuthProvider>,
  );

  return { client, redirectTo };
}

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('shows Supabase callback errors from the URL', async () => {
    window.history.replaceState(null, '', '/auth/callback?error_description=Google%20sign-in%20was%20cancelled');

    const { redirectTo } = renderCallback(null);

    expect(await screen.findByRole('alert')).toHaveTextContent('Google sign-in was cancelled');
    expect(screen.getByRole('link', { name: /return to sign in/i })).toHaveAttribute('href', '/');
    expect(redirectTo).not.toHaveBeenCalled();
  });

  it('requests a real redirect to the root path after restoring a session', async () => {
    window.history.replaceState(null, '', '/auth/callback');
    const redirectTo = vi.fn();

    renderCallback(session, redirectTo);

    expect(screen.getByRole('heading', { name: /auth callback/i })).toBeInTheDocument();
    await waitFor(() => expect(redirectTo).toHaveBeenCalledWith('/'));
  });

  it('does not redirect without a restored session', async () => {
    window.history.replaceState(null, '', '/auth/callback');

    const { redirectTo } = renderCallback(null);

    expect(await screen.findByText('Session restored. Redirecting...')).toBeInTheDocument();
    expect(redirectTo).not.toHaveBeenCalled();
  });
});
