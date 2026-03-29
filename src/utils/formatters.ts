export function formatDate(dateString: string, locale: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '';
  return price.toFixed(2);
}
