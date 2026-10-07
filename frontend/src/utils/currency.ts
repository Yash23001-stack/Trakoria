export function formatINR(amount: number, currency = '₹', maximumFractionDigits = 0): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
  }).format(Number.isFinite(amount) ? amount : 0);

  return `${currency}${formatted}`;
}

export function toAmount(value: number | string | undefined): number {
  const amount = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(amount) ? amount : 0;
}
