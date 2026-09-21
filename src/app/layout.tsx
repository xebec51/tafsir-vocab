import type { Metadata, Viewport } from "next";
import { Amiri_Quran } from "next/font/google";
import AppHeader from "@/components/AppHeader";
import "./globals.css";

const arabicFont = Amiri_Quran({
  subsets: ["arabic"],
  weight: "400",
  variable: "--font-arabic-quran",
  display: "swap"
});

export const metadata: Metadata = {
  title: { default: "TafsirVocab", template: "%s | TafsirVocab" },
  description: "Qur'anic vocabulary training for English Tafsir."
};

export const viewport: Viewport = {
  themeColor: "#f1f4f1",
  colorScheme: "light"
};

export const preferredRegion = "sin1";

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={arabicFont.variable}>
      <body><AppHeader />{children}</body>
    </html>
  );
}
