import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BudgetManager from '../../components/BudgetManager';

const budgets = [{
  id: 'budget-a',
  category: 'food',
  amount: 1000,
  period: 'monthly' as const,
  start_date: '2026-10-01',
  end_date: null,
  spent: 250,
  remaining: 750,
}];

describe('BudgetManager', () => {
  it('shows an empty state when the user has no budgets', () => {
    render(
      <BudgetManager
        budgets={[]}
        currency="₹"
        txns={[]}
        onAddBudget={vi.fn()}
        onEditBudget={vi.fn()}
        onDeleteBudget={vi.fn()}
      />,
    );

    expect(screen.getByText(/no budgets yet/i)).toBeInTheDocument();
  });

  it('creates, edits, deletes, and validates user budgets', async () => {
    const user = userEvent.setup();
    const onAddBudget = vi.fn().mockResolvedValue(undefined);
    const onEditBudget = vi.fn().mockResolvedValue(undefined);
    const onDeleteBudget = vi.fn().mockResolvedValue(undefined);

    render(
      <BudgetManager
        budgets={budgets}
        currency="₹"
        txns={[{
          id: 'txn-a',
          date: '2026-10-03',
          category: 'food',
          amount: 250,
          note: 'Lunch',
          type: 'expense',
        }]}
        onAddBudget={onAddBudget}
        onEditBudget={onEditBudget}
        onDeleteBudget={onDeleteBudget}
      />,
    );

    expect(screen.getByText(/₹750 left/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add budget/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/greater than zero/i);
    expect(onAddBudget).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/amount/i), '1500');
    await user.click(screen.getByRole('button', { name: /add budget/i }));

    await waitFor(() => expect(onAddBudget).toHaveBeenCalledWith(expect.objectContaining({
      category: 'food',
      amount: 1500,
      period: 'monthly',
      start_date: expect.any(String),
    })));

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), '2000');
    await user.click(screen.getByRole('button', { name: /update budget/i }));

    await waitFor(() => expect(onEditBudget).toHaveBeenCalledWith('budget-a', expect.objectContaining({
      amount: 2000,
    })));

    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(onDeleteBudget).toHaveBeenCalledWith('budget-a');
  });

  it('uses dark dropdowns for category and every period option', async () => {
    const user = userEvent.setup();
    const onAddBudget = vi.fn().mockResolvedValue(undefined);

    render(
      <BudgetManager
        budgets={[]}
        currency="₹"
        txns={[]}
        onAddBudget={onAddBudget}
        onEditBudget={vi.fn()}
        onDeleteBudget={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /budget category/i }));
    expect(screen.getByRole('listbox', { name: /budget category/i })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /^travel$/i }));
    expect(screen.getByRole('button', { name: /budget category/i })).toHaveTextContent(/travel/i);

    for (const option of ['Weekly', 'Monthly', 'Yearly', 'Custom']) {
      await user.click(screen.getByRole('button', { name: /budget period/i }));
      expect(screen.getByRole('listbox', { name: /budget period/i })).toBeInTheDocument();
      await user.click(screen.getByRole('option', { name: new RegExp(`^${option}$`, 'i') }));
      expect(screen.getByRole('button', { name: /budget period/i })).toHaveTextContent(option);
    }

    await user.type(screen.getByLabelText(/amount/i), '1200');
    await user.clear(screen.getByLabelText(/start date/i));
    await user.type(screen.getByLabelText(/start date/i), '2026-10-15');
    await user.type(screen.getByLabelText(/end date/i), '2026-11-15');
    await user.click(screen.getByRole('button', { name: /add budget/i }));

    await waitFor(() => expect(onAddBudget).toHaveBeenCalledWith(expect.objectContaining({
      category: 'travel',
      period: 'custom',
      start_date: '2026-10-15',
      end_date: '2026-11-15',
    })));
  });

  it('validates custom period dates and preserves edited date-only values', async () => {
    const user = userEvent.setup();
    const onAddBudget = vi.fn().mockResolvedValue(undefined);
    const onEditBudget = vi.fn().mockResolvedValue(undefined);

    render(
      <BudgetManager
        budgets={[{
          ...budgets[0],
          start_date: '2026-10-01T00:00:00.000Z',
          end_date: '2026-10-31T00:00:00.000Z',
        }]}
        currency="₹"
        txns={[]}
        onAddBudget={onAddBudget}
        onEditBudget={onEditBudget}
        onDeleteBudget={vi.fn()}
      />,
    );

    expect(screen.getByText(/starts 2026-10-01/i)).toBeInTheDocument();
    expect(screen.getByText(/ends 2026-10-31/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /budget period/i }));
    await user.click(screen.getByRole('option', { name: /^custom$/i }));
    await user.type(screen.getByLabelText(/amount/i), '999');
    await user.clear(screen.getByLabelText(/start date/i));
    await user.type(screen.getByLabelText(/start date/i), '2026-11-10');
    await user.type(screen.getByLabelText(/end date/i), '2026-11-01');
    await user.click(screen.getByRole('button', { name: /add budget/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/end date must be after/i);
    expect(onAddBudget).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(screen.getByLabelText(/start date/i)).toHaveValue('2026-10-01');
    expect(screen.getByLabelText(/end date/i)).toHaveValue('2026-10-31');
    await user.clear(screen.getByLabelText(/start date/i));
    await user.type(screen.getByLabelText(/start date/i), '2026-10-05');
    await user.click(screen.getByRole('button', { name: /update budget/i }));

    await waitFor(() => expect(onEditBudget).toHaveBeenCalledWith('budget-a', expect.objectContaining({
      start_date: '2026-10-05',
      end_date: '2026-10-31',
    })));
  });
});
