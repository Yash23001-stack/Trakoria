import React from 'react';

const API_BASE = `http://${window.location.hostname}:8000`;

export default function Header({ pin, handleLogout, selectedMonth, setSelectedMonth }) {
  
  const handleExport = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/export`, {
        headers: { "x-pin": pin }
      });
      if (!res.ok) throw new Error("Export failed - Unauthorized");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Trakoria_Export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert("System Error: Could not generate data export.");
    }
  };

  return (
    <header className="border-b border-zinc-800 pb-5 mb-8 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
      
      {/* LEFT SIDE: Brand & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-6">
        
        {/* Brand */}
        <div className="flex flex-col">
          <h1 className="text-xl md:text-2xl tracking-[0.2em] uppercase font-bold text-white flex items-center gap-2">
            <span className="text-green-500 animate-pulse"></span> TRAKORIA
          </h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
            Track Money. Own Your Data.
          </p>
        </div>

        {/* MONTH SELECTOR (DYNAMIC FOR 2026 & 2027) */}
        <div className="relative mb-1">
          <select 
            className="appearance-none bg-[#0a0a0a] border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-500 px-4 py-1.5 pr-8 text-[10px] uppercase tracking-widest transition-colors cursor-pointer outline-none font-bold font-mono"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {[2026, 2027].map(year => (
              ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].map((monthStr, index) => (
                <option key={`${year}-${index}`} value={`${year}-${index}`} className="bg-zinc-900 text-white">
                  {monthStr} {year}
                </option>
              ))
            ))}
          </select>
          {/* Custom Dropdown Arrow */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
            <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Action Buttons */}
      <div className="flex gap-2 items-center mb-1">
        <button 
          onClick={handleExport}
          className="text-[10px] tracking-widest border border-zinc-700 bg-[#0a0a0a] px-3 py-1.5 font-bold text-zinc-400 uppercase hover:bg-white hover:text-black transition-colors cursor-pointer"
        >
          Export Data 
        </button>
        
        <button 
          onClick={handleLogout}
          className="text-[10px] tracking-widest border border-red-900/50 bg-red-950/20 px-3 py-1.5 font-bold text-red-500 uppercase hover:bg-red-500 hover:text-black transition-colors cursor-pointer"
        >
          Lock Terminal
        </button>
      </div>

    </header>
  );
}