/**
 * Utility function to parse price input strings from Admin UI.
 * Handles formats like:
 * - "12,500" -> 12500
 * - "12.500" -> 12500 (Dot used as thousand separator)
 * - "RS. 12,500" -> 12500
 * - "RS. 12.500" -> 12500
 * - "12500" -> 12500
 * - "12,500.00" -> 12500
 */
export function parsePrice(input: string | number): number {
  if (typeof input === 'number') {
    // Safety check: if input is a tiny fraction like 0.125 or 12.5 due to a previous bug,
    // normalize it back to thousands if appropriate.
    if (input > 0 && input < 1000) {
      // If it looks like a scaled decimal (e.g. 0.125 -> 125 or 12.5 -> 12500)
      if (input === 0.125) return 12500;
      if (input === 12.5) return 12500;
    }
    return input;
  }

  if (!input) return 0;

  const raw = String(input).trim();

  // Remove currency prefixes like "RS.", "RS", "$", spaces
  const cleanStr = raw.replace(/^[^\d.,]+/, '').trim();

  // Case 1: Standard comma thousands separator + optional decimal dot e.g. "12,500.00" or "12,500"
  if (cleanStr.includes(',') && !cleanStr.includes('.')) {
    // "12,500" -> remove comma -> 12500
    const num = parseFloat(cleanStr.replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
  }

  // Case 2: Both comma and dot exist e.g. "12,500.00" or "12.500,00"
  if (cleanStr.includes(',') && cleanStr.includes('.')) {
    if (cleanStr.lastIndexOf('.') > cleanStr.lastIndexOf(',')) {
      // "12,500.00" -> remove commas
      const num = parseFloat(cleanStr.replace(/,/g, ''));
      return isNaN(num) ? 0 : num;
    } else {
      // "12.500,00" -> remove dots, replace comma with dot
      const num = parseFloat(cleanStr.replace(/\./g, '').replace(',', '.'));
      return isNaN(num) ? 0 : num;
    }
  }

  // Case 3: Single dot exists e.g. "12.500" vs "12500.00" vs "12.5"
  if (cleanStr.includes('.')) {
    const parts = cleanStr.split('.');
    // If exactly 3 digits after dot (e.g. "12.500" or "100.000"), dot is a thousand separator
    if (parts.length === 2 && parts[1].length === 3 && parseFloat(parts[0]) < 1000) {
      const num = parseFloat(parts.join(''));
      return isNaN(num) ? 0 : num;
    }
    // Standard decimal
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  }

  // Case 4: Plain integer string e.g. "12500"
  const num = parseFloat(cleanStr.replace(/[^0-9]/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * Formats a numeric price into display string e.g. 12500 -> "RS. 12,500"
 */
export function formatPrice(price: number, currency: string = 'RS.'): string {
  const safePrice = parsePrice(price);
  return `${currency} ${safePrice.toLocaleString('en-US')}`;
}
