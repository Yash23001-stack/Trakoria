import type { DashboardData, TransactionInput } from '../types/transaction';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8000`;

export type BackendIdentity = {
  user_id: string;
  email: string | null;
};

export async function fetchAuthenticatedIdentity(accessToken: string | null | undefined): Promise<BackendIdentity> {
  const token = accessToken?.trim();

  if (!token) {
    throw new Error('Supabase session is required to contact the backend.');
  }

  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(response.status === 401
      ? 'Supabase session is expired or invalid.'
      : 'Unable to verify authenticated identity');
  }

  return response.json();
}

function requireAccessToken(accessToken: string | null | undefined): string {
  const token = accessToken?.trim();

  if (!token) {
    throw new Error('Supabase session is required to contact the backend.');
  }

  return token;
}

function authHeaders(accessToken: string | null | undefined): { Authorization: string } {
  return {
    Authorization: `Bearer ${requireAccessToken(accessToken)}`,
  };
}

function financialError(response: Response, fallback: string): Error {
  if (response.status === 401) {
    return new Error('Supabase session is expired or invalid.');
  }

  if (response.status === 403) {
    return new Error('Financial access is not authorized for this account.');
  }

  return new Error(fallback);
}

export async function fetchSecureDashboardData(accessToken: string | null | undefined): Promise<DashboardData> {
  const response = await fetch(`${API_BASE}/api/secure/data`, {
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw financialError(response, 'Unable to load dashboard data');
  }

  return response.json();
}

export async function createSecureTransaction(
  accessToken: string | null | undefined,
  transaction: TransactionInput,
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/secure/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(accessToken),
    },
    body: JSON.stringify(transaction),
  });

  if (!response.ok) {
    throw financialError(response, 'Unable to add transaction');
  }
}

export async function deleteSecureTransaction(
  accessToken: string | null | undefined,
  transactionId: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/secure/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw financialError(response, 'Unable to delete transaction');
  }
}

export async function downloadSecureApiFile(
  accessToken: string | null | undefined,
  endpoint: '/api/secure/export' | '/api/secure/backup',
): Promise<Blob> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw financialError(response, 'Download blocked by authorization');
  }

  return response.blob();
}

export async function fetchDashboardData(pin: string): Promise<DashboardData> {
  const response = await fetch(`${API_BASE}/api/data`, {
    headers: { 'x-pin': pin },
  });

  if (!response.ok) {
    throw new Error(response.status === 401
      ? 'Unauthorized'
      : response.status === 403
        ? 'Legacy financial access is temporarily disabled'
        : 'Unable to load dashboard data');
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
    throw new Error(response.status === 403
      ? 'Legacy financial access is temporarily disabled'
      : 'Unable to add transaction');
  }
}

export async function deleteTransaction(pin: string, transactionId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: { 'x-pin': pin },
  });

  if (!response.ok) {
    throw new Error(response.status === 403
      ? 'Legacy financial access is temporarily disabled'
      : 'Unable to delete transaction');
  }
}

export async function downloadApiFile(pin: string, endpoint: '/api/export' | '/api/backup'): Promise<Blob> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-pin': pin },
  });

  if (!response.ok) {
    throw new Error(response.status === 403
      ? 'Legacy financial access is temporarily disabled'
      : 'Download blocked by vault');
  }

  return response.blob();
}
