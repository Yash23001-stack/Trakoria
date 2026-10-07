import type { AppConfig, Transaction } from '../types/transaction';
import { formatINR, toAmount } from '../utils/currency';

interface MetricsGridProps {
  txns: Transaction[];
  config: AppConfig;
}

interface StatBoxProps {
  label: string;
  value: string;
  sub?: string;
  color: string;
  emphasis?: boolean;
}

export default function MetricsGrid({ txns, config }: MetricsGridProps) {
  const currency = config.currency || '₹';
  const expenses = txns.filter((txn) => txn.type.toLowerCase() === 'expense');
  const incomes = txns.filter((txn) => txn.type.toLowerCase() === 'income');
  const totalExpense = expenses.reduce((sum, txn) => sum + toAmount(txn.amount), 0);
  const totalIncome = incomes.reduce((sum, txn) => sum + toAmount(txn.amount), 0);
  const netCashFlow = totalIncome - totalExpense;
  const remainingTotal = config.monthlyBudget - totalExpense;
  const isOvershot = remainingTotal < 0;
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dailyBudget = config.monthlyBudget / daysInMonth;
  const currentRunRate = currentDay > 0 ? totalExpense / currentDay : 0;
  const burnDiff = dailyBudget > 0 ? ((currentRunRate - dailyBudget) / dailyBudget) * 100 : 0;
  const burnText = burnDiff > 0
    ? `${burnDiff.toFixed(0)}% above target`
    : `${Math.abs(burnDiff).toFixed(0)}% below target`;
  const burnColor = burnDiff > 0 ? 'text-red-400' : 'text-emerald-300';
  let systemStatus = { text: 'OPTIMAL', color: 'text-emerald-300' };
  let overshotCategory: string | null = null;

  Object.entries(config.budgets || {}).forEach(([category, budgetAmount]) => {
    const spent = expenses
      .filter((txn) => txn.category.toLowerCase() === category.toLowerCase())
      .reduce((sum, txn) => sum + toAmount(txn.amount), 0);
    if (spent > budgetAmount) overshotCategory = category;
  });

  if (netCashFlow < 0) {
    systemStatus = { text: 'NEGATIVE CASH FLOW', color: 'text-red-400 font-bold' };
  } else if (isOvershot) {
    systemStatus = { text: 'TOTAL BUDGET OVERSHOT', color: 'text-red-400 font-bold' };
  } else if (overshotCategory) {
    systemStatus = { text: `${overshotCategory} BUDGET EXCEEDED`, color: 'text-orange-300 font-bold' };
  }

  const largestExpense = expenses.reduce<Transaction | null>((max, txn) => {
    if (!max) return txn;
    return toAmount(txn.amount) > toAmount(max.amount) ? txn : max;
  }, null);
  const largestDateStr = largestExpense?.date
    ? new Date(largestExpense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : 'No spend yet';
  const estimatedMonthEnd = config.monthlyBudget - (currentRunRate * daysInMonth);
  const categoryEntries = Object.entries(config.budgets || {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
      <div className="col-span-1 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatBox
          label="Remaining Budget"
          value={isOvershot ? 'Budget Overshot' : formatINR(remainingTotal, currency)}
          sub={isOvershot ? `${formatINR(Math.abs(remainingTotal), currency)} over` : `of ${formatINR(config.monthlyBudget, currency)}`}
          color={isOvershot ? 'text-red-400' : 'text-white'}
          emphasis
        />
        <StatBox label="Net Cash Flow" value={formatINR(netCashFlow, currency)} color={netCashFlow < 0 ? 'text-red-400' : 'text-blue-300'} emphasis />
        <StatBox label="Current Daily Burn" value={`${formatINR(currentRunRate, currency)}/day`} sub={burnText} color={burnColor} />
        <StatBox label="System Status" value={systemStatus.text} color={systemStatus.color} />
        <StatBox
          label="Largest Expense"
          value={largestExpense ? formatINR(toAmount(largestExpense.amount), currency) : formatINR(0, currency)}
          sub={largestExpense ? `${largestExpense.category} | ${largestDateStr}` : 'No expense records'}
          color="text-orange-300"
        />
        <StatBox label="Month Spend" value={formatINR(totalExpense, currency)} sub={`${expenses.length} expense records`} color="text-zinc-100" />
        <StatBox label="Month Income" value={formatINR(totalIncome, currency)} sub={`${incomes.length} income records`} color="text-blue-300" />
        <StatBox label="Est. Month End" value={formatINR(estimatedMonthEnd, currency)} color={estimatedMonthEnd < 0 ? 'text-red-400' : 'text-emerald-300'} />
      </div>

      <div className="col-span-1 border border-zinc-800 bg-[#0a0a0a] p-4 flex flex-col gap-3 h-full overflow-y-auto max-h-[300px]">
        <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 border-b border-zinc-900 pb-2 mb-2">
          Category Allocation
        </h3>
        {categoryEntries.length > 0 ? categoryEntries.map(([category, budgetAmount]) => {
          const spent = expenses
            .filter((txn) => txn.category.toLowerCase() === category.toLowerCase())
            .reduce((sum, txn) => sum + toAmount(txn.amount), 0);
          const percent = budgetAmount > 0 ? Math.min(100, (spent / budgetAmount) * 100) : 0;
          const isOver = spent > budgetAmount;

          return (
            <div key={category} className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between gap-3">
                <span className="uppercase truncate text-zinc-200">{category}</span>
                <span className={isOver ? 'text-red-400' : 'text-zinc-400'}>
                  {formatINR(spent, currency)} / {formatINR(budgetAmount, currency)}
                </span>
              </div>
              <div className="h-1.5 bg-zinc-900 overflow-hidden">
                <div className={isOver ? 'h-full bg-red-500' : 'h-full bg-white'} style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        }) : (
          <div className="text-xs text-zinc-600 uppercase tracking-widest">No category budgets configured.</div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, color, emphasis = false }: StatBoxProps) {
  return (
    <div className={`border bg-[#0a0a0a] p-4 flex flex-col justify-between h-full min-h-[108px] ${emphasis ? 'border-zinc-700' : 'border-zinc-900'}`}>
      <span className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">{label}</span>
      <div>
        <span className={`${emphasis ? 'text-lg md:text-xl' : 'text-sm md:text-base'} tracking-wider block ${color}`}>{value}</span>
        {sub && <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider truncate">{sub}</div>}
      </div>
    </div>
  );
}
