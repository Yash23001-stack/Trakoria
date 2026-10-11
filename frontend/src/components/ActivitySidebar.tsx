import type { Transaction } from '../types/transaction';
import DataOperations from './activity/DataOperations';
import LiveFeed from './activity/LiveFeed';

interface ActivitySidebarProps {
  txns: Transaction[];
  currency: string;
  accountEmail?: string;
  identityVerified: boolean;
}

export default function ActivitySidebar({ txns, currency, accountEmail, identityVerified }: ActivitySidebarProps) {
  return (
    <div className="flex flex-col gap-4 h-full">
      <DataOperations txns={txns} accountEmail={accountEmail} identityVerified={identityVerified} />
      <LiveFeed txns={txns} currency={currency} />
    </div>
  );
}
