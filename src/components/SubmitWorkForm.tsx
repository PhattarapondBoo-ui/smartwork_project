"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ImagePlus, Send, X } from "lucide-react";
import { submitWork } from "@/lib/api";
import { errMsg } from "@/lib/format";
import type { AppUser, Task } from "@/lib/types";
import { useToast } from "./toast";
import { Alert, Button, Field, Textarea } from "./ui";

const MAX_FILES = 10;

export function SubmitWorkForm({ task, me }: { task: Task; me: AppUser }) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Free preview object URLs when unmounting.
  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const images = Array.from(list).filter((f) => f.type.startsWith("image/") || f.type === "");
    setFiles((prev) => {
      const room = MAX_FILES - prev.length;
      if (images.length > room) setError(`แนบได้สูงสุด ${MAX_FILES} รูป`);
      return [...prev, ...images.slice(0, Math.max(0, room)).map((file) => ({ file, url: URL.createObjectURL(file) }))];
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAt = (i: number) =>
    setFiles((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (files.length === 0 && !note.trim()) return setError("กรุณาแนบรูปภาพหรือเพิ่มหมายเหตุอย่างน้อย 1 อย่าง");
    setSubmitting(true);
    try {
      await submitWork(task, me, note, files.map((f) => f.file), (done, total) =>
        setProgress(`กำลังเตรียมรูป ${done}/${total}`),
      );
      files.forEach((f) => URL.revokeObjectURL(f.url));
      setFiles([]);
      setNote("");
      toast.success("ส่งงานเรียบร้อย รอตรวจสอบ");
    } catch (err) {
      // The form can unmount while saving (the task briefly shows "pending review"
      // before the server answers), so report failures through the global toast too.
      console.error("submitWork failed", err);
      const msg = `ส่งงานไม่สำเร็จ: ${errMsg(err)}`;
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert kind="error">{error}</Alert>}

      <div>
        <span className="mb-2 block text-[13px] font-medium text-gray-600">
          รูปภาพผลงาน <span className="font-normal text-gray-400">({files.length}/{MAX_FILES})</span>
        </span>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {files.map((f, i) => (
            <div key={f.url} className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={`รูปที่ ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                aria-label="ลบรูป"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {files.length < MAX_FILES && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 text-brand-700 transition hover:border-brand-300 hover:bg-brand-50"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs">เพิ่มรูป</span>
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      <Field label="หมายเหตุ">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="รายละเอียดการทำงาน ปัญหาที่พบ ฯลฯ" />
      </Field>

      <Button type="submit" loading={submitting} className="w-full sm:w-auto">
        <Send className="h-4 w-4" />
        {progress ?? "ส่งงาน"}
      </Button>
    </form>
  );
}
