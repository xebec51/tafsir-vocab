import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TafsirVocab", template: "%s | TafsirVocab" },
  description: "Qur'anic vocabulary training for English Tafsir."
};

export const viewport: Viewport = {
  themeColor: "#f1f4f1",
  colorScheme: "light"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
