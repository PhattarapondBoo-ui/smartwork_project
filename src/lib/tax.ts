/**
 * Withholding tax (ภาษีหัก ณ ที่จ่าย) for paying freelance cleaners.
 *
 * Thai rule of thumb: when the PAYER is a juristic person (company / partnership)
 * and pays an individual for services, it withholds 3% when a single payment is
 * ฿1,000 or more, files ภ.ง.ด.3 and gives the payee a 50 ทวิ certificate.
 * An individual payer generally does not withhold. This is therefore an on/off
 * setting (meta/settings.withholding_enabled), OFF by default — confirm with an
 * accountant before turning it on.
 */
export const WITHHOLDING_RATE = 0.03;
export const WITHHOLDING_THRESHOLD = 1000;

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface PayBreakdown {
  gross: number;
  withholding: number;
  net: number;
}

export function payBreakdown(gross: number, withholdingEnabled: boolean): PayBreakdown {
  const g = round2(gross);
  const withholding = withholdingEnabled && g >= WITHHOLDING_THRESHOLD ? round2(g * WITHHOLDING_RATE) : 0;
  return { gross: g, withholding, net: round2(g - withholding) };
}
