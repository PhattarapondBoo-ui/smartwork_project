/**
 * PromptPay "Thai QR Payment" payload (EMVCo merchant-presented QR).
 *
 * The app only BUILDS the QR text; the transfer itself happens in the payer's
 * own banking app after scanning. No money ever passes through Clean Dee.
 *
 * Supported PromptPay IDs:
 *   - mobile number:   10 digits starting with 0 (e.g. 0812345678)
 *   - national/tax ID: 13 digits
 *   - e-wallet ID:     15 digits
 */

const AID_PROMPTPAY = "A000000677010111";

function field(id: string, value: string) {
  return id + String(value.length).padStart(2, "0") + value;
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as required by EMVCo tag 63. */
function crc16(data: string) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Keep digits only. */
export function normalizePromptPayId(raw: string) {
  return raw.replace(/\D/g, "");
}

/** Returns an error message, or null if the ID looks valid. */
export function validatePromptPayId(raw: string): string | null {
  const id = normalizePromptPayId(raw);
  if (!id) return "กรุณากรอกพร้อมเพย์";
  if (id.length === 10 && id.startsWith("0")) return null;
  if (id.length === 13 || id.length === 15) return null;
  return "พร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก";
}

/** Human-friendly display, e.g. 081-234-5678 or 1-2345-67890-12-3. */
export function formatPromptPayId(raw: string | undefined | null) {
  const id = normalizePromptPayId(raw ?? "");
  if (id.length === 10) return `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}`;
  if (id.length === 13) return `${id[0]}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10, 12)}-${id[12]}`;
  return id;
}

/** Build the PromptPay QR text for `id` and an optional `amount` in baht. */
export function promptPayPayload(rawId: string, amount?: number) {
  const id = normalizePromptPayId(rawId);
  let account: string;
  if (id.length === 10 && id.startsWith("0")) {
    account = field("01", "0066" + id.slice(1)); // mobile → 0066 + 9 digits
  } else if (id.length === 13) {
    account = field("02", id); // national ID / tax ID
  } else if (id.length === 15) {
    account = field("03", id); // e-wallet
  } else {
    throw new Error("รูปแบบพร้อมเพย์ไม่ถูกต้อง");
  }

  const hasAmount = typeof amount === "number" && amount > 0;
  const body =
    field("00", "01") +
    field("01", hasAmount ? "12" : "11") + // 12 = one-time (has amount), 11 = reusable
    field("29", field("00", AID_PROMPTPAY) + account) +
    field("53", "764") + // THB
    (hasAmount ? field("54", amount!.toFixed(2)) : "") +
    field("58", "TH") +
    "6304";
  return body + crc16(body);
}

export function formatBaht(n: number) {
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
