import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../auth/AuthProvider';
import AuthPanel from '../../components/auth/AuthPanel';
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
    id: 'aaee5e94-d359-42d4-8896-8f92eb6c4c24',
    email: 'auth@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-10-10T00:00:00Z',
  },
} as Session;

function createClientMock() {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signUp: vi.fn().mockResolvedValue({ data: { session }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session }, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

function renderAuthPanel(client = createClientMock()) {
  vi.mocked(createSupabaseBrowserClient).mockReturnValue(client as never);

  render(
    <AuthProvider>
      <AuthPanel />
    </AuthProvider>,
  );

  return client;
}

describe('AuthPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_REDIRECT_URL', 'http://localhost:5175/auth/callback');
  });

  it('signs in with email and password', async () => {
    const user = userEvent.setup();
    const client = renderAuthPanel();

    await user.type(await screen.findByLabelText(/email/i), 'auth@example.com');
    await user.type(screen.getByLabelText(/password/i), 'correct-password');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'auth@example.com',
      password: 'correct-password',
    }));
  });

  it('signs up with email and password', async () => {
    const user = userEvent.setup();
    const client = renderAuthPanel();

    await user.click(await screen.findByRole('tab', { name: /sign up/i }));
    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/password/i), 'new-password');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'new-password',
    }));
  });

  it('shows actionable validation errors before submitting', async () => {
    const user = userEvent.setup();
    const client = renderAuthPanel();

    await user.type(await screen.findByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), '123');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i);
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('starts Google OAuth with the configured callback URL', async () => {
    const user = userEvent.setup();
    const client = renderAuthPanel();

    await user.click(await screen.findByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:5175/auth/callback',
      },
    }));
  });
});
