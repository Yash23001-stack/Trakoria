import React from 'react';

const API_BASE = `http://${window.location.hostname}:8000`;

// 1. Notice we added handleLogout here!
export default function Header({ pin, handleLogout }) {
  
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
      a.download = `Personal Expense Tracer_${new Date().toISOString().split('T')[0]}.csv`;
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
      <div>
       {/* LEFT SIDE: Brand & Subname */}
      <div className="flex flex-col">
        <h1 className="text-xl md:text-2xl tracking-[0.2em] uppercase font-bold text-white flex items-center gap-2">
          <span className="text-green-500 animate-pulse"></span> LedgerOS
        </h1>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
         Local Financial Workspace
        </p>
      </div>
      </div>
      
      <div className="flex gap-2 items-center">
        <button 
          onClick={handleExport}
          className="text-[10px] tracking-widest border border-zinc-700 bg-[#0a0a0a] px-3 py-1.5 font-bold text-zinc-400 uppercase hover:bg-white hover:text-black transition-colors"
        >
          Export Data 
        </button>
        
        {/* 2. THE NEW LOCK BUTTON */}
        <button 
          onClick={handleLogout}
          className="text-[10px] tracking-widest border border-red-900/50 bg-red-950/20 px-3 py-1.5 font-bold text-red-500 uppercase hover:bg-red-500 hover:text-black transition-colors"
        >
          Lock Terminal
        </button>

        <span className="text-[10px] border border-zinc-800 px-3 py-1.5 font-bold text-zinc-500 font-mono uppercase bg-black">
          JUL 2026
        </span>
      </div>
    </header>
  );
}