import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DataOperations from '../../components/activity/DataOperations';

const pdfSpies = vi.hoisted(() => ({
  text: vi.fn(),
  save: vi.fn(),
}));

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(function MockJsPDF() {
    return {
      setFontSize: vi.fn(),
      setFont: vi.fn(),
      text: pdfSpies.text,
      rect: vi.fn(),
      save: pdfSpies.save,
    };
  }),
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

describe('DataOperations', () => {
  it('labels PDF exports with the current account instead of a hardcoded identity', async () => {
    const user = userEvent.setup();
    pdfSpies.text.mockClear();
    pdfSpies.save.mockClear();

    render(
      <DataOperations
        accountEmail="second@example.com"
        identityVerified
        txns={[{
          id: 'txn-a',
          date: '2026-10-07',
          category: 'food',
          amount: 100,
          note: 'Lunch',
          type: 'expense',
        }]}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^pdf$/i }));

    expect(pdfSpies.text).toHaveBeenCalledWith('Account Email: second@example.com', 16, 38);
    expect(pdfSpies.text).toHaveBeenCalledWith('Account Status: Authenticated', 110, 50);
    expect(screen.queryByText(/telegram/i)).not.toBeInTheDocument();
    expect(pdfSpies.text).not.toHaveBeenCalledWith(expect.stringContaining('YASH'), expect.any(Number), expect.any(Number));
    expect(pdfSpies.text).not.toHaveBeenCalledWith('Status: Verified Offline', expect.any(Number), expect.any(Number));
  });
});
