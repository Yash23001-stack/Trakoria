import { useCallback, useEffect, useState } from 'react';
import { createSecureTransaction, deleteSecureTransaction, fetchSecureDashboardData } from '../services/api';
import type { AppConfig, Transaction, TransactionInput } from '../types/transaction';

const DEFAULT_CONFIG: AppConfig = { currency: '₹', monthlyBudget: 19800, budgets: {} };

export function useTransactions(accessToken: string | null | undefined, identityKey: string | null | undefined) {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearData = useCallback(() => {
    setTxns([]);
    setConfig(DEFAULT_CONFIG);
  }, []);

  const refresh = useCallback(async () => {
    if (!accessToken || !identityKey) {
      clearData();
      setLoading(false);
      setError(null);
      return false;
    }

    try {
      const rawData = await fetchSecureDashboardData(accessToken);
      setTxns(rawData.transactions || []);
      setConfig(rawData.config || DEFAULT_CONFIG);
      setError(null);
      setLoading(false);
      return true;
    } catch (error) {
      console.error('API Connection Error:', error);
      clearData();
      setError(error instanceof Error ? error.message : 'Unable to load dashboard data');
      setLoading(false);
      return false;
    }
  }, [accessToken, clearData, identityKey]);

  const addTransaction = useCallback(async (transaction: TransactionInput) => {
    await createSecureTransaction(accessToken, transaction);
    await refresh();
  }, [accessToken, refresh]);

  const removeTransaction = useCallback(async (transactionId: string) => {
    await deleteSecureTransaction(accessToken, transactionId);
    await refresh();
  }, [accessToken, refresh]);

  useEffect(() => {
    clearData();
    void refresh();
  }, [clearData, identityKey, refresh]);

  return {
    txns,
    config,
    loading,
    error,
    refresh,
    addTransaction,
    removeTransaction,
    setLoading,
  };
}
