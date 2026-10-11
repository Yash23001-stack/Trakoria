import { useState } from 'react';
import type { MouseEvent } from 'react';
import type { AppConfig, Transaction } from '../types/transaction';
import { formatINR, toAmount } from '../utils/currency';

interface LedgerStreamProps {
  txns: Transaction[];
  config: AppConfig;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  handleDelete: (event: MouseEvent<HTMLButtonElement>, id: string) => void;
}

export default function LedgerStream({ txns, config, selectedDate, setSelectedDate, handleDelete }: LedgerStreamProps) {
  const currency = config.currency || '₹';
  const [searchQuery, setSearchQuery] = useState('');
  let displayTxns = txns;

  if (selectedDate) {
    displayTxns = displayTxns.filter((txn) => txn.date === selectedDate);
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase().trim();

    if (query.startsWith('above ')) {
      const amount = Number.parseFloat(query.replace('above ', ''));
      displayTxns = displayTxns.filter((txn) => toAmount(txn.amount) > amount);
    } else if (query.startsWith('below ')) {
      const amount = Number.parseFloat(query.replace('below ', ''));
      displayTxns = displayTxns.filter((txn) => toAmount(txn.amount) < amount);
    } else {
      displayTxns = displayTxns.filter((txn) => {
        const monthName = new Date(txn.date).toLocaleString('default', { month: 'long' }).toLowerCase();
        const searchString = `${txn.category} ${txn.note || ''} ${monthName} ${txn.date}`.toLowerCase();
        return query.split(' ').every((word) => searchString.includes(word));
      });
    }
  }

  const sortedTxns = [...displayTxns].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  return (
    <div className="border border-zinc-800 bg-[#0a0a0a] flex flex-col h-[500px]">
      <div className="border-b border-zinc-900 p-3 bg-black flex items-center gap-3">
        <span className="text-green-400 font-bold ml-2">{'>'}</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            if (selectedDate) setSelectedDate('');
          }}
          placeholder="search queries (e.g. rent, above 1000, food july)"
          className="bg-transparent border-none text-white text-xs tracking-widest focus:outline-none w-full uppercase placeholder:text-zinc-700"
        />
        {selectedDate && (
          <button
            onClick={() => setSelectedDate('')}
            className="text-[10px] bg-white text-black px-2 py-1 font-bold uppercase tracking-widest hover:bg-zinc-300 transition-colors whitespace-nowrap"
          >
            Clear Filter
          </button>
        )}
      </div>

      <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-2">
        {sortedTxns.length > 0 ? (
          sortedTxns.map((txn) => {
            const isExpense = txn.type.toLowerCase() === 'expense';

            return (
              <div key={txn.id} className="border border-zinc-800 bg-black p-3 flex justify-between items-center text-xs hover:border-zinc-500 transition-colors">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-zinc-500 font-bold">{txn.date}</span>
                  <span className="text-zinc-200 uppercase truncate">{txn.note || txn.category}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className={`font-bold ${isExpense ? 'text-zinc-200' : 'text-blue-300'}`}>
                    {isExpense ? '-' : '+'}{formatINR(toAmount(txn.amount), currency)}
                  </span>
                  <button
                    onClick={(event) => handleDelete(event, txn.id)}
                    className="text-red-700 hover:text-red-400 uppercase text-[10px] tracking-widest transition-colors"
                  >
                    [DEL]
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-zinc-500 text-xs mt-10 uppercase tracking-widest leading-6">
            No records found.
            <br />
            Add a transaction or widen the current filter.
          </div>
        )}
      </div>
    </div>
  );
}
