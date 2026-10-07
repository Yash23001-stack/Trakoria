import type { Transaction } from '../types/transaction';
import BotStatus from './activity/BotStatus';
import DataOperations from './activity/DataOperations';
import LiveFeed from './activity/LiveFeed';

interface ActivitySidebarProps {
  txns: Transaction[];
  currency: string;
  pin: string;
}

export default function ActivitySidebar({ txns, currency, pin }: ActivitySidebarProps) {
  return (
    <div className="flex flex-col gap-4 h-full">
      <BotStatus />
      <DataOperations txns={txns} pin={pin} />
      <LiveFeed txns={txns} currency={currency} />
    </div>
  );
}
