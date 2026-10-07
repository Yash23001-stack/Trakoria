import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AddTransactionPanel from '../../components/AddTransactionPanel';

const budgets = {
  food: 6000,
  salary: 1,
  travel: 1500,
};

describe('AddTransactionPanel', () => {
  it('submits a valid expense transaction', async () => {
    const user = userEvent.setup();
    const onAddTransaction = vi.fn().mockResolvedValue(undefined);
    render(<AddTransactionPanel budgets={budgets} onAddTransaction={onAddTransaction} />);

    await user.selectOptions(screen.getByLabelText(/category/i), 'food');
    await user.type(screen.getByLabelText(/amount/i), '450');
    await user.clear(screen.getByLabelText(/date/i));
    await user.type(screen.getByLabelText(/date/i), '2026-10-07');
    await user.type(screen.getByLabelText(/note/i), 'Lunch');
    await user.click(screen.getByRole('button', { name: /\+ add txn/i }));

    expect(onAddTransaction).toHaveBeenCalledWith({
      type: 'expense',
      category: 'food',
      amount: 450,
      date: '2026-10-07',
      note: 'Lunch',
    });
  });

  it('submits a valid income transaction', async () => {
    const user = userEvent.setup();
    const onAddTransaction = vi.fn().mockResolvedValue(undefined);
    render(<AddTransactionPanel budgets={budgets} onAddTransaction={onAddTransaction} />);

    await user.click(screen.getByRole('button', { name: /^income$/i }));
    await user.selectOptions(screen.getByLabelText(/category/i), 'salary');
    await user.type(screen.getByLabelText(/amount/i), '75000');
    await user.clear(screen.getByLabelText(/date/i));
    await user.type(screen.getByLabelText(/date/i), '2026-10-07');
    await user.click(screen.getByRole('button', { name: /\+ add txn/i }));

    expect(onAddTransaction).toHaveBeenCalledWith({
      type: 'income',
      category: 'salary',
      amount: 75000,
      date: '2026-10-07',
      note: '',
    });
  });

  it('blocks a missing amount', async () => {
    const user = userEvent.setup();
    const onAddTransaction = vi.fn();
    render(<AddTransactionPanel budgets={budgets} onAddTransaction={onAddTransaction} />);

    await user.click(screen.getByRole('button', { name: /\+ add txn/i }));

    expect(await screen.findByText(/enter a valid amount/i)).toBeInTheDocument();
    expect(onAddTransaction).not.toHaveBeenCalled();
  });

  it('blocks an invalid amount', async () => {
    const user = userEvent.setup();
    const onAddTransaction = vi.fn();
    render(<AddTransactionPanel budgets={budgets} onAddTransaction={onAddTransaction} />);

    await user.type(screen.getByLabelText(/amount/i), '-1');
    await user.click(screen.getByRole('button', { name: /\+ add txn/i }));

    expect(await screen.findByText(/enter a valid amount/i)).toBeInTheDocument();
    expect(onAddTransaction).not.toHaveBeenCalled();
  });

  it('blocks an invalid date', async () => {
    const user = userEvent.setup();
    const onAddTransaction = vi.fn();
    render(<AddTransactionPanel budgets={budgets} onAddTransaction={onAddTransaction} />);

    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.clear(screen.getByLabelText(/date/i));
    await user.click(screen.getByRole('button', { name: /\+ add txn/i }));

    expect(await screen.findByText(/enter a valid date/i)).toBeInTheDocument();
    expect(onAddTransaction).not.toHaveBeenCalled();
  });

  it('does not expose an invalid transaction type option', () => {
    const onAddTransaction = vi.fn();
    render(<AddTransactionPanel budgets={budgets} onAddTransaction={onAddTransaction} />);

    expect(screen.getByRole('button', { name: /^expense$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^income$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /transfer/i })).not.toBeInTheDocument();
  });

  it('does not expose invalid category options', () => {
    const onAddTransaction = vi.fn();
    render(<AddTransactionPanel budgets={budgets} onAddTransaction={onAddTransaction} />);

    expect(screen.getByRole('option', { name: 'food' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'not-a-category' })).not.toBeInTheDocument();
  });

  it('allows an optional note', async () => {
    const user = userEvent.setup();
    const onAddTransaction = vi.fn().mockResolvedValue(undefined);
    render(<AddTransactionPanel budgets={budgets} onAddTransaction={onAddTransaction} />);

    await user.type(screen.getByLabelText(/amount/i), '99');
    await user.clear(screen.getByLabelText(/date/i));
    await user.type(screen.getByLabelText(/date/i), '2026-10-07');
    await user.click(screen.getByRole('button', { name: /\+ add txn/i }));

    expect(onAddTransaction).toHaveBeenCalledWith(expect.objectContaining({ note: '' }));
  });
});
