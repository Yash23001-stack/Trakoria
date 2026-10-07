import type { DashboardData, TransactionInput } from '../types/transaction';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8000`;

export async function fetchDashboardData(pin: string): Promise<DashboardData> {
  const response = await fetch(`${API_BASE}/api/data`, {
    headers: { 'x-pin': pin },
  });

  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Unauthorized' : 'Unable to load dashboard data');
  }

  return response.json();
}

export async function createTransaction(pin: string, transaction: TransactionInput): Promise<void> {
  const response = await fetch(`${API_BASE}/api/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-pin': pin,
    },
    body: JSON.stringify(transaction),
  });

  if (!response.ok) {
    throw new Error('Unable to add transaction');
  }
}

export async function deleteTransaction(pin: string, transactionId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: { 'x-pin': pin },
  });

  if (!response.ok) {
    throw new Error('Unable to delete transaction');
  }
}

export async function downloadApiFile(pin: string, endpoint: '/api/export' | '/api/backup'): Promise<Blob> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-pin': pin },
  });

  if (!response.ok) {
    throw new Error('Download blocked by vault');
  }

  return response.blob();
}
