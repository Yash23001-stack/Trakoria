import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AccountBoard from '../../components/auth/AccountBoard';

describe('AccountBoard', () => {
  it('displays the signed-in email and verified status', () => {
    render(
      <AccountBoard
        email="user-a@example.com"
        identity={{ user_id: 'user-a', email: 'user-a@example.com' }}
        identityError={null}
        identityLoading={false}
        onLogout={vi.fn()}
      />,
    );

    expect(screen.getByText('user-a@example.com')).toBeInTheDocument();
    expect(screen.getByText(/backend identity: verified/i)).toBeInTheDocument();
  });

  it('shows verification errors without pretending the user is verified', () => {
    render(
      <AccountBoard
        email="user-b@example.com"
        identity={null}
        identityError="Token is invalid."
        identityLoading={false}
        onLogout={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Token is invalid.');
    expect(screen.getByText(/backend identity: unverified/i)).toBeInTheDocument();
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
      />,
    );

    await user.click(screen.getByRole('button', { name: /logout/i }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
