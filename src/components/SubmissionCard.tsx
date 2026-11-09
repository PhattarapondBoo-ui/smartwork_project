import { fmtTs } from "@/lib/format";
import type { Submission } from "@/lib/types";
import { cn } from "./ui";

const REVIEW = {
  pending: { label: "รอตรวจสอบ", cls: "bg-orange-50 text-orange-700 ring-orange-200" },
  approved: { label: "อนุมัติ", cls: "bg-green-50 text-green-700 ring-green-200" },
  rejected: { label: "ส่งกลับแก้ไข", cls: "bg-red-50 text-red-700 ring-red-200" },
};

export function SubmissionCard({ sub, index }: { sub: Submission; index: number }) {
  const r = REVIEW[sub.review_status];
  return (
    <div className="rounded-lg border border-gray-200 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-semibold text-gray-900">ครั้งที่ {index}</span>
          <span className="text-gray-500"> · {sub.user_name} · {fmtTs(sub.submitted_at)}</span>
        </div>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", r.cls)}>{r.label}</span>
      </div>

      {sub.note && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{sub.note}</p>}

      {sub.image_urls.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {sub.image_urls.map((url, i) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`รูปที่ ${i + 1}`} loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
            </a>
          ))}
        </div>
      )}

      {sub.review_status !== "pending" && (
        <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
          ตรวจโดย {sub.reviewed_by_name ?? "-"} · {fmtTs(sub.reviewed_at)}
          {sub.review_note && <div className="mt-1 whitespace-pre-wrap text-gray-800">“{sub.review_note}”</div>}
        </div>
      )}
    </div>
  );
}
