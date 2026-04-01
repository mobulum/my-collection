export function formatDate(dateString: string, locale: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '';
  return price.toFixed(2);
}

const FORMAT_KEYWORDS: readonly [string, string][] = [
  ['blu-ray', 'BD'],
  ['bd', 'BD'],
  ['dvd', 'DVD'],
  ['cd', 'CD'],
  ['sacd', 'CD'],
  ['lp', 'VINYL'],
  ['vinyl', 'VINYL'],
  ['7"', 'VINYL'],
  ['10"', 'VINYL'],
  ['12"', 'VINYL'],
];

export function normalizeFormat(format: string): string {
  if (!format) return '';
  const lower = format.toLowerCase();
  for (const [keyword, label] of FORMAT_KEYWORDS) {
    if (lower.includes(keyword)) {
      return label;
    }
  }
  return format;
}
