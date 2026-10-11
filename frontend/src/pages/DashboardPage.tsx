import { FormEvent, useMemo, useState, type ReactNode } from 'react';
import BudgetManager from '../components/BudgetManager';
import { downloadBlob } from '../components/activity/download';
import FilterDropdown, { type SelectOption } from '../components/ui/FilterDropdown';
import type {
  AppConfig,
  Budget,
  BudgetInput,
  Transaction,
  TransactionInput,
  TransactionType,
  TransactionUpdateInput,
} from '../types/transaction';
import { formatINR, toAmount } from '../utils/currency';
import { currentMonthKey, monthDateFromKey, todayISO } from '../utils/date';
import { passwordFeedback, passwordMismatch } from '../utils/password';

type Screen = 'overview' | 'transactions' | 'budgets' | 'insights' | 'data' | 'settings';
type DateFilter = 'month' | 'week' | 'today' | 'custom';
type Grouping = 'indian' | 'international';

interface DashboardPageProps {
  accountBoard: ReactNode;
  accountEmail?: string;
  txns: Transaction[];
  config: AppConfig;
  financialError: string | null;
  identityVerified: boolean;
  toast: string | null;
  onLogout: () => void;
  onNotify: (message: string) => void;
  onAddTransaction: (transaction: TransactionInput) => Promise<void>;
  onUpdateTransaction: (transactionId: string, transaction: TransactionUpdateInput) => Promise<void>;
  onDeleteTransaction: (transactionId: string) => Promise<void>;
  onRetryLoad: () => void | Promise<unknown>;
  onAddBudget: (budget: BudgetInput) => Promise<void>;
  onEditBudget: (budgetId: string, budget: BudgetInput) => Promise<void>;
  onDeleteBudget: (budgetId: string) => Promise<void>;
  onChangePassword: (password: string) => Promise<void>;
}

const CATEGORIES = ['food', 'drink', 'petrol', 'travel', 'shopping', 'bills', 'rent', 'entertainment', 'health', 'other', 'salary'];
const BUDGET_CATEGORIES = CATEGORIES.filter((category) => category !== 'salary');
const NAV: { id: Screen; label: string; key: string }[] = [
  { id: 'overview', label: 'Overview', key: 'G O' },
  { id: 'transactions', label: 'Transactions', key: 'G T' },
  { id: 'budgets', label: 'Budgets', key: 'G B' },
  { id: 'insights', label: 'Insights', key: 'G I' },
  { id: 'data', label: 'Data', key: 'G D' },
  { id: 'settings', label: 'Settings', key: 'G S' },
];

function monthLabel(monthKey: string) {
  const { year, month } = monthDateFromKey(monthKey);
  return `${new Date(year, month, 1).toLocaleString('en-IN', { month: 'short' }).toUpperCase()} ${year}`;
}

function isSameMonth(date: string, monthKey: string) {
  const txnDate = new Date(`${date}T00:00:00`);
  const { year, month } = monthDateFromKey(monthKey);
  return txnDate.getFullYear() === year && txnDate.getMonth() === month;
}

function displayAmount(transaction: Transaction, currency: string, grouping: Grouping = 'indian', decimals = true) {
  const locale = grouping === 'indian' ? 'en-IN' : 'en-US';
  const value = toAmount(transaction.amount).toLocaleString(locale, {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
  return `${transaction.type.toLowerCase() === 'income' ? '+' : '-'}${currency}${value}`;
}

function money(currency: string, amount: number, grouping: Grouping = 'indian', decimals = false) {
  return `${currency}${amount.toLocaleString(grouping === 'indian' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })}`;
}

function monthProgress(monthKey: string) {
  const today = new Date();
  const { year, month } = monthDateFromKey(monthKey);
  const days = new Date(year, month + 1, 0).getDate();
  if (today.getFullYear() !== year || today.getMonth() !== month) return 1;
  return Math.max(1 / days, today.getDate() / days);
}

function budgetRisk(budget: Budget) {
  if (budget.amount <= 0) return 0;
  return (budget.spent || 0) / budget.amount;
}

function byDateDesc(a: Transaction, b: Transaction) {
  return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
}

function groupedByDay(transactions: Transaction[]) {
  return transactions.reduce<Record<string, Transaction[]>>((groups, txn) => {
    groups[txn.date] = groups[txn.date] || [];
    groups[txn.date].push(txn);
    return groups;
  }, {});
}

function initials(email?: string) {
  return (email || 'TR').slice(0, 2).toUpperCase();
}

function parseSearch(query: string, txn: Transaction) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const above = normalized.match(/^above\s+(\d+(?:\.\d+)?)$/);
  if (above) return toAmount(txn.amount) > Number.parseFloat(above[1]);

  const below = normalized.match(/^below\s+(\d+(?:\.\d+)?)$/);
  if (below) return toAmount(txn.amount) < Number.parseFloat(below[1]);

  const haystack = `${txn.category} ${txn.note || ''} ${txn.date} ${txn.type}`.toLowerCase();
  return normalized.split(/\s+/).every((part) => haystack.includes(part));
}

function AppToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 rounded-md border border-[#4ADE80] bg-[#0E1611] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#C8FACC] shadow-2xl">
      {message}
    </div>
  );
}

function Sidebar({
  active,
  email,
  onNavigate,
}: {
  active: Screen;
  email?: string;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col gap-8 border-r border-[#252930] bg-[#0B0D10] px-5 py-6">
      <div>
        <div className="text-[22px] font-black uppercase tracking-[0.22em] text-[#ECEAE4]">Trakoria</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#858B95]">Track Money. Own Your Data.</div>
      </div>
      <nav className="flex flex-col gap-1" aria-label="Primary">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`flex h-11 items-center gap-3 rounded-md px-3 text-left text-[13px] uppercase tracking-[0.08em] transition-colors ${
              active === item.id ? 'bg-[#1A1D22] text-[#ECEAE4]' : 'text-[#A3A8B0] hover:bg-[#111317] hover:text-white'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-current opacity-70" />
            <span className="flex-1">{item.label}</span>
            <span className="text-[10px] text-[#858B95]">{item.key}</span>
          </button>
        ))}
      </nav>
      <div className="mt-auto rounded-md border border-[#252930] p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#252930] text-xs font-bold text-white">{initials(email)}</span>
          <span className="min-w-0 truncate text-[11px] text-[#A3A8B0]">{email || 'Unknown account'}</span>
        </div>
      </div>
    </aside>
  );
}

function TopBar({
  screen,
  selectedMonth,
  onMonthChange,
  onAdd,
}: {
  screen: Screen;
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  onAdd: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold capitalize tracking-[0.04em] text-[#ECEAE4]">{screen}</h1>
        <p className="mt-1 text-xs text-[#A3A8B0]">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={selectedMonth}
          onChange={(event) => onMonthChange(event.target.value)}
          aria-label="Change month"
          className="h-11 rounded-md border border-[#353A42] bg-[#111317] px-3 text-xs font-bold uppercase tracking-[0.12em] text-[#ECEAE4]"
        >
          {[2026, 2027].flatMap((year) => Array.from({ length: 12 }, (_, month) => (
            <option key={`${year}-${month}`} value={`${year}-${month}`}>{monthLabel(`${year}-${month}`)}</option>
          )))}
        </select>
        <button
          type="button"
          onClick={onAdd}
          className="hidden h-11 items-center rounded-md bg-[#4ADE80] px-4 text-xs font-black uppercase tracking-[0.12em] text-[#06130A] md:flex"
        >
          + Add <span className="ml-2 rounded border border-[#06130A]/50 px-1 text-[10px]">N</span>
        </button>
      </div>
    </header>
  );
}

function MobileNav({ active, onNavigate, onAdd }: { active: Screen; onNavigate: (screen: Screen) => void; onAdd: () => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#252930] bg-[#0B0D10] px-3 py-2 lg:hidden" aria-label="Mobile primary">
      {[
        ['overview', 'Home'],
        ['transactions', 'Txns'],
        ['add', '+'],
        ['budgets', 'Budgets'],
        ['settings', 'More'],
      ].map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => (id === 'add' ? onAdd() : onNavigate(id as Screen))}
          className={`mx-auto flex h-12 min-w-12 items-center justify-center rounded-full px-3 text-[11px] font-bold uppercase tracking-[0.08em] ${
            id === 'add'
              ? 'bg-[#4ADE80] text-[#06130A]'
              : active === id
                ? 'text-[#ECEAE4]'
                : 'text-[#858B95]'
          }`}
          aria-label={id === 'add' ? 'Add transaction' : `Open ${label}`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

function AddTransactionDialog({
  open,
  budgets,
  onClose,
  onSave,
}: {
  open: boolean;
  budgets: Budget[];
  onClose: () => void;
  onSave: (transaction: TransactionInput) => Promise<void>;
}) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [keepOpen, setKeepOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const matchingBudget = budgets.find((budget) => budget.category === category);

  if (!open) return null;

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (!date) {
      setError('Choose a date.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ type, amount: parsedAmount, category, date, note: note.trim() });
      setAmount('');
      setNote('');
      if (!keepOpen) onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not add transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="add-transaction-title">
      <form onSubmit={save} className="w-full max-w-xl rounded-lg border border-[#353A42] bg-[#111317] p-5 shadow-2xl" noValidate>
        <div className="mb-5 flex items-center justify-between">
          <div className="grid grid-cols-2 rounded-md border border-[#353A42] p-1">
            {(['expense', 'income'] as TransactionType[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setType(option);
                  setCategory(option === 'income' ? 'salary' : 'food');
                }}
                className={`rounded px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] ${type === option ? 'bg-[#ECEAE4] text-[#111317]' : 'text-[#A3A8B0]'}`}
              >
                {option}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClose} className="text-xs uppercase tracking-[0.12em] text-[#A3A8B0]">Cancel Esc</button>
        </div>
        <h2 id="add-transaction-title" className="sr-only">Add transaction</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.14em] text-[#A3A8B0]">
            Amount
            <span className="flex items-center rounded-md border border-[#353A42] bg-black px-3">
              <span className="text-[#858B95]">₹</span>
              <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0" step="0.01" className="h-12 min-w-0 flex-1 bg-transparent px-2 text-lg text-white outline-none" autoFocus />
            </span>
          </label>
          <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.14em] text-[#A3A8B0]">
            Date
            <input value={date} onChange={(event) => setDate(event.target.value)} type="date" className="h-12 rounded-md border border-[#353A42] bg-black px-3 text-white outline-none" />
          </label>
        </div>
        <div className="mt-4">
          <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[#A3A8B0]">Category · press 1-9</div>
          <div className="flex flex-wrap gap-2">
            {(type === 'income' ? ['salary', 'other'] : BUDGET_CATEGORIES).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCategory(option)}
                className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.1em] ${category === option ? 'border-[#4ADE80] bg-[#0E1611] text-[#C8FACC]' : 'border-[#353A42] text-[#A3A8B0]'}`}
              >
                {option}
              </button>
            ))}
          </div>
          {matchingBudget && type === 'expense' && (
            <p className="mt-2 text-xs text-[#A3A8B0]">
              {money('₹', Math.max(0, matchingBudget.remaining))} left in {matchingBudget.category}.
            </p>
          )}
        </div>
        <label className="mt-4 flex flex-col gap-2 text-[10px] uppercase tracking-[0.14em] text-[#A3A8B0]">
          Note · optional
          <input value={note} onChange={(event) => setNote(event.target.value)} className="h-12 rounded-md border border-[#353A42] bg-black px-3 text-white outline-none" placeholder="Dinner, salary, train..." />
        </label>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-[#A3A8B0]">
            <input type="checkbox" checked={keepOpen} onChange={(event) => setKeepOpen(event.target.checked)} />
            Keep open to add another
          </label>
          <button disabled={saving} className="rounded-md bg-[#4ADE80] px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#06130A] disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Entry ↵'}
          </button>
        </div>
        {error && <div role="alert" className="mt-4 text-xs uppercase tracking-[0.12em] text-[#FF7A6B]">{error}</div>}
      </form>
    </div>
  );
}

function OverviewScreen({
  txns,
  budgets,
  config,
  selectedMonth,
  onNavigate,
}: {
  txns: Transaction[];
  budgets: Budget[];
  config: AppConfig;
  selectedMonth: string;
  onNavigate: (screen: Screen) => void;
}) {
  const currency = config.currency || '₹';
  const expenses = txns.filter((txn) => txn.type.toLowerCase() === 'expense');
  const income = txns.filter((txn) => txn.type.toLowerCase() === 'income');
  const spent = expenses.reduce((sum, txn) => sum + toAmount(txn.amount), 0);
  const earned = income.reduce((sum, txn) => sum + toAmount(txn.amount), 0);
  const totalBudget = budgets.reduce((sum, budget) => sum + toAmount(budget.amount), 0);
  const remaining = totalBudget - spent;
  const progress = monthProgress(selectedMonth);
  const projected = progress > 0 ? spent / progress : spent;
  const atRisk = budgets.filter((budget) => budgetRisk(budget) >= progress + 0.1).sort((a, b) => budgetRisk(b) - budgetRisk(a));
  const recent = [...txns].sort(byDateDesc).slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.05fr_1.35fr]">
        <section className="rounded-lg border border-[#252930] bg-[#111317] p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[11px] uppercase tracking-[0.16em] text-[#A3A8B0]">Left to spend</h2>
            {totalBudget > 0 && <span className="rounded-full border border-[#5A4718] bg-[#1C180E] px-3 py-1 text-[11px] font-bold uppercase text-[#F2B544]">{projected > totalBudget ? 'Over pace' : 'On pace'}</span>}
          </div>
          <div className="mt-5 text-5xl font-black text-[#ECEAE4]">{totalBudget > 0 ? money(currency, remaining) : 'No budget'}</div>
          <p className="mt-2 text-sm text-[#A3A8B0]">
            {totalBudget > 0 ? `of ${money(currency, totalBudget)} budgeted across ${budgets.length} categories` : 'Create a budget to start tracking monthly pace.'}
          </p>
          {totalBudget > 0 && (
            <div className="mt-6">
              <div className="relative h-2 rounded-full bg-[#1F232A]">
                <div className="absolute inset-y-0 left-0 rounded-full bg-[#ECEAE4]" style={{ width: `${Math.min(100, (spent / totalBudget) * 100)}%` }} />
                <div className="absolute -top-1 -bottom-1 w-0.5 bg-[#F2B544]" style={{ left: `${Math.min(100, progress * 100)}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.08em] text-[#A3A8B0]">
                <span>Spent {Math.round((spent / totalBudget) * 100)}%</span>
                <span className="text-[#F2B544]">Month {Math.round(progress * 100)}%</span>
              </div>
            </div>
          )}
        </section>
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard label="Spent" value={money(currency, spent)} note={`${expenses.length} expenses this month`} />
          <MetricCard label="Income" value={money(currency, earned)} note={`${income.length} income entries`} tone="income" />
          <MetricCard label="Net cash flow" value={`${earned - spent >= 0 ? '+' : ''}${money(currency, earned - spent)}`} note="income - expenses" tone="good" />
          <MetricCard label="Projected spend" value={totalBudget > 0 ? money(currency, projected) : 'Needs budget'} note={totalBudget > 0 ? `${money(currency, projected - totalBudget)} vs budget` : 'Projection appears after a budget exists'} tone={projected > totalBudget ? 'bad' : 'muted'} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-[#252930] bg-[#111317] p-6">
          <div className="flex items-center justify-between border-b border-[#252930] pb-4">
            <h2 className="text-[11px] uppercase tracking-[0.16em] text-[#A3A8B0]">Budgets · needs attention first</h2>
            <button onClick={() => onNavigate('budgets')} className="text-[11px] uppercase tracking-[0.12em] text-[#4ADE80]">Manage →</button>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            {(atRisk.length > 0 ? atRisk : budgets.slice(0, 4)).map((budget) => <BudgetRiskRow key={budget.id} budget={budget} />)}
            {budgets.length === 0 && <p className="text-sm text-[#A3A8B0]">No budgets yet. Add one to see pace and risk signals.</p>}
          </div>
        </section>
        <section className="rounded-lg border border-[#252930] bg-[#111317] p-6">
          <h2 className="border-b border-[#252930] pb-4 text-[11px] uppercase tracking-[0.16em] text-[#A3A8B0]">Recent</h2>
          <div className="mt-2 divide-y divide-[#1C1F25]">
            {recent.map((txn) => (
              <div key={txn.id} className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 py-3 text-sm">
                <span className="text-[11px] uppercase tracking-[0.08em] text-[#A3A8B0]">{txn.category}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[#ECEAE4]">{txn.note || txn.category}</span>
                  <span className="text-[11px] text-[#858B95]">{txn.date} · manual</span>
                </span>
                <span className={txn.type.toLowerCase() === 'income' ? 'font-bold text-[#7DD3FC]' : 'font-bold text-[#ECEAE4]'}>
                  {displayAmount(txn, currency)}
                </span>
              </div>
            ))}
            {recent.length === 0 && <p className="py-6 text-sm text-[#A3A8B0]">No recent transactions. Use Add to log your first entry.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, note, tone = 'muted' }: { label: string; value: string; note: string; tone?: 'muted' | 'income' | 'good' | 'bad' }) {
  const color = tone === 'income' ? 'text-[#7DD3FC]' : tone === 'good' ? 'text-[#4ADE80]' : tone === 'bad' ? 'text-[#FF7A6B]' : 'text-[#ECEAE4]';
  return (
    <section className="rounded-lg border border-[#252930] bg-[#111317] p-5">
      <h2 className="text-[11px] uppercase tracking-[0.16em] text-[#A3A8B0]">{label}</h2>
      <div className={`mt-4 text-2xl font-black ${color}`}>{value}</div>
      <p className="mt-1 text-xs text-[#A3A8B0]">{note}</p>
    </section>
  );
}

function BudgetRiskRow({ budget }: { budget: Budget }) {
  const used = budget.amount > 0 ? Math.min(100, (budget.spent / budget.amount) * 100) : 0;
  const color = used >= 90 ? '#FF7A6B' : used >= 70 ? '#F2B544' : '#A3A8B0';
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between gap-3 text-sm">
        <span className="uppercase tracking-[0.08em] text-[#ECEAE4]">{budget.category}</span>
        <span><strong>{money('₹', budget.spent)}</strong><span className="text-[#858B95]"> / {money('₹', budget.amount)}</span></span>
      </div>
      <div className="h-2 rounded-full bg-[#1F232A]"><div className="h-2 rounded-full" style={{ width: `${used}%`, background: color }} /></div>
      <span className="text-xs" style={{ color }}>{money('₹', budget.remaining)} left · {Math.round(used)}% used</span>
    </div>
  );
}

function TransactionsScreen({
  txns,
  config,
  selectedMonth,
  onUpdate,
  onDelete,
  onRetry,
  loadError,
}: {
  txns: Transaction[];
  config: AppConfig;
  selectedMonth: string;
  onUpdate: (id: string, transaction: TransactionUpdateInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRetry: () => void;
  loadError: string | null;
}) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | TransactionType>('all');
  const [category, setCategory] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [selectedDay, setSelectedDay] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const currency = config.currency || '₹';

  const categories = useMemo(() => Array.from(new Set(txns.map((txn) => txn.category))).sort(), [txns]);
  const typeOptions: SelectOption<'all' | TransactionType>[] = [
    { value: 'all', label: 'All types' },
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
  ];
  const categoryOptions = useMemo<SelectOption<string>[]>(() => [
    { value: 'all', label: 'All categories' },
    ...categories.map((cat) => ({ value: cat, label: cat })),
  ], [categories]);
  const dateOptions: SelectOption<DateFilter>[] = [
    { value: 'month', label: 'Whole month' },
    { value: 'week', label: 'Last 7 days' },
    { value: 'today', label: 'Today' },
    { value: 'custom', label: 'Custom range...' },
  ];
  const filtered = useMemo(() => {
    const now = new Date();
    return txns
      .filter((txn) => isSameMonth(txn.date, selectedMonth))
      .filter((txn) => type === 'all' || txn.type === type)
      .filter((txn) => category === 'all' || txn.category === category)
      .filter((txn) => !selectedDay || txn.date === selectedDay)
      .filter((txn) => {
        if (dateFilter === 'today') return txn.date === todayISO();
        if (dateFilter === 'week') {
          const txnTime = new Date(`${txn.date}T00:00:00`).getTime();
          return now.getTime() - txnTime <= 7 * 24 * 60 * 60 * 1000;
        }
        return true;
      })
      .filter((txn) => parseSearch(search, txn))
      .sort(byDateDesc);
  }, [category, dateFilter, search, selectedDay, selectedMonth, txns, type]);

  const activeChips = [
    search && `Search: ${search}`,
    type !== 'all' && type,
    category !== 'all' && category,
    selectedDay && selectedDay,
    dateFilter !== 'month' && dateFilter,
  ].filter((chip): chip is string => Boolean(chip));
  const groups = groupedByDay(filtered);

  const clearFilters = () => {
    setSearch('');
    setType('all');
    setCategory('all');
    setDateFilter('month');
    setSelectedDay('');
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError('');
    try {
      await onDelete(deleting.id);
      setDeleting(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete transaction.');
    }
  };

  if (loadError) {
    return (
      <StatePanel title="Couldn't load your transactions" subtitle="Nothing was changed. Check your connection and try again." action="Try again" onAction={onRetry} />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-lg border border-[#252930] bg-[#111317]">
        <div className="border-b border-[#252930] p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_170px_150px]">
            <label className="flex items-center gap-2 rounded-md border border-[#353A42] bg-black px-3">
              <span className="font-bold text-[#4ADE80]">&gt;</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions, above 500" className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#858B95]" />
            </label>
            <FilterDropdown label="Transaction type" value={type} options={typeOptions} onChange={setType} />
            <FilterDropdown label="Transaction category" value={category} options={categoryOptions} onChange={setCategory} />
            <FilterDropdown label="Date range" value={dateFilter} options={dateOptions} onChange={setDateFilter} />
          </div>
          {activeChips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.1em]">
              <span className="text-[#858B95]">Active:</span>
              {activeChips.map((chip) => <span key={chip} className="rounded-full border border-[#353A42] px-3 py-1 text-[#ECEAE4]">{chip}</span>)}
              <button onClick={clearFilters} className="text-[#4ADE80]">Clear all</button>
            </div>
          )}
        </div>

        <div className="p-4">
          {txns.length === 0 ? (
            <StatePanel title="No transactions in this month yet" subtitle="Use Add to log income or expenses. Have older records? Bring them in from Data." />
          ) : filtered.length === 0 ? (
            <StatePanel title="No transactions match these filters" subtitle="Try another word, another day, or widen the date range." action="Clear filters" onAction={clearFilters} />
          ) : (
            <div className="flex flex-col gap-5">
              {Object.entries(groups).map(([date, rows]) => {
                const dayExpense = rows.filter((txn) => txn.type.toLowerCase() === 'expense').reduce((sum, txn) => sum + toAmount(txn.amount), 0);
                const dayIncome = rows.filter((txn) => txn.type.toLowerCase() === 'income').reduce((sum, txn) => sum + toAmount(txn.amount), 0);
                return (
                  <div key={date}>
                    <div className="mb-2 flex items-center justify-between border-b border-[#252930] pb-2 text-[11px] uppercase tracking-[0.12em] text-[#A3A8B0]">
                      <span>{date}</span>
                      <span>Spent {money(currency, dayExpense)} · Income {money(currency, dayIncome)}</span>
                    </div>
                    <div className="divide-y divide-[#1C1F25]">
                      {rows.map((txn) => (
                        <div key={txn.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] uppercase tracking-[0.12em] text-[#A3A8B0]">{txn.category}</span>
                              <span className="text-sm text-[#ECEAE4]">{txn.note || txn.category}</span>
                            </div>
                            <div className="mt-1 text-xs text-[#858B95]">{txn.date} · manual · <span className="sr-only">{txn.type}</span>{txn.type}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={txn.type.toLowerCase() === 'income' ? 'font-bold text-[#7DD3FC]' : 'font-bold text-[#ECEAE4]'}>{displayAmount(txn, currency)}</span>
                            <button onClick={() => setEditing(txn)} className="text-[11px] uppercase tracking-[0.1em] text-[#A3A8B0]">Edit</button>
                            <button onClick={() => setDeleting(txn)} className="text-[11px] uppercase tracking-[0.1em] text-[#FF7A6B]">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <TransactionCalendar txns={txns.filter((txn) => isSameMonth(txn.date, selectedMonth))} selectedMonth={selectedMonth} selectedDay={selectedDay} onSelect={setSelectedDay} currency={currency} />
      {editing && <EditTransactionDialog transaction={editing} onClose={() => setEditing(null)} onSave={async (next) => { await onUpdate(editing.id, next); setEditing(null); }} />}
      {deleting && (
        <ConfirmDialog
          title="Delete this transaction?"
          body={`${deleting.note || deleting.category} · ${displayAmount(deleting, currency)}`}
          error={deleteError}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function TransactionCalendar({ txns, selectedMonth, selectedDay, onSelect, currency }: { txns: Transaction[]; selectedMonth: string; selectedDay: string; onSelect: (date: string) => void; currency: string }) {
  const today = new Date();
  const { year, month } = monthDateFromKey(selectedMonth);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = Array.from({ length: new Date(year, month, 1).getDay() }, (_, i) => i);
  const totals = txns.reduce<Record<string, number>>((acc, txn) => {
    if (txn.type.toLowerCase() === 'expense') acc[txn.date] = (acc[txn.date] || 0) + toAmount(txn.amount);
    return acc;
  }, {});
  return (
    <aside className="rounded-lg border border-[#252930] bg-[#111317] p-4">
      <h2 className="mb-4 text-[11px] uppercase tracking-[0.16em] text-[#A3A8B0]">Filter by day</h2>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-[#858B95]">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <div key={`${day}-${index}`}>{day}</div>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {blanks.map((blank) => <div key={`blank-${blank}`} className="h-12" />)}
        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
          const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const upcoming = new Date(`${date}T00:00:00`) > new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const total = totals[date] || 0;
          return (
            <button
              key={date}
              type="button"
              disabled={upcoming}
              onClick={() => onSelect(selectedDay === date ? '' : date)}
              aria-label={`${date}${total ? `, expenses ${money(currency, total)}` : ', no expenses'}${selectedDay === date ? ', selected' : ''}`}
              className={`min-h-12 rounded border p-1 text-left text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${selectedDay === date ? 'border-[#4ADE80] bg-[#0E1611]' : 'border-[#252930] hover:border-[#ECEAE4]'}`}
            >
              <span className="block text-[#ECEAE4]">{day}</span>
              {total > 0 && <span className="block truncate text-right text-[#FFB4A8]">{formatINR(total, currency)}</span>}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function EditTransactionDialog({ transaction, onClose, onSave }: { transaction: Transaction; onClose: () => void; onSave: (transaction: TransactionUpdateInput) => Promise<void> }) {
  const [amount, setAmount] = useState(String(transaction.amount));
  const [category, setCategory] = useState(transaction.category);
  const [date, setDate] = useState(transaction.date);
  const [note, setNote] = useState(transaction.note || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ amount: parsed, category, date, note, type: transaction.type as TransactionType });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-title">
      <form onSubmit={submit} className="w-full max-w-lg rounded-lg border border-[#353A42] bg-[#111317] p-5" noValidate>
        <h2 id="edit-title" className="mb-4 text-lg font-bold text-white">Edit transaction</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-[10px] uppercase tracking-[0.14em] text-[#A3A8B0]">Amount<input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" step="0.01" className="mt-2 h-11 w-full rounded border border-[#353A42] bg-black px-3 text-white" /></label>
          <label className="text-[10px] uppercase tracking-[0.14em] text-[#A3A8B0]">Date<input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="mt-2 h-11 w-full rounded border border-[#353A42] bg-black px-3 text-white" /></label>
          <label className="text-[10px] uppercase tracking-[0.14em] text-[#A3A8B0]">Category<select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 h-11 w-full rounded border border-[#353A42] bg-black px-3 text-white">{CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select></label>
          <label className="text-[10px] uppercase tracking-[0.14em] text-[#A3A8B0]">Note<input value={note} onChange={(e) => setNote(e.target.value)} className="mt-2 h-11 w-full rounded border border-[#353A42] bg-black px-3 text-white" /></label>
        </div>
        {error && <div role="alert" className="mt-4 text-xs text-[#FF7A6B]">{error}</div>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded border border-[#353A42] px-4 py-2 text-xs uppercase tracking-[0.12em] text-[#A3A8B0]">Cancel Esc</button>
          <button disabled={saving} className="rounded bg-[#4ADE80] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#06130A]">{saving ? 'Saving...' : 'Save changes'}</button>
        </div>
      </form>
    </div>
  );
}

function ConfirmDialog({ title, body, error, onCancel, onConfirm }: { title: string; body: string; error: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="w-full max-w-md rounded-lg border border-[#353A42] bg-[#111317] p-5">
        <h2 id="confirm-title" className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-2 text-sm text-[#A3A8B0]">{body}</p>
        <p className="mt-4 text-sm text-[#A3A8B0]">It will be removed from the ledger and from budget totals.</p>
        {error && <div role="alert" className="mt-4 text-xs text-[#FF7A6B]">{error}</div>}
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded border border-[#353A42] px-4 py-2 text-xs uppercase tracking-[0.12em] text-[#A3A8B0]">Cancel Esc</button>
          <button onClick={onConfirm} className="rounded bg-[#FF7A6B] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black">Delete</button>
        </div>
      </div>
    </div>
  );
}

function StatePanel({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-[#353A42] p-8 text-center">
      <h2 className="text-lg font-bold text-[#ECEAE4]">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-[#A3A8B0]">{subtitle}</p>
      {action && onAction && <button onClick={onAction} className="mt-5 rounded-md border border-[#4ADE80] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#4ADE80]">{action}</button>}
    </div>
  );
}

function DataScreen({ txns, accountEmail, identityVerified, currency }: { txns: Transaction[]; accountEmail?: string; identityVerified: boolean; currency: string }) {
  const exportJson = () => downloadBlob(new Blob([JSON.stringify(txns, null, 2)], { type: 'application/json' }), `trakoria_export_${todayISO()}.json`);
  const exportCsv = () => {
    if (txns.length === 0) return;
    const headers = ['id', 'date', 'category', 'amount', 'note', 'type'];
    const rows = txns.map((txn) => headers.map((key) => `"${String(txn[key as keyof Transaction] ?? '').replace(/"/g, '""')}"`).join(','));
    downloadBlob(new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' }), `trakoria_export_${todayISO()}.csv`);
  };
  return (
    <section className="rounded-lg border border-[#252930] bg-[#111317] p-6">
      <h2 className="text-[11px] uppercase tracking-[0.16em] text-[#A3A8B0]">Data operations</h2>
      <p className="mt-3 text-sm text-[#A3A8B0]">Exports include only transactions currently loaded for {accountEmail || 'this account'}.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button disabled={txns.length === 0} onClick={exportCsv} className="rounded-md border border-[#353A42] p-4 text-left disabled:opacity-40"><span className="block text-sm font-bold text-white">CSV</span><span className="text-xs text-[#A3A8B0]">Spreadsheet-friendly export</span></button>
        <button disabled={txns.length === 0} onClick={exportJson} className="rounded-md border border-[#353A42] p-4 text-left disabled:opacity-40"><span className="block text-sm font-bold text-white">JSON</span><span className="text-xs text-[#A3A8B0]">Structured account export</span></button>
        <div className="rounded-md border border-[#353A42] p-4"><span className="block text-sm font-bold text-white">Status</span><span className="text-xs text-[#A3A8B0]">{identityVerified ? `Authenticated · ${currency}` : 'Account access unavailable'}</span></div>
      </div>
    </section>
  );
}

function InsightsScreen({ txns, budgets, currency }: { txns: Transaction[]; budgets: Budget[]; currency: string }) {
  const expenses = txns.filter((txn) => txn.type.toLowerCase() === 'expense');
  const topCategory = Object.entries(expenses.reduce<Record<string, number>>((acc, txn) => {
    acc[txn.category] = (acc[txn.category] || 0) + toAmount(txn.amount);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1])[0];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <MetricCard label="Top category" value={topCategory ? topCategory[0] : 'No data'} note={topCategory ? money(currency, topCategory[1]) : 'Add expenses to unlock insights'} />
      <MetricCard label="Budgets at risk" value={String(budgets.filter((budget) => budgetRisk(budget) >= 0.8).length)} note="80% or more used" />
      <MetricCard label="Entries analyzed" value={String(txns.length)} note="Current selected month" />
    </div>
  );
}

function SettingsScreen({
  email,
  onLogout,
  onChangePassword,
  currency,
  setCurrency,
  grouping,
  setGrouping,
  decimals,
  setDecimals,
}: {
  email?: string;
  onLogout: () => void;
  onChangePassword: (password: string) => Promise<void>;
  currency: string;
  setCurrency: (currency: string) => void;
  grouping: Grouping;
  setGrouping: (grouping: Grouping) => void;
  decimals: boolean;
  setDecimals: (value: boolean) => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const feedback = passwordFeedback(password);
  const mismatch = passwordMismatch(password, confirmation);
  const canSubmit = feedback.isValid && !mismatch && confirmation.length > 0;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setMessage('');
    setError('');
    try {
      await onChangePassword(password);
      setPassword('');
      setConfirmation('');
      setMessage('Password updated.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update password.');
    }
  };
  return (
    <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-[#252930] bg-[#111317] p-4 text-[11px] uppercase tracking-[0.12em] text-[#A3A8B0]">
        <div>Account</div><div className="mt-3">Password</div><div className="mt-3">Terminal lock</div><div className="mt-3">Currency & format</div><div className="mt-3">Session</div>
      </aside>
      <div className="flex flex-col gap-4">
        <section className="rounded-lg border border-[#252930] bg-[#111317] p-5">
          <h2 className="text-lg font-bold text-white">Account</h2>
          <label className="mt-4 block text-[10px] uppercase tracking-[0.14em] text-[#A3A8B0]">Email<input readOnly value={email || ''} className="mt-2 h-11 w-full rounded border border-[#353A42] bg-black px-3 text-white" /></label>
        </section>
        <section className="rounded-lg border border-[#252930] bg-[#111317] p-5">
          <h2 className="text-lg font-bold text-white">Change password</h2>
          <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2" noValidate>
            <label className="text-[10px] uppercase tracking-[0.14em] text-[#A3A8B0]">New password<input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 h-11 w-full rounded border border-[#353A42] bg-black px-3 text-white" /></label>
            <label className="text-[10px] uppercase tracking-[0.14em] text-[#A3A8B0]">Confirm new password<input type={show ? 'text' : 'password'} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-2 h-11 w-full rounded border border-[#353A42] bg-black px-3 text-white" /></label>
            <div className="md:col-span-2 text-xs text-[#A3A8B0]">Password strength: {feedback.label}. {feedback.message}</div>
            {mismatch && <div role="alert" className="md:col-span-2 text-xs text-[#FF7A6B]">{mismatch}</div>}
            {error && <div role="alert" className="md:col-span-2 text-xs text-[#FF7A6B]">{error}</div>}
            {message && <div role="status" className="md:col-span-2 text-xs text-[#4ADE80]">{message}</div>}
            <div className="md:col-span-2 flex justify-between gap-3">
              <button type="button" onClick={() => setShow((value) => !value)} className="rounded border border-[#353A42] px-4 py-2 text-xs uppercase tracking-[0.12em] text-[#A3A8B0]">{show ? 'Hide' : 'Show'}</button>
              <button disabled={!canSubmit} className="rounded bg-[#4ADE80] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#06130A] disabled:opacity-40">Update password</button>
            </div>
          </form>
        </section>
        <section className="rounded-lg border border-[#252930] bg-[#111317] p-5">
          <h2 className="text-lg font-bold text-white">Terminal lock</h2>
          <p className="mt-2 text-sm text-[#A3A8B0]">The legacy PIN lock is disabled for the authenticated V2 dashboard. Use Logout to end this device session.</p>
        </section>
        <section className="rounded-lg border border-[#252930] bg-[#111317] p-5">
          <h2 className="text-lg font-bold text-white">Currency & format</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="text-[10px] uppercase tracking-[0.14em] text-[#A3A8B0]">Currency<select value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-2 h-11 w-full rounded border border-[#353A42] bg-black px-3 text-white"><option value="₹">₹ Indian rupee</option><option value="$">$ US dollar</option><option value="€">€ Euro</option><option value="£">£ British pound</option><option value="AED ">AED UAE dirham</option></select></label>
            <label className="text-[10px] uppercase tracking-[0.14em] text-[#A3A8B0]">Number grouping<select value={grouping} onChange={(e) => setGrouping(e.target.value as Grouping)} className="mt-2 h-11 w-full rounded border border-[#353A42] bg-black px-3 text-white"><option value="indian">Indian</option><option value="international">International</option></select></label>
            <label className="flex items-end gap-2 text-xs text-[#A3A8B0]"><input type="checkbox" checked={decimals} onChange={(e) => setDecimals(e.target.checked)} /> Show paise / cents</label>
          </div>
          <div className="mt-4 rounded border border-[#353A42] bg-black p-4 text-sm text-[#ECEAE4]">Preview: {money(currency, 1234567.89, grouping, decimals)} · {new Date().toLocaleDateString('en-IN')}</div>
          <p className="mt-3 text-xs text-[#F2B544]">Existing stored amounts will not be converted. Only switch if you track this account in the selected currency.</p>
        </section>
        <section className="rounded-lg border border-[#252930] bg-[#111317] p-5">
          <h2 className="text-lg font-bold text-white">Session</h2>
          <p className="mt-2 text-sm text-[#A3A8B0]">Logging out ends your session on this device. Your data stays in your account.</p>
          <button onClick={onLogout} className="mt-4 rounded bg-[#FF7A6B] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black">Log out</button>
        </section>
      </div>
    </div>
  );
}

export default function DashboardPage({
  accountEmail,
  txns,
  config,
  financialError,
  identityVerified,
  toast,
  onLogout,
  onNotify,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onRetryLoad,
  onAddBudget,
  onEditBudget,
  onDeleteBudget,
  onChangePassword,
}: DashboardPageProps) {
  const [screen, setScreen] = useState<Screen>('overview');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [addOpen, setAddOpen] = useState(false);
  const [currency, setCurrency] = useState(config.currency || '₹');
  const [grouping, setGrouping] = useState<Grouping>('indian');
  const [decimals, setDecimals] = useState(false);
  const budgets = config.budgetItems || [];
  const monthTxns = useMemo(() => txns.filter((txn) => isSameMonth(txn.date, selectedMonth)), [selectedMonth, txns]);

  const addTransaction = async (transaction: TransactionInput) => {
    await onAddTransaction(transaction);
    onNotify('Transaction added');
  };

  return (
    <div className="min-h-screen bg-[#0B0D10] font-mono text-[#ECEAE4] selection:bg-[#4ADE80] selection:text-black">
      <div className="flex min-h-screen">
        <Sidebar active={screen} email={accountEmail} onNavigate={setScreen} />
        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 md:px-8 lg:pb-10">
          <TopBar screen={screen} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} onAdd={() => setAddOpen(true)} />
          {financialError && (
            <div role="alert" className="mt-5 rounded-md border border-[#5A2320] bg-[#1A0F0E] p-3 text-xs uppercase tracking-[0.12em] text-[#FF7A6B]">
              {financialError}
            </div>
          )}
          <div className="mt-5">
            {screen === 'overview' && <OverviewScreen txns={monthTxns} budgets={budgets} config={{ ...config, currency }} selectedMonth={selectedMonth} onNavigate={setScreen} />}
            {screen === 'transactions' && (
              <TransactionsScreen
                txns={txns}
                config={{ ...config, currency }}
                selectedMonth={selectedMonth}
                onUpdate={onUpdateTransaction}
                onDelete={onDeleteTransaction}
                onRetry={onRetryLoad}
                loadError={financialError}
              />
            )}
            {screen === 'budgets' && (
              <BudgetManager
                budgets={budgets}
                currency={currency}
                txns={monthTxns}
                onAddBudget={onAddBudget}
                onEditBudget={onEditBudget}
                onDeleteBudget={onDeleteBudget}
              />
            )}
            {screen === 'insights' && <InsightsScreen txns={monthTxns} budgets={budgets} currency={currency} />}
            {screen === 'data' && <DataScreen txns={monthTxns} accountEmail={accountEmail} identityVerified={identityVerified} currency={currency} />}
            {screen === 'settings' && (
              <SettingsScreen
                email={accountEmail}
                onLogout={onLogout}
                onChangePassword={onChangePassword}
                currency={currency}
                setCurrency={setCurrency}
                grouping={grouping}
                setGrouping={setGrouping}
                decimals={decimals}
                setDecimals={setDecimals}
              />
            )}
          </div>
        </main>
      </div>
      <MobileNav active={screen} onNavigate={setScreen} onAdd={() => setAddOpen(true)} />
      <AddTransactionDialog open={addOpen} budgets={budgets} onClose={() => setAddOpen(false)} onSave={addTransaction} />
      <AppToast message={toast} />
    </div>
  );
}
