import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TafsirVocab",
  description: "Qur'anic vocabulary training for English Tafsir."
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
