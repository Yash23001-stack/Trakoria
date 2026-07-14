import React from 'react';
import { 
  PieChart, Pie, Cell, 
  LineChart, Line, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function ChartsGrid({ txns, config }) {
  // Ensure we are case-insensitive and parse numbers correctly
  const expenses = txns.filter(t => t.type.toLowerCase() === 'expense');
  const totalSpent = expenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  const today = new Date();
  const totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dailyExpectedBurn = config.monthlyBudget / totalDays;

  // --- 1. DATA PREP FOR DONUT CHART ---
  const catTotals = {};
  expenses.forEach(t => {
    catTotals[t.category] = (catTotals[t.category] || 0) + parseFloat(t.amount);
  });
  
  const pieData = Object.entries(catTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value); // Sort biggest to smallest

  const COLORS = ["#ffffff", "#a1a1aa", "#52525b", "#27272a", "#18181b"];

  // --- 2. DATA PREP FOR BURN CURVE ---
  const dailyRollups = Array(totalDays).fill(0);
  expenses.forEach(t => {
      const dayNum = parseInt(t.date.split("-")[2], 10);
      if(dayNum <= totalDays) {
        dailyRollups[dayNum - 1] += parseFloat(t.amount);
      }
  });
  
  let runningSum = 0;
  const dailyData = dailyRollups.map((val, idx) => {
      runningSum += val;
      const dayNumber = idx + 1;
      return { 
        day: `Day ${dayNumber}`, 
        amount: runningSum,
        expected: Math.round(dailyExpectedBurn * dayNumber) 
      };
  });

  // Custom Dark Mode Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black border border-zinc-800 p-3 text-xs font-mono">
          <p className="text-zinc-400 mb-2 capitalize">{payload[0].payload.name || payload[0].payload.day}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-white font-bold flex items-center gap-2 mb-1">
              <span style={{ color: entry.color }}>■</span>
              {entry.name === 'amount' ? 'Actual' : entry.name === 'expected' ? 'Expected' : entry.name}: 
              {config.currency || '₹'}{entry.value.toLocaleString('en-IN')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      
      {/* Allocation Share Donut */}
      <div className="bg-[#0a0a0a] border border-zinc-900 p-6 flex flex-col h-[350px]">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Allocation Share</h2>
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-zinc-600">No outbound tracking data.</div>
          )}
        </div>
      </div>

      {/* Daily Cumulative Burn Curve */}
      <div className="bg-[#0a0a0a] border border-zinc-900 p-6 flex flex-col h-[350px]">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Daily Cumulative Burn Curve</h2>
        <div className="flex-grow w-full">
          {totalSpent > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <Tooltip content={<CustomTooltip />} />
                {/* THE EXPECTED BURN LINE */}
                <Line type="monotone" dataKey="expected" stroke="#525252" strokeDasharray="3 3" strokeWidth={1} dot={false} name="Expected Burn" />
                {/* THE ACTUAL BURN LINE */}
                <Line type="stepAfter" dataKey="amount" stroke="#ef4444" strokeWidth={2} dot={false} name="Actual Burn" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-zinc-600">Insufficient tracking matrix.</div>
          )}
        </div>
      </div>

    </div>
  );
}