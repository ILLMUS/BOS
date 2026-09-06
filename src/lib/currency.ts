/** Eswatini Lilangeni (SZL) — displayed with the "E" symbol. */
export const CURRENCY_CODE = "SZL";
export const CURRENCY_SYMBOL = "E";
export const DEFAULT_COUNTRY_CODE = "+268";

/** Format an amount as Eswatini currency, e.g. E12,500 */
export function formatCurrency(
  value: number | null | undefined,
  opts: { decimals?: number } = {},
): string {
  const n = Number(value || 0);
  const decimals = opts.decimals ?? 0;
  return `${CURRENCY_SYMBOL}${n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
