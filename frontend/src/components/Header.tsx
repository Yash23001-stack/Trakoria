interface HeaderProps {
  handleLogout: () => void;
  selectedMonth: string;
  setSelectedMonth: (value: string) => void;
}

export default function Header({ handleLogout, selectedMonth, setSelectedMonth }: HeaderProps) {
  return (
    <header className="border-b border-zinc-800 pb-5 mb-8 flex flex-col lg:flex-row justify-between lg:items-end gap-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-6">
        <div className="flex flex-col">
          <h1 className="text-xl md:text-2xl tracking-[0.2em] uppercase font-bold text-white">
            TRAKORIA
          </h1>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">
            Track Money. Own Your Data.
          </p>
        </div>

        <div className="relative mb-1">
          <select
            className="appearance-none bg-[#0a0a0a] border border-zinc-700 text-zinc-200 hover:text-white hover:border-zinc-500 px-4 py-1.5 pr-8 text-[10px] uppercase tracking-widest transition-colors cursor-pointer outline-none font-bold font-mono"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          >
            {[2026, 2027].map((year) => (
              ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((monthStr, index) => (
                <option key={`${year}-${index}`} value={`${year}-${index}`} className="bg-zinc-900 text-white">
                  {monthStr} {year}
                </option>
              ))
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
            <span className="text-[10px]">v</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center mb-1">
        <button
          onClick={() => document.getElementById('add-transaction-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="text-[10px] tracking-widest border border-white bg-white px-4 py-1.5 font-bold text-black uppercase hover:bg-zinc-300 transition-colors cursor-pointer"
        >
          + Add Txn
        </button>
        <button
          onClick={handleLogout}
          className="text-[10px] tracking-widest border border-red-800 bg-red-950/20 px-3 py-1.5 font-bold text-red-400 uppercase hover:bg-red-500 hover:text-black transition-colors cursor-pointer"
        >
          Lock Terminal
        </button>
      </div>
    </header>
  );
}
