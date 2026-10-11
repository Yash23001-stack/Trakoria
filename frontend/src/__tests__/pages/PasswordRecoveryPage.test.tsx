import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../auth/AuthProvider';
import PasswordRecoveryPage from '../../pages/PasswordRecoveryPage';
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
    email: 'recover@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-10-10T00:00:00Z',
  },
} as Session;

function renderRecovery(initialSession: Session | null, options: { recoveryUrl?: boolean; updateError?: Error } = {}) {
  window.history.replaceState(null, '', options.recoveryUrl ? '/auth/recovery#type=recovery' : '/auth/recovery');
  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: initialSession }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn().mockResolvedValue(options.updateError ? { data: {}, error: options.updateError } : { data: { user: session.user }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
  vi.mocked(createSupabaseBrowserClient).mockReturnValue(client as never);

  render(
    <AuthProvider>
      <PasswordRecoveryPage />
    </AuthProvider>,
  );

  return client;
}

describe('PasswordRecoveryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
    vi.mocked(fetchAuthenticatedIdentity).mockResolvedValue({
      user_id: '8d9bbdf8-1b5d-4c77-92a6-e8ab0a0fbdfa',
      email: 'recover@example.com',
    });
  });

  it('shows an error when no recovery session is available', async () => {
    renderRecovery(null);

    expect(await screen.findByRole('alert')).toHaveTextContent(/missing, expired, or already used/i);
  });

  it('does not show the reset form for an ordinary non-recovery session', async () => {
    renderRecovery(session);

    expect(await screen.findByRole('alert')).toHaveTextContent(/missing, expired, or already used/i);
    expect(screen.queryByLabelText(/^new password/i)).not.toBeInTheDocument();
  });

  it('updates the password after a valid recovery session is restored', async () => {
    const user = userEvent.setup();
    const client = renderRecovery(session, { recoveryUrl: true });

    await user.type(await screen.findByLabelText(/^new password/i), 'new-password-42');
    await user.type(screen.getByLabelText(/^confirm password/i), 'new-password-42');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'new-password-42' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/password updated/i);
    expect(screen.getByRole('button', { name: /return to sign in/i })).toBeInTheDocument();
  });

  it('rejects weak or mismatched recovery passwords before calling Supabase', async () => {
    const user = userEvent.setup();
    const client = renderRecovery(session, { recoveryUrl: true });

    await user.type(await screen.findByLabelText(/^new password/i), 'short');

    expect(screen.getByText(/use at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled();
    expect(client.auth.updateUser).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText(/^new password/i));
    await user.type(screen.getByLabelText(/^new password/i), 'new-password-42');
    await user.type(screen.getByLabelText(/^confirm password/i), 'different-password');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/passwords do not match/i);
    expect(client.auth.updateUser).not.toHaveBeenCalled();
  });

  it('shows a useful error when the password update fails', async () => {
    const user = userEvent.setup();
    const client = renderRecovery(session, {
      recoveryUrl: true,
      updateError: new Error('Recovery token has expired.'),
    });

    await user.type(await screen.findByLabelText(/^new password/i), 'new-password-42');
    await user.type(screen.getByLabelText(/^confirm password/i), 'new-password-42');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'new-password-42' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/recovery token has expired/i);
  });
});
