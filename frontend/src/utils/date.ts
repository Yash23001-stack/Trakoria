export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function currentMonthKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth()}`;
}

export function monthDateFromKey(monthKey: string): { year: number; month: number } {
  const [yearStr, monthStr] = monthKey.split('-');
  return {
    year: Number.parseInt(yearStr, 10),
    month: Number.parseInt(monthStr, 10),
  };
}
