/**
 * Money helpers. Amounts travel as decimal strings ("450000.00"); never do arithmetic on
 * parsed floats. Formatting passes the string straight to Intl, which keeps it exact.
 */
export const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

export function formatMoney(amount: string | number | null | undefined, currency = "UGX"): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const fractionDigits = currency === "UGX" ? 0 : 2;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2,
    }).format(amount as unknown as number); // Intl accepts decimal strings exactly
  } catch {
    return `${currency} ${amount}`;
  }
}

/** Strips thousands separators/spaces a user may type ("1,500,000" -> "1500000"). */
export function normalizeAmountInput(value: string): string {
  return value.replace(/[,\s_]/g, "").trim();
}

/** Extracts a readable error message from a failed API response. */
export async function readApiError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  const msg = body?.error?.message ?? body?.message;
  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors.map((e: { message?: string }) => e.message).filter(Boolean).join("; ") || fallback;
  }
  if (Array.isArray(msg)) return msg.join("; ");
  if (typeof msg === "string" && msg) return msg;
  return fallback;
}
