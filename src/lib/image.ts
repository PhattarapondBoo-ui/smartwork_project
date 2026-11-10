/**
 * Photos are stored inside Firestore as JPEG data URLs (one image per document).
 * A Firestore document can hold at most 1 MiB, so every image is shrunk in the
 * browser until its data URL fits comfortably under MAX_DATA_URL_CHARS.
 */
export const MAX_DATA_URL_CHARS = 700_000; // ≈ 500 KB of JPEG once base64-encoded

const QUALITIES = [0.8, 0.7, 0.6, 0.5];

export async function compressToDataUrl(file: File, maxDim = 1280): Promise<string> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    throw new Error(`เปิดไฟล์รูป "${file.name}" ไม่ได้ กรุณาใช้ไฟล์ JPG หรือ PNG`);
  }
  try {
    let dim = maxDim;
    // Lower quality first, then resolution, until it fits.
    for (let attempt = 0; attempt < 4; attempt++) {
      const scale = Math.min(1, dim / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bmp.width * scale));
      canvas.height = Math.max(1, Math.round(bmp.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("เบราว์เซอร์นี้ไม่รองรับการย่อรูป");
      ctx.fillStyle = "#ffffff"; // transparent PNG areas become white, not black
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      for (const q of QUALITIES) {
        const url = canvas.toDataURL("image/jpeg", q);
        if (url.length <= MAX_DATA_URL_CHARS) return url;
      }
      dim = Math.round(dim * 0.75);
    }
    throw new Error(`รูป "${file.name}" มีขนาดใหญ่เกินไป`);
  } finally {
    bmp.close();
  }
}
