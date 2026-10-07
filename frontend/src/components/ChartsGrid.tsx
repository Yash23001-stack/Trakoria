import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { AppConfig, Transaction } from '../types/transaction';
import { formatINR, toAmount } from '../utils/currency';

interface ChartsGridProps {
  txns: Transaction[];
  config: AppConfig;
}

type ChartDatum = {
  name?: string;
  day?: string;
  amount?: number;
  expected?: number;
  value?: number;
};

type TooltipPayload = {
  color?: string;
  name?: string;
  value?: number;
  payload: ChartDatum;
};

function ChartTooltip({ active, payload = [], currency }: { active?: boolean; payload?: TooltipPayload[]; currency: string }) {
  if (active && payload && payload.length) {
    const datum = payload[0].payload as ChartDatum;

    return (
      <div className="bg-black border border-zinc-800 p-3 text-xs font-mono">
        <p className="text-zinc-400 mb-2 capitalize">{datum.name || datum.day}</p>
        {payload.map((entry) => (
          <p key={`${entry.name}-${entry.value}`} className="text-white font-bold flex items-center gap-2 mb-1">
            <span style={{ color: entry.color }}>■</span>
            {entry.name === 'amount' ? 'Actual' : entry.name === 'expected' ? 'Expected' : entry.name}:
            {formatINR(Number(entry.value || 0), currency)}
          </p>
        ))}
      </div>
    );
  }

  return null;
}

export default function ChartsGrid({ txns, config }: ChartsGridProps) {
  const expenses = txns.filter((txn) => txn.type.toLowerCase() === 'expense');
  const totalSpent = expenses.reduce((sum, txn) => sum + toAmount(txn.amount), 0);
  const today = new Date();
  const totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dailyExpectedBurn = config.monthlyBudget / totalDays;
  const catTotals: Record<string, number> = {};

  expenses.forEach((txn) => {
    catTotals[txn.category] = (catTotals[txn.category] || 0) + toAmount(txn.amount);
  });

  const pieData = Object.entries(catTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const colors = ['#ffffff', '#d4d4d8', '#a1a1aa', '#71717a', '#3f3f46', '#27272a'];
  const dailyRollups = Array(totalDays).fill(0) as number[];

  expenses.forEach((txn) => {
    const dayNum = Number.parseInt(txn.date.split('-')[2], 10);
    if (dayNum <= totalDays) {
      dailyRollups[dayNum - 1] += toAmount(txn.amount);
    }
  });

  const dailyData = dailyRollups.map((_value, index) => {
    const dayNumber = index + 1;
    const amount = dailyRollups.slice(0, dayNumber).reduce((sum, daySpend) => sum + daySpend, 0);

    return {
      day: `Day ${dayNumber}`,
      amount,
      expected: Math.round(dailyExpectedBurn * dayNumber),
    };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div className="bg-[#0a0a0a] border border-zinc-800 p-6 flex flex-col h-[350px]">
        <h2 className="text-xs uppercase tracking-widest text-zinc-400 mb-2">Allocation Share</h2>
        <div className="flex-grow w-full flex items-center justify-center">
          {totalSpent > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  stroke="none"
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip currency={config.currency || '₹'} />} cursor={{ fill: 'transparent' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-zinc-500 uppercase tracking-widest text-center leading-6">
              No expense data yet.
              <br />
              Allocation appears after the first expense.
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-zinc-800 p-6 flex flex-col h-[350px]">
        <h2 className="text-xs uppercase tracking-widest text-zinc-400 mb-2">Daily Cumulative Burn Curve</h2>
        <div className="flex-grow w-full">
          {totalSpent > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <Tooltip content={<ChartTooltip currency={config.currency || '₹'} />} />
                <Line type="monotone" dataKey="expected" stroke="#71717a" strokeDasharray="3 3" strokeWidth={1} dot={false} name="Expected Burn" />
                <Line type="stepAfter" dataKey="amount" stroke="#ef4444" strokeWidth={2} dot={false} name="Actual Burn" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-zinc-500 uppercase tracking-widest text-center leading-6">
              No burn curve yet.
              <br />
              Add expenses to compare actual versus budget.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
