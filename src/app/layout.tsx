import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const font = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Worklist Management",
  description: "ระบบติดตามและตรวจสอบงานที่มอบหมาย",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#D32F2F",
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
