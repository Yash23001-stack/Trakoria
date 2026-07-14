import React, { useState } from 'react';

export default function LedgerStream({ txns, config, selectedDate, setSelectedDate, handleDelete }) {
  const currency = config.currency || "₹";
  const [searchQuery, setSearchQuery] = useState("");
  
  // OS-STYLE SEARCH PARSER
  let displayTxns = txns;
  
  // Handle Calendar Filter first
  if (selectedDate) {
    displayTxns = displayTxns.filter(t => t.date === selectedDate);
  }

  // Handle Command Line Query
  if (searchQuery) {
    const query = searchQuery.toLowerCase().trim();
    
    if (query.startsWith("above ")) {
      const amount = parseFloat(query.replace("above ", ""));
      displayTxns = displayTxns.filter(t => parseFloat(t.amount) > amount);
    } else if (query.startsWith("below ")) {
      const amount = parseFloat(query.replace("below ", ""));
      displayTxns = displayTxns.filter(t => parseFloat(t.amount) < amount);
    } else {
      // Natural language matching (category, note, or month string)
      displayTxns = displayTxns.filter(t => {
        const monthName = new Date(t.date).toLocaleString('default', { month: 'long' }).toLowerCase();
        const searchString = `${t.category} ${t.note || ''} ${monthName} ${t.date}`.toLowerCase();
        
        // If multiple words (e.g. "food july"), ensure ALL words match
        const queryWords = query.split(" ");
        return queryWords.every(word => searchString.includes(word));
      });
    }
  }
    
  const sortedTxns = [...displayTxns].sort((a, b) => b.id - a.id);

  return (
    <div className="border border-zinc-900 bg-[#0a0a0a] flex flex-col h-[500px]">
      
      {/* COMMAND LINE SEARCH BAR */}
      <div className="border-b border-zinc-900 p-3 bg-black flex items-center gap-3">
        <span className="text-green-500 font-bold ml-2">{`>`}</span>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (selectedDate) setSelectedDate(""); // Clear calendar filter if typing
          }}
          placeholder="search queries (e.g. 'rent', 'above 1000', 'food july')"
          className="bg-transparent border-none text-white text-xs tracking-widest focus:outline-none w-full uppercase"
        />
        {selectedDate && (
          <button 
            onClick={() => setSelectedDate("")}
            className="text-[10px] bg-white text-black px-2 py-1 font-bold uppercase tracking-widest hover:bg-zinc-300 transition-colors whitespace-nowrap"
          >
            Clear Filter
          </button>
        )}
      </div>
      
      {/* LEDGER LIST */}
      <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-2">
        {sortedTxns.length > 0 ? (
          sortedTxns.map(txn => (
            <div key={txn.id} className="border border-zinc-800 bg-black p-3 flex justify-between items-center text-xs hover:border-zinc-500 transition-colors">
              <div className="flex flex-col gap-1">
                <span className="text-zinc-500 font-bold">{txn.date}</span>
                <span className="text-zinc-300 uppercase">{txn.note || txn.category}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className={`font-bold ${txn.type.toLowerCase() === 'expense' ? 'text-zinc-300' : 'text-blue-400'}`}>
                  {txn.type.toLowerCase() === 'expense' ? '-' : '+'}{currency}{txn.amount}
                </span>
                <button 
                  onClick={(e) => handleDelete(e, txn.id)}
                  className="text-red-900 hover:text-red-500 uppercase text-[10px] tracking-widest transition-colors"
                >
                  [DEL]
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-zinc-600 text-xs mt-10 uppercase tracking-widest">
            No records found for query.
          </div>
        )}
      </div>
    </div>
  );
}