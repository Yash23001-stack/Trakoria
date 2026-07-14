import React from 'react';

export default function CalendarView({ txns, currency, setSelectedDate }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  // Calculate grid parameters
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  const expenses = txns.filter(t => t.type.toLowerCase() === 'expense');
  
  // Group expenses by specific day number
  const expensesByDay = {};
  expenses.forEach(t => {
    // Assuming date format is YYYY-MM-DD
    const day = parseInt(t.date.split('-')[2], 10);
    expensesByDay[day] = (expensesByDay[day] || 0) + parseFloat(t.amount);
  });

  // Generate blank spaces for days before the 1st of the month
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  // Generate actual days
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthName = today.toLocaleString('default', { month: 'long' });

  return (
    <div className="border border-zinc-900 bg-[#0a0a0a] p-4 mt-6">
      <div className="flex justify-between items-end border-b border-zinc-900 pb-2 mb-4">
        <h3 className="text-[10px] uppercase tracking-widest text-zinc-500">Transaction Heatmap</h3>
        <span className="text-xs font-bold tracking-widest uppercase">{monthName} {year}</span>
      </div>
      
      {/* Calendar Header */}
      <div className="grid grid-cols-7 gap-1 text-[10px] text-zinc-600 text-center uppercase mb-2">
        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {blanks.map(b => (
          <div key={`blank-${b}`} className="h-16 md:h-20 border border-zinc-900/30"></div>
        ))}
        
        {days.map(day => {
          const spent = expensesByDay[day];
          const isToday = day === today.getDate();
          
          // Format date to match your ledger filter (YYYY-MM-DD)
          const searchDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          return (
            <div 
              key={day} 
              onClick={() => setSelectedDate(searchDate)}
              className={`h-16 md:h-20 border relative cursor-pointer transition-colors hover:border-white p-1 flex flex-col justify-between
                ${isToday ? 'border-zinc-500 bg-zinc-900/50' : 'border-zinc-900 hover:bg-zinc-900'}
                ${spent ? 'bg-red-950/20' : ''}
              `}
            >
              <span className={`text-[10px] ${isToday ? 'text-white' : 'text-zinc-500'}`}>{day}</span>
              
              {spent && (
                <span className="text-xs text-red-400 font-bold self-end truncate w-full text-right">
                  {currency}{spent.toFixed(0)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-zinc-600 uppercase mt-4 text-right">
        * Click any date to filter ledger
      </div>
    </div>
  );
}