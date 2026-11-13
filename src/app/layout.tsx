import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// Kanit: a clean, confident loopless Thai typeface (the style seen on many
// professional Thai service sites) — friendly but trustworthy.
const font = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-brand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Clean Dee",
  description: "Clean Dee — ระบบจัดการและตรวจงานทำความสะอาด",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={font.variable}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
