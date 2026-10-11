import type { Transaction } from '../../types/transaction';
import { formatINR, toAmount } from '../../utils/currency';

interface LiveFeedProps {
  txns: Transaction[];
  currency: string;
}

export default function LiveFeed({ txns, currency }: LiveFeedProps) {
  const recentTxns = [...txns].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 5);

  return (
    <div className="border border-zinc-800 bg-[#0a0a0a] p-4 flex-grow">
      <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 border-b border-zinc-900 pb-2 mb-4">
        Live Feed
      </h3>

      <div className="flex flex-col gap-4">
        {recentTxns.map((txn) => {
          const isExpense = txn.type.toLowerCase() === 'expense';

          return (
            <div key={txn.id} className="text-xs border-l-2 pl-3 py-1 flex flex-col gap-1 border-zinc-800">
              <span className="text-zinc-600 font-bold">[SYS_T_{txn.id.slice(0, 8)}]</span>
              <div className="flex justify-between w-full gap-2">
                <span className={isExpense ? 'text-zinc-200' : 'text-blue-300'}>
                  {txn.type} {formatINR(toAmount(txn.amount), currency)}
                </span>
                <span className="text-zinc-500 uppercase truncate">{txn.category}</span>
              </div>
            </div>
          );
        })}

        {recentTxns.length === 0 && (
          <div className="text-xs text-zinc-600 uppercase tracking-widest leading-6">
            No live feed yet.
            <br />
            Add a transaction to start the stream.
          </div>
        )}
      </div>
    </div>
  );
}
