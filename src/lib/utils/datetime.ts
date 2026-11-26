/**
 * Converts UTC timestamp to Asia/Colombo (UTC+05:30) timezone for display.
 */
export function formatRestaurantDateTime(
  dateString: string | Date | null | undefined,
  formatStyle: 'full' | 'time' | 'date' = 'full'
): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Colombo',
  };

  if (formatStyle === 'time') {
    return new Intl.DateTimeFormat('en-US', {
      ...options,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  }

  if (formatStyle === 'date') {
    return new Intl.DateTimeFormat('en-US', {
      ...options,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  return new Intl.DateTimeFormat('en-US', {
    ...options,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
