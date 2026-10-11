import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTransaction,
  createSecureTransaction,
  deleteTransaction,
  deleteSecureTransaction,
  downloadApiFile,
  fetchSecureDashboardData,
  fetchAuthenticatedIdentity,
  fetchDashboardData,
} from '../../services/api';

describe('frontend API helpers', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('attaches the bearer token to the protected identity request', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        user_id: '8d9bbdf8-1b5d-4c77-92a6-e8ab0a0fbdfa',
        email: 'test@example.com',
      }),
    });

    const identity = await fetchAuthenticatedIdentity(' redacted-access-token ');

    expect(identity).toEqual({
      user_id: '8d9bbdf8-1b5d-4c77-92a6-e8ab0a0fbdfa',
      email: 'test@example.com',
    });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/auth/me', {
      headers: {
        Authorization: 'Bearer redacted-access-token',
      },
    });
  });

  it('does not send an authenticated request without a session token', async () => {
    await expect(fetchAuthenticatedIdentity(null)).rejects.toThrow(/session is required/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('handles protected endpoint 401 responses predictably', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
    });

    await expect(fetchAuthenticatedIdentity('redacted-access-token')).rejects.toThrow(/expired or invalid/i);
  });

  it('does not log access tokens when a protected request fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
    });

    await expect(fetchAuthenticatedIdentity('redacted-access-token')).rejects.toThrow(/expired or invalid/i);

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('preserves legacy PIN authentication for dashboard requests', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        config: { currency: '₹', monthlyBudget: 19800, budgets: {} },
        transactions: [],
      }),
    });

    await fetchDashboardData('2468');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/data', {
      headers: { 'x-pin': '2468' },
    });
    expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty('Authorization');
  });

  it('reports temporary containment when dashboard data is blocked', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
    });

    await expect(fetchDashboardData('2468')).rejects.toThrow(/temporarily disabled/i);
  });

  it('reports temporary containment when transaction writes are blocked', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
    });

    await expect(createTransaction('2468', {
      type: 'expense',
      category: 'food',
      amount: 100,
      date: '2026-10-07',
      note: '',
    })).rejects.toThrow(/temporarily disabled/i);
  });

  it('reports temporary containment when transaction deletes are blocked', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
    });

    await expect(deleteTransaction('2468', 1)).rejects.toThrow(/temporarily disabled/i);
  });

  it('reports temporary containment when export and backup downloads are blocked', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
    });

    await expect(downloadApiFile('2468', '/api/export')).rejects.toThrow(/temporarily disabled/i);
    await expect(downloadApiFile('2468', '/api/backup')).rejects.toThrow(/temporarily disabled/i);
  });

  it('uses bearer authentication for secure dashboard data', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        config: { currency: '₹', monthlyBudget: 0, budgets: {} },
        transactions: [],
      }),
    });

    await fetchSecureDashboardData('secure-access-token');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/secure/data', {
      headers: { Authorization: 'Bearer secure-access-token' },
    });
  });

  it('uses bearer authentication for secure transaction writes and deletes', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    await createSecureTransaction('secure-access-token', {
      type: 'expense',
      category: 'food',
      amount: 100,
      date: '2026-10-07',
      note: '',
    });
    await deleteSecureTransaction('secure-access-token', 'txn-a');

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost:8000/api/secure/transactions', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer secure-access-token' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost:8000/api/secure/transactions/txn-a', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer secure-access-token' },
    });
  });
});
