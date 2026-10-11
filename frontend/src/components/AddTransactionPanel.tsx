import { FormEvent, useMemo, useState } from 'react';
import type { TransactionInput, TransactionType } from '../types/transaction';
import { todayISO } from '../utils/date';

interface AddTransactionPanelProps {
  budgets: Record<string, number>;
  onAddTransaction: (transaction: TransactionInput) => Promise<void>;
}

const FALLBACK_CATEGORIES = ['food', 'drink', 'petrol', 'travel', 'shopping', 'bills', 'rent', 'entertainment', 'health', 'other'];

export default function AddTransactionPanel({ budgets, onAddTransaction }: AddTransactionPanelProps) {
  const categories = useMemo(() => {
    const budgetCategories = Object.keys(budgets || {});
    return budgetCategories.length > 0 ? budgetCategories : FALLBACK_CATEGORIES;
  }, [budgets]);
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState(categories[0] || 'other');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number.parseFloat(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    if (!date) {
      setError('Enter a valid date');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onAddTransaction({
        type,
        category,
        amount: parsedAmount,
        date,
        note: note.trim(),
      });
      setAmount('');
      setNote('');
    } catch (submitError) {
      console.error('Add transaction failed:', submitError);
      setError('Could not add transaction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="add-transaction-panel" className="border border-zinc-800 bg-[#0a0a0a] p-4 scroll-mt-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 border-b border-zinc-900 pb-3 mb-4">
        <div>
          <h2 className="text-sm md:text-base uppercase tracking-widest font-bold text-white">+ Add Txn</h2>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">Manual income and expense capture</p>
        </div>
        <div className="inline-grid grid-cols-2 border border-zinc-700 w-full md:w-auto">
          {(['expense', 'income'] as TransactionType[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setType(option)}
              className={`px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors ${
                type === option ? 'bg-white text-black' : 'bg-black text-zinc-400 hover:text-white'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <label className="md:col-span-3 flex flex-col gap-1 text-[10px] uppercase tracking-widest text-zinc-500">
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="bg-black border border-zinc-800 text-white px-3 py-2 text-xs uppercase outline-none focus:border-white"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </label>
        <label className="md:col-span-2 flex flex-col gap-1 text-[10px] uppercase tracking-widest text-zinc-500">
          Amount
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="bg-black border border-zinc-800 text-white px-3 py-2 text-xs outline-none focus:border-white"
            placeholder="0"
          />
        </label>
        <label className="md:col-span-2 flex flex-col gap-1 text-[10px] uppercase tracking-widest text-zinc-500">
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="bg-black border border-zinc-800 text-white px-3 py-2 text-xs outline-none focus:border-white"
          />
        </label>
        <label className="md:col-span-3 flex flex-col gap-1 text-[10px] uppercase tracking-widest text-zinc-500">
          Note
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="bg-black border border-zinc-800 text-white px-3 py-2 text-xs outline-none focus:border-white"
            placeholder="optional"
          />
        </label>
        <div className="md:col-span-2 flex flex-col justify-end gap-1">
          <button
            type="submit"
            disabled={saving}
            className="bg-white text-black px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-zinc-300 disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors"
          >
            {saving ? 'Adding...' : '+ Add Txn'}
          </button>
          {error && <div className="text-[10px] uppercase tracking-widest text-red-500">{error}</div>}
        </div>
      </form>
    </section>
  );
}
