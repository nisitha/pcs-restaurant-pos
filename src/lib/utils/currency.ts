/**
 * Formats a numeric amount into Sri Lankan Rupee (LKR) standard format.
 * Example: 1450.5 -> "Rs. 1,450.50"
 */
export function formatLKR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return 'Rs. 0.00';
  }

  const numericValue = typeof amount === 'string' ? parseFloat(amount) : amount;

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(numericValue)
    .replace('LKR', 'Rs.');
}
