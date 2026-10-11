import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AccountBoard from '../../components/auth/AccountBoard';

describe('AccountBoard', () => {
  it('displays the signed-in email without the technical backend status', () => {
    render(
      <AccountBoard
        email="user-a@example.com"
        identity={{ user_id: 'user-a', email: 'user-a@example.com' }}
        identityError={null}
        identityLoading={false}
        onLogout={vi.fn()}
        onChangePassword={vi.fn()}
      />,
    );

    expect(screen.getByText('user-a@example.com')).toBeInTheDocument();
    expect(screen.queryByText(/backend identity/i)).not.toBeInTheDocument();
  });

  it('shows verification errors without pretending the user is verified', () => {
    render(
      <AccountBoard
        email="user-b@example.com"
        identity={null}
        identityError="Token is invalid."
        identityLoading={false}
        onLogout={vi.fn()}
        onChangePassword={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/account access could not be verified/i);
    expect(screen.queryByText(/token is invalid/i)).not.toBeInTheDocument();
  });

  it('calls logout from the account board', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(
      <AccountBoard
        email="user-a@example.com"
        identity={{ user_id: 'user-a', email: 'user-a@example.com' }}
        identityError={null}
        identityLoading={false}
        onLogout={onLogout}
        onChangePassword={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /logout/i }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('validates and submits a password change', async () => {
    const user = userEvent.setup();
    const onChangePassword = vi.fn().mockResolvedValue(undefined);
    render(
      <AccountBoard
        email="user-a@example.com"
        identity={{ user_id: 'user-a', email: 'user-a@example.com' }}
        identityError={null}
        identityLoading={false}
        onLogout={vi.fn()}
        onChangePassword={onChangePassword}
      />,
    );

    await user.click(screen.getByRole('button', { name: /change password/i }));
    await user.type(screen.getByLabelText(/^new password/i), 'abc');

    expect(screen.getByText(/use at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled();
    expect(onChangePassword).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText(/^new password/i));
    await user.type(screen.getByLabelText(/^new password/i), 'better-password-42');
    await user.type(screen.getByLabelText(/^confirm password/i), 'better-password-42');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(onChangePassword).toHaveBeenCalledWith('better-password-42');
    expect(await screen.findByRole('status')).toHaveTextContent(/password updated/i);
  });
});
