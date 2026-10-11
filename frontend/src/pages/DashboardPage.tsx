import { useMemo, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import ActivitySidebar from '../components/ActivitySidebar';
import AddTransactionPanel from '../components/AddTransactionPanel';
import CalendarView from '../components/CalendarView';
import ChartsGrid from '../components/ChartsGrid';
import Header from '../components/Header';
import LedgerStream from '../components/LedgerStream';
import MetricsGrid from '../components/MetricsGrid';
import DashboardLayout from '../layouts/DashboardLayout';
import type { AppConfig, Transaction, TransactionInput } from '../types/transaction';
import { currentMonthKey } from '../utils/date';

interface DashboardPageProps {
  accountBoard: ReactNode;
  accountEmail?: string;
  txns: Transaction[];
  config: AppConfig;
  financialError: string | null;
  identityVerified: boolean;
  toast: string | null;
  onLogout: () => void;
  onNotify: (message: string) => void;
  onAddTransaction: (transaction: TransactionInput) => Promise<void>;
  onDeleteTransaction: (transactionId: string) => Promise<void>;
}

export default function DashboardPage({
  accountBoard,
  accountEmail,
  txns,
  config,
  financialError,
  identityVerified,
  toast,
  onLogout,
  onNotify,
  onAddTransaction,
  onDeleteTransaction,
}: DashboardPageProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());

  const currentMonthTxns = useMemo(() => txns.filter((txn) => {
    const txnDate = new Date(txn.date);
    const txnMonthYear = `${txnDate.getFullYear()}-${txnDate.getMonth()}`;
    return txnMonthYear === selectedMonth;
  }), [selectedMonth, txns]);

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>, id: string) => {
    event.stopPropagation();
    if (!window.confirm('Permanently delete this transaction?')) return;

    try {
      await onDeleteTransaction(id);
      onNotify(`Transaction [${id}] terminated`);
    } catch (error) {
      console.error('Delete failed:', error);
      onNotify('Delete failed');
    }
  };

  const handleAddTransaction = async (transaction: TransactionInput) => {
    await onAddTransaction(transaction);
    onNotify('Transaction added');
  };

  return (
    <DashboardLayout toast={toast}>
      <Header
        handleLogout={onLogout}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
      />
      <div className="mb-6">{accountBoard}</div>
      {financialError && (
        <div role="alert" className="border border-red-900 bg-red-950/20 p-3 mb-6 text-[10px] uppercase tracking-widest text-red-400">
          {financialError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 flex flex-col gap-6">
          <AddTransactionPanel
            budgets={config.budgets}
            onAddTransaction={handleAddTransaction}
          />
          <MetricsGrid txns={currentMonthTxns} config={config} />
          <ChartsGrid txns={currentMonthTxns} config={config} />
          <CalendarView
            txns={currentMonthTxns}
            currency={config.currency}
            setSelectedDate={setSelectedDate}
            selectedMonth={selectedMonth}
          />
          <LedgerStream
            txns={currentMonthTxns}
            config={config}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            handleDelete={handleDelete}
          />
        </div>

        <div className="xl:col-span-1">
          <ActivitySidebar
            txns={currentMonthTxns}
            currency={config.currency}
            accountEmail={accountEmail}
            identityVerified={identityVerified}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
