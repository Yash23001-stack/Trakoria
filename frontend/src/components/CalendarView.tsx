import type { Transaction } from '../types/transaction';
import { formatINR, toAmount } from '../utils/currency';
import { monthDateFromKey } from '../utils/date';

interface CalendarViewProps {
  txns: Transaction[];
  currency: string;
  setSelectedDate: (date: string) => void;
  selectedMonth: string;
}

export default function CalendarView({ txns, currency, setSelectedDate, selectedMonth }: CalendarViewProps) {
  const today = new Date();
  const { year, month } = monthDateFromKey(selectedMonth);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const expenses = txns.filter((txn) => txn.type.toLowerCase() === 'expense');
  const expensesByDay: Record<number, number> = {};

  expenses.forEach((txn) => {
    const day = Number.parseInt(txn.date.split('-')[2], 10);
    expensesByDay[day] = (expensesByDay[day] || 0) + toAmount(txn.amount);
  });

  const blanks = Array.from({ length: firstDayOfMonth }, (_, index) => index);
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });

  return (
    <div className="border border-zinc-800 bg-[#0a0a0a] p-4 mt-6">
      <div className="flex justify-between items-end border-b border-zinc-900 pb-2 mb-4">
        <h3 className="text-[10px] uppercase tracking-widest text-zinc-400">Transaction Heatmap</h3>
        <span className="text-xs font-bold tracking-widest uppercase">{monthName} {year}</span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[10px] text-zinc-500 text-center uppercase mb-2">
        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {blanks.map((blank) => (
          <div key={`blank-${blank}`} className="h-16 md:h-20 border border-zinc-900/30" />
        ))}

        {days.map((day) => {
          const spent = expensesByDay[day];
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const searchDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          return (
            <button
              type="button"
              key={day}
              onClick={() => setSelectedDate(searchDate)}
              className={`h-16 md:h-20 border relative cursor-pointer transition-colors hover:border-white p-1 flex flex-col justify-between text-left ${
                isToday ? 'border-zinc-500 bg-zinc-900/50' : 'border-zinc-900 hover:bg-zinc-900'
              } ${spent ? 'bg-red-950/20' : ''}`}
            >
              <span className={`text-[10px] ${isToday ? 'text-white' : 'text-zinc-400'}`}>{day}</span>
              {spent ? (
                <span className="text-xs text-red-300 font-bold self-end truncate w-full text-right">
                  {formatINR(spent, currency)}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-700 self-end">clear</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
