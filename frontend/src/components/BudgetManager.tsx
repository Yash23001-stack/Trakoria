import { FormEvent, useMemo, useState } from 'react';
import type { Budget, BudgetInput, BudgetPeriod, Transaction } from '../types/transaction';
import { todayISO } from '../utils/date';
import FilterDropdown, { type SelectOption } from './ui/FilterDropdown';

interface BudgetManagerProps {
  budgets: Budget[];
  currency: string;
  txns: Transaction[];
  onAddBudget: (budget: BudgetInput) => Promise<void>;
  onEditBudget: (budgetId: string, budget: BudgetInput) => Promise<void>;
  onDeleteBudget: (budgetId: string) => Promise<void>;
}

const CATEGORY_OPTIONS = ['food', 'drink', 'petrol', 'travel', 'shopping', 'bills', 'rent', 'entertainment', 'health', 'other'];
const CATEGORY_SELECT_OPTIONS: SelectOption<string>[] = CATEGORY_OPTIONS.map((option) => ({ value: option, label: option }));
const PERIOD_SELECT_OPTIONS: SelectOption<BudgetPeriod>[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

function formatMoney(currency: string, amount: number): string {
  return `${currency}${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function dateOnly(value: string | null | undefined): string {
  const normalized = value?.trim() || '';
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : normalized;
}

function budgetInput(category: string, amount: string, period: BudgetPeriod, startDate: string, endDate: string): BudgetInput | string {
  const parsedAmount = Number.parseFloat(amount);
  const normalizedStart = dateOnly(startDate);
  const normalizedEnd = dateOnly(endDate);

  if (!category) return 'Choose a category.';
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return 'Enter a budget amount greater than zero.';
  if (!normalizedStart) return 'Choose a start date.';
  if (period === 'custom' && !normalizedEnd) return 'Choose an end date for a custom budget.';
  if (normalizedEnd && normalizedEnd < normalizedStart) return 'End date must be after the start date.';

  return {
    category,
    amount: parsedAmount,
    period,
    start_date: normalizedStart,
    end_date: normalizedEnd || null,
  };
}

export default function BudgetManager({
  budgets,
  currency,
  txns,
  onAddBudget,
  onEditBudget,
  onDeleteBudget,
}: BudgetManagerProps) {
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const spentByCategory = useMemo(() => txns.reduce<Record<string, number>>((totals, txn) => {
    if (String(txn.type).toLowerCase() !== 'expense') return totals;
    const key = txn.category.toLowerCase();
    totals[key] = (totals[key] || 0) + Number(txn.amount || 0);
    return totals;
  }, {}), [txns]);

  const resetForm = () => {
    setEditingId(null);
    setCategory(CATEGORY_OPTIONS[0]);
    setAmount('');
    setPeriod('monthly');
    setStartDate(todayISO());
    setEndDate('');
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextBudget = budgetInput(category, amount, period, startDate, endDate);

    if (typeof nextBudget === 'string') {
      setError(nextBudget);
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingId) {
        await onEditBudget(editingId, nextBudget);
      } else {
        await onAddBudget(nextBudget);
      }
      resetForm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save budget.');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (budget: Budget) => {
    setEditingId(budget.id);
    setCategory(budget.category);
    setAmount(String(budget.amount));
    setPeriod(budget.period);
    setStartDate(dateOnly(budget.start_date));
    setEndDate(dateOnly(budget.end_date));
    setError('');
  };

  return (
    <section className="border border-zinc-800 bg-[#0a0a0a] p-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 border-b border-zinc-900 pb-3 mb-4">
        <div>
          <h2 className="text-sm md:text-base uppercase tracking-widest font-bold text-white">Budgets</h2>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">Plan spending by category</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2 lg:grid-cols-12">
        <label className="md:col-span-2 flex flex-col gap-1 text-[10px] uppercase tracking-widest text-zinc-500">
          Category
          <FilterDropdown label="Budget category" value={category} options={CATEGORY_SELECT_OPTIONS} onChange={setCategory} />
        </label>
        <label className="md:col-span-2 flex flex-col gap-1 text-[10px] uppercase tracking-widest text-zinc-500">
          Amount
          <input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="bg-black border border-zinc-800 text-white px-3 py-2 text-xs outline-none focus:border-white" placeholder="0" />
        </label>
        <label className="md:col-span-2 flex flex-col gap-1 text-[10px] uppercase tracking-widest text-zinc-500">
          Period
          <FilterDropdown label="Budget period" value={period} options={PERIOD_SELECT_OPTIONS} onChange={setPeriod} />
        </label>
        <label className="md:col-span-2 flex flex-col gap-1 text-[10px] uppercase tracking-widest text-zinc-500">
          Start date
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="bg-black border border-zinc-800 text-white px-3 py-2 text-xs outline-none focus:border-white" />
        </label>
        <label className="md:col-span-2 flex flex-col gap-1 text-[10px] uppercase tracking-widest text-zinc-500">
          End date
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="bg-black border border-zinc-800 text-white px-3 py-2 text-xs outline-none focus:border-white" />
        </label>
        <div className="md:col-span-2 flex flex-col justify-end gap-2">
          <button type="submit" disabled={saving} className="bg-white text-black px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-zinc-300 disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors">
            {saving ? 'Saving...' : editingId ? 'Update Budget' : 'Add Budget'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="border border-zinc-800 px-4 py-2 text-[10px] uppercase tracking-widest text-zinc-400 hover:text-white">
              Cancel
            </button>
          )}
        </div>
        {error && <div role="alert" className="md:col-span-12 text-[10px] uppercase tracking-widest text-red-500">{error}</div>}
      </form>

      {budgets.length === 0 ? (
        <div className="border border-dashed border-zinc-800 p-4 text-[10px] uppercase tracking-widest text-zinc-500">
          No budgets yet. Add a category budget to track spending.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {budgets.map((budget) => {
            const spent = budget.spent ?? spentByCategory[budget.category] ?? 0;
            const remaining = budget.remaining ?? budget.amount - spent;
            const used = budget.amount > 0 ? Math.min(100, Math.max(0, (spent / budget.amount) * 100)) : 0;

            return (
              <article key={budget.id} className="border border-zinc-800 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-white">{budget.category}</h3>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
                      {budget.period} · starts {dateOnly(budget.start_date)}
                      {budget.end_date ? ` · ends ${dateOnly(budget.end_date)}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white">{formatMoney(currency, budget.amount)}</div>
                    <div className={`text-[10px] uppercase tracking-widest mt-1 ${remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatMoney(currency, remaining)} left
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-zinc-900 mt-3 overflow-hidden" aria-label={`${budget.category} budget usage`}>
                  <div className="h-full bg-white" style={{ width: `${used}%` }} />
                </div>
                <div className="flex items-center justify-between gap-2 mt-3 text-[10px] uppercase tracking-widest text-zinc-500">
                  <span>Spent {formatMoney(currency, spent)}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEditing(budget)} className="text-zinc-300 hover:text-white">Edit</button>
                    <button type="button" onClick={() => void onDeleteBudget(budget.id)} className="text-red-400 hover:text-red-300">Delete</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
