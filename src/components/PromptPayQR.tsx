"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Loader2 } from "lucide-react";
import { formatBaht, formatPromptPayId, promptPayPayload } from "@/lib/promptpay";

/** PromptPay QR with the amount pre-filled; scanned by any Thai banking app. */
export function PromptPayQR({ promptpayId, amount, name }: { promptpayId: string; amount: number; name: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setError(null);
    try {
      const payload = promptPayPayload(promptpayId, amount);
      QRCode.toDataURL(payload, { width: 560, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b1a2a", light: "#ffffff" } })
        .then((url) => !cancelled && setSrc(url))
        .catch((e: Error) => !cancelled && setError(e.message));
    } catch (e) {
      setError((e as Error).message);
    }
    return () => {
      cancelled = true;
    };
  }, [promptpayId, amount]);

  return (
    <div className="mx-auto w-full max-w-[18rem] overflow-hidden rounded-xl bg-white ring-1 ring-gray-200">
      <div className="bg-brand-600 px-4 py-2.5 text-center text-sm font-medium text-white">สแกนจ่ายด้วยแอปธนาคาร · พร้อมเพย์</div>
      <div className="flex aspect-square items-center justify-center p-4">
        {error ? (
          <p className="text-center text-sm text-red-600">{error}</p>
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`QR พร้อมเพย์ ${formatBaht(amount)} ให้ ${name}`} className="h-full w-full" />
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        )}
      </div>
      <div className="border-t border-gray-100 px-4 py-3 text-center">
        <p className="text-2xl font-semibold text-gray-900">{formatBaht(amount)}</p>
        <p className="mt-0.5 text-xs text-gray-500">
          {name} · {formatPromptPayId(promptpayId)}
        </p>
      </div>
    </div>
  );
}
