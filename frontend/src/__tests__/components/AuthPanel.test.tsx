import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../auth/AuthProvider';
import AuthPanel from '../../components/auth/AuthPanel';
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
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: session.user }, error: null }),
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
    vi.mocked(fetchAuthenticatedIdentity).mockResolvedValue({
      user_id: 'aaee5e94-d359-42d4-8896-8f92eb6c4c24',
      email: 'auth@example.com',
    });
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
    await user.type(screen.getByLabelText(/^password$/i), 'new-password1');
    await user.type(screen.getByLabelText(/^confirm password$/i), 'new-password1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'new-password1',
    }));
  });

  it('shows actionable validation errors before submitting', async () => {
    const user = userEvent.setup();
    const client = renderAuthPanel();

    await user.type(await screen.findByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/^password$/i), '123');
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

  it('shows password strength feedback and blocks mismatched signup passwords', async () => {
    const user = userEvent.setup();
    const client = renderAuthPanel();

    await user.click(await screen.findByRole('tab', { name: /sign up/i }));
    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'abc');

    expect(screen.getByText(/password strength:/i).parentElement).toHaveTextContent(/too short/i);

    await user.clear(screen.getByLabelText(/^password$/i));
    await user.type(screen.getByLabelText(/^password$/i), 'abcdef12');
    expect(screen.getByText(/password strength:/i).parentElement).toHaveTextContent(/acceptable/i);
    await user.type(screen.getByLabelText(/^confirm password$/i), 'abcdef13');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/passwords do not match/i);
    expect(client.auth.signUp).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText(/^password$/i));
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass42!');
    expect(screen.getByText(/password strength: strong/i)).toBeInTheDocument();
  });

  it('starts password recovery with the configured recovery redirect', async () => {
    const user = userEvent.setup();
    const client = renderAuthPanel();
    vi.stubEnv('VITE_SUPABASE_RECOVERY_REDIRECT_URL', 'http://localhost:5175/auth/recovery');

    await user.click(await screen.findByRole('button', { name: /forgot password/i }));
    await user.type(screen.getByLabelText(/email/i), 'recover@example.com');
    await user.click(screen.getByRole('button', { name: /send recovery link/i }));

    await waitFor(() => expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'recover@example.com',
      { redirectTo: 'http://localhost:5175/auth/recovery' },
    ));
    expect(await screen.findByRole('status')).toHaveTextContent(/password reset link/i);
  });

  it('shows password recovery API errors without claiming delivery', async () => {
    const user = userEvent.setup();
    const client = createClientMock();
    client.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: new Error('SMTP provider is not configured.'),
    });
    renderAuthPanel(client);

    await user.click(await screen.findByRole('button', { name: /forgot password/i }));
    await user.type(screen.getByLabelText(/email/i), 'recover@example.com');
    await user.click(screen.getByRole('button', { name: /send recovery link/i }));

    await waitFor(() => expect(client.auth.resetPasswordForEmail).toHaveBeenCalled());
    expect(await screen.findByRole('alert')).toHaveTextContent(/smtp provider is not configured/i);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
