import React from 'react';

export default function MetricsGrid({ txns, config }) {
  const currency = config.currency || "₹";
  
  const expenses = txns.filter(t => t.type.toLowerCase() === 'expense');
  const incomes = txns.filter(t => t.type.toLowerCase() === 'income');
  
  const totalExpense = expenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalIncome = incomes.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const netCashFlow = totalIncome - totalExpense;
  
  const remainingTotal = config.monthlyBudget - totalExpense;
  const isOvershot = remainingTotal < 0;
  
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dailyBudget = config.monthlyBudget / daysInMonth;

  // 1. DYNAMIC CURRENT DAILY BURN
  const currentRunRate = currentDay > 0 ? totalExpense / currentDay : 0;
  const burnDiff = dailyBudget > 0 ? ((currentRunRate - dailyBudget) / dailyBudget) * 100 : 0;
  const burnText = burnDiff > 0 
    ? `↑ ${burnDiff.toFixed(0)}% above target` 
    : `↓ ${Math.abs(burnDiff).toFixed(0)}% below target`;
  const burnColor = burnDiff > 0 ? "text-red-500" : "text-emerald-400";

  // 2. DYNAMIC SYSTEM STATUS
  let systemStatus = { text: "OPTIMAL", color: "text-zinc-500" };
  let overshotCategory = null;
  
  Object.entries(config.budgets || {}).forEach(([cat, amt]) => {
    const spent = expenses.filter(t => t.category.toLowerCase() === cat.toLowerCase()).reduce((s, t) => s + parseFloat(t.amount), 0);
    if (spent > amt) overshotCategory = cat;
  });

  if (netCashFlow < 0) {
    systemStatus = { text: "CRITICAL: Negative cash flow", color: "text-red-500 animate-pulse font-bold" };
  } else if (isOvershot) {
    systemStatus = { text: "CRITICAL: Total budget overshot", color: "text-red-500 font-bold" };
  } else if (overshotCategory) {
    systemStatus = { text: `WARNING: ${overshotCategory} budget exceeded`, color: "text-orange-400 font-bold" };
  }

  // 3. ENHANCED LARGEST EXPENSE
  const largestExpense = expenses.reduce((max, t) => parseFloat(t.amount) > parseFloat(max.amount || 0) ? t : max, { amount: 0, note: "None", category: "", date: "" });
  const largestDateObj = largestExpense.date ? new Date(largestExpense.date) : null;
  const largestDateStr = largestDateObj ? largestDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : "";

  // 4. SMART SPENDING STREAK
  let currentStreak = 0;
  let lastUnderBudgetStr = "N/A";
  let streakBroken = false;
  
  const expensesByDate = {};
  expenses.forEach(t => {
    expensesByDate[t.date] = (expensesByDate[t.date] || 0) + parseFloat(t.amount);
  });
  
  for (let i = 0; i <= currentDay - 1; i++) {
    const checkDate = new Date(today.getFullYear(), today.getMonth(), currentDay - i);
    const checkDateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    const daySpend = expensesByDate[checkDateStr] || 0;

    if (daySpend <= dailyBudget) {
      if (!streakBroken) currentStreak++;
      if (lastUnderBudgetStr === "N/A") {
        lastUnderBudgetStr = checkDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      }
    } else {
      streakBroken = true;
    }
    if (streakBroken && lastUnderBudgetStr !== "N/A") break;
  }

  // CASH PREDICTION
  const estimatedMonthEnd = config.monthlyBudget - (currentRunRate * daysInMonth);
  let exhaustDateText = "Sufficient";

  if (remainingTotal > 0 && currentRunRate > 0) {
    const daysUntilZero = Math.floor(remainingTotal / currentRunRate);
    const exhaustDate = new Date(today);
    exhaustDate.setDate(currentDay + daysUntilZero);
    exhaustDateText = `${exhaustDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} (in ${daysUntilZero} days)`;
  } else if (remainingTotal <= 0) {
    let runningSum = 0;
    let breachedDate = null;
    const sortedTxns = [...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    for (const t of sortedTxns) {
        runningSum += parseFloat(t.amount);
        if (runningSum > config.monthlyBudget) {
            breachedDate = new Date(t.date);
            break;
        }
    }
    
    if (breachedDate) {
        const daysAgo = Math.floor((today - breachedDate) / (1000 * 60 * 60 * 24));
        const formattedDate = breachedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        exhaustDateText = `Ran out ${formattedDate} (${daysAgo} days ago)`;
    } else {
        exhaustDateText = "Budget Exceeded";
    }
  }

  const generateProgressBar = (spent, budget) => {
    if (!budget || budget === 0) return '░░░░░░░░░░ 0%';
    const percent = Math.min(100, Math.max(0, (spent / budget) * 100));
    const filledBlocks = Math.floor(percent / 10);
    const emptyBlocks = 10 - filledBlocks;
    return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks) + ` ${percent.toFixed(0)}%`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
      
      {/* LEFT PANEL */}
      <div className="col-span-1 lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox label="Remaining Budget" 
                 value={isOvershot ? `⚠ Budget Overshot` : `${currency}${remainingTotal.toFixed(0)}`} 
                 sub={isOvershot ? `${currency}${Math.abs(remainingTotal).toFixed(0)}` : `Of ${currency}${config.monthlyBudget}`}
                 color={isOvershot ? "text-red-500" : "text-white"} />
        <StatBox label="Net Cash Flow" value={`${currency}${netCashFlow}`} color={netCashFlow < 0 ? "text-red-500" : "text-blue-500"} />
        
        {/* NEW DAILY BURN */}
        <StatBox label="Current Daily Burn" value={`${currency}${currentRunRate.toFixed(0)}/day`} sub={burnText} color={burnColor} />
        
        <StatBox label="System Status" value={systemStatus.text} color={systemStatus.color} />
        
        {/* NEW LARGEST EXPENSE */}
        <StatBox 
          label="Largest Expense" 
          value={`${currency}${largestExpense.amount}`} 
          sub={`${largestExpense.category} | ${largestDateStr}`} 
          color="text-orange-400" 
        />
        
        <StatBox label="Est. Month End" value={`${currency}${estimatedMonthEnd.toFixed(0)}`} color={estimatedMonthEnd < 0 ? "text-red-500" : "text-emerald-400"} />
        <StatBox label="Money Finishes By" value={exhaustDateText} color="text-zinc-300" />
        
        {/* NEW STREAK MODULE */}
        <StatBox 
          label="Spending Streak" 
          value={`${currentStreak} Day Streak`} 
          sub={`Last Under Budget: ${lastUnderBudgetStr}`} 
          color={currentStreak > 0 ? "text-yellow-500" : "text-zinc-500"} 
        />
      </div>

      {/* RIGHT PANEL */}
      <div className="col-span-1 border border-zinc-900 bg-[#0a0a0a] p-4 flex flex-col gap-3 h-full overflow-y-auto max-h-[300px]">
        <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-900 pb-2 mb-2">
          Category Allocation
        </h3>
        {Object.entries(config.budgets || {}).map(([category, budgetAmount]) => {
          const spent = expenses
            .filter(t => t.category.toLowerCase() === category.toLowerCase())
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
          const isOver = spent > budgetAmount;
          
          return (
            <div key={category} className="flex justify-between items-center text-xs">
              <span className="uppercase w-20 truncate pr-2">{category}</span>
              <span className={`tracking-widest whitespace-nowrap ${isOver ? 'text-red-500 animate-pulse' : 'text-zinc-400'}`}>
                {generateProgressBar(spent, budgetAmount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, color }) {
  return (
    <div className="border border-zinc-900 bg-[#0a0a0a] p-4 flex flex-col justify-between h-full min-h-[100px]">
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">{label}</span>
      <div>
        <span className={`text-sm md:text-lg tracking-wider block ${color}`}>{value}</span>
        {sub && <div className="text-[10px] text-zinc-600 mt-1 uppercase tracking-wider truncate">{sub}</div>}
      </div>
    </div>
  );
}