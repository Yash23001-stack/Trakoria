import { useCallback, useEffect, useState } from 'react';
import { createTransaction, deleteTransaction, fetchDashboardData } from '../services/api';
import type { AppConfig, Transaction, TransactionInput } from '../types/transaction';

const DEFAULT_CONFIG: AppConfig = { currency: '₹', monthlyBudget: 19800, budgets: {} };

export function useTransactions(pin: string) {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (currentPin = pin) => {
    if (!currentPin) {
      setLoading(false);
      return false;
    }

    try {
      const rawData = await fetchDashboardData(currentPin);
      setTxns(rawData.transactions || []);
      setConfig(rawData.config || DEFAULT_CONFIG);
      setLoading(false);
      return true;
    } catch (error) {
      console.error('API Connection Error:', error);
      setLoading(false);
      return false;
    }
  }, [pin]);

  const addTransaction = useCallback(async (transaction: TransactionInput) => {
    await createTransaction(pin, transaction);
    await refresh(pin);
  }, [pin, refresh]);

  const removeTransaction = useCallback(async (transactionId: number) => {
    await deleteTransaction(pin, transactionId);
    await refresh(pin);
  }, [pin, refresh]);

  useEffect(() => {
    void refresh(pin);
  }, [pin, refresh]);

  return {
    txns,
    config,
    loading,
    refresh,
    addTransaction,
    removeTransaction,
    setLoading,
  };
}
