import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DashboardPage from '../../pages/DashboardPage';
import type { AppConfig, Transaction } from '../../types/transaction';

const txns: Transaction[] = [
  { id: 'txn-food', date: '2026-10-11', category: 'food', amount: 320, note: 'Dinner', type: 'expense' },
  { id: 'txn-travel', date: '2026-10-09', category: 'travel', amount: 1300, note: 'Train', type: 'expense' },
  { id: 'txn-income', date: '2026-10-01', category: 'salary', amount: 45000, note: 'Salary', type: 'income' },
];

const config: AppConfig = {
  currency: '₹',
  monthlyBudget: 2500,
  budgets: { food: 1000 },
  budgetItems: [{
    id: 'budget-food',
    category: 'food',
    amount: 1000,
    period: 'monthly',
    start_date: '2026-10-01',
    end_date: null,
    spent: 320,
    remaining: 680,
  }],
};

function renderDashboard(overrides = {}) {
  const props = {
    accountBoard: null,
    accountEmail: 'user@example.com',
    txns,
    config,
    financialError: null,
    identityVerified: true,
    toast: null,
    onLogout: vi.fn(),
    onNotify: vi.fn(),
    onAddTransaction: vi.fn().mockResolvedValue(undefined),
    onUpdateTransaction: vi.fn().mockResolvedValue(undefined),
    onDeleteTransaction: vi.fn().mockResolvedValue(undefined),
    onRetryLoad: vi.fn().mockResolvedValue(true),
    onAddBudget: vi.fn().mockResolvedValue(undefined),
    onEditBudget: vi.fn().mockResolvedValue(undefined),
    onDeleteBudget: vi.fn().mockResolvedValue(undefined),
    onChangePassword: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  render(<DashboardPage {...props} />);
  return props;
}

describe('DashboardPage V2', () => {
  it('renders the approved navigation and no active Telegram UI', () => {
    renderDashboard();

    const primaryNav = screen.getByRole('navigation', { name: /^primary$/i });
    expect(within(primaryNav).getByRole('button', { name: /overview/i })).toBeInTheDocument();
    expect(within(primaryNav).getByRole('button', { name: /transactions/i })).toBeInTheDocument();
    expect(within(primaryNav).getByRole('button', { name: /budgets/i })).toBeInTheDocument();
    expect(within(primaryNav).getByRole('button', { name: /settings/i })).toBeInTheDocument();
    expect(screen.queryByText(/telegram|bot online|\/add|via bot/i)).not.toBeInTheDocument();
  });

  it('opens the add transaction dialog from the top Add action and saves real input', async () => {
    const user = userEvent.setup();
    const props = renderDashboard();

    await user.click(screen.getByRole('button', { name: /^\+ add n$/i }));
    await user.type(screen.getByLabelText(/amount/i), '250');
    await user.click(screen.getByRole('button', { name: /^travel$/i }));
    await user.type(screen.getByLabelText(/note/i), 'Cab');
    await user.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => expect(props.onAddTransaction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'expense',
      category: 'travel',
      amount: 250,
      note: 'Cab',
    })));
  });

  it('filters transactions with numeric search and edits a prefilled transaction', async () => {
    const user = userEvent.setup();
    const props = renderDashboard();

    await user.click(screen.getByRole('button', { name: /transactions/i }));
    await user.type(screen.getByPlaceholderText(/search transactions/i), 'above 500');
    await user.click(screen.getByRole('button', { name: /transaction category/i }));
    await user.click(screen.getByRole('option', { name: /^travel$/i }));

    expect(screen.getByText('Train')).toBeInTheDocument();
    expect(screen.queryByText('Dinner')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit/i }));
    const dialog = screen.getByRole('dialog', { name: /edit transaction/i });
    expect(within(dialog).getByDisplayValue('Train')).toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText(/note/i));
    await user.type(within(dialog).getByLabelText(/note/i), 'Train updated');
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(props.onUpdateTransaction).toHaveBeenCalledWith('txn-travel', expect.objectContaining({
      note: 'Train updated',
    })));
  });

  it('uses dark accessible dropdowns for all transaction filters', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /transactions/i }));

    await user.click(screen.getByRole('button', { name: /transaction type/i }));
    expect(screen.getByRole('listbox', { name: /transaction type/i })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /^expense$/i }));
    expect(screen.getByRole('button', { name: /transaction type/i })).toHaveTextContent(/expense/i);
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.queryByText('Salary')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /transaction category/i }));
    expect(screen.getByRole('listbox', { name: /transaction category/i })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /^food$/i }));
    expect(screen.getByRole('button', { name: /transaction category/i })).toHaveTextContent(/food/i);
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.queryByText('Train')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /date range/i }));
    expect(screen.getByRole('listbox', { name: /date range/i })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox', { name: /date range/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /date range/i }));
    await user.click(screen.getByRole('option', { name: /whole month/i }));
    expect(screen.getByRole('button', { name: /date range/i })).toHaveTextContent(/whole month/i);
  });

  it('shows settings password validation and logout', async () => {
    const user = userEvent.setup();
    const props = renderDashboard();

    await user.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByDisplayValue('user@example.com')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^new password/i), 'weakpass');
    expect(screen.getByText(/add at least one number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled();

    await user.clear(screen.getByLabelText(/^new password/i));
    await user.type(screen.getByLabelText(/^new password/i), 'strongpass1');
    await user.type(screen.getByLabelText(/^confirm new password/i), 'strongpass1');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(props.onChangePassword).toHaveBeenCalledWith('strongpass1'));
    await user.click(screen.getByRole('button', { name: /log out/i }));
    expect(props.onLogout).toHaveBeenCalled();
  });
});
