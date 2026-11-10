"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getSubmissionImages } from "@/lib/api";
import { errMsg, fmtTs } from "@/lib/format";
import type { Submission } from "@/lib/types";
import { Modal, cn } from "./ui";

const REVIEW = {
  pending: { label: "รอตรวจสอบ", cls: "bg-orange-50 text-orange-700 ring-orange-200" },
  approved: { label: "อนุมัติ", cls: "bg-green-50 text-green-700 ring-green-200" },
  rejected: { label: "ส่งกลับแก้ไข", cls: "bg-red-50 text-red-700 ring-red-200" },
};

export function SubmissionCard({ sub, index }: { sub: Submission; index: number }) {
  const r = REVIEW[sub.review_status];
  const purged = !!sub.images_deleted_at;
  const count = purged ? 0 : sub.image_count ?? 0;
  const [images, setImages] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);

  useEffect(() => {
    if (count === 0) return;
    let cancelled = false;
    getSubmissionImages(sub.task_id, sub.id)
      .then((imgs) => !cancelled && setImages(imgs))
      .catch((e) => !cancelled && setLoadError(errMsg(e)));
    return () => {
      cancelled = true;
    };
  }, [sub.task_id, sub.id, count]);

  const step = (d: number) =>
    setViewing((v) => (v === null || !images ? v : (v + d + images.length) % images.length));

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

      {purged && (
        <p className="mt-3 rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500">
          รูป {sub.image_count} รูปถูกลบอัตโนมัติเมื่อ {fmtTs(sub.images_deleted_at)} (ระบบเก็บรูปไว้ 60 วัน)
        </p>
      )}

      {count > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {loadError && <p className="col-span-full text-sm text-red-600">โหลดรูปไม่ได้: {loadError}</p>}
          {!loadError &&
            (images ?? Array.from({ length: count }, () => "")).map((src, i) =>
              src ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => setViewing(i)}
                  className="block aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`รูปที่ ${i + 1}`} className="h-full w-full object-cover transition hover:scale-105" />
                </button>
              ) : (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-gray-200" />
              ),
            )}
        </div>
      )}

      {sub.review_status !== "pending" && (
        <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
          ตรวจโดย {sub.reviewed_by_name ?? "-"} · {fmtTs(sub.reviewed_at)}
          {sub.review_note && <div className="mt-1 whitespace-pre-wrap text-gray-800">“{sub.review_note}”</div>}
        </div>
      )}

      {images && viewing !== null && (
        <Modal open onClose={() => setViewing(null)} title={`รูปที่ ${viewing + 1} / ${images.length}`}>
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[viewing]} alt={`รูปที่ ${viewing + 1}`} className="max-h-[70vh] w-full rounded-lg object-contain" />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"
                  aria-label="รูปก่อนหน้า"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"
                  aria-label="รูปถัดไป"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          <a
            href={images[viewing]}
            download={`submission-${index}-${viewing + 1}.jpg`}
            className="mt-3 inline-block text-sm font-medium text-brand-700 underline"
          >
            ดาวน์โหลดรูปนี้
          </a>
        </Modal>
      )}
    </div>
  );
}
