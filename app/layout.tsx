import type { Metadata } from "next";
import "./globals.css";
import "./merged.css";

export const metadata: Metadata = {
  title: "贵客万象",
  description: "启境、随逛、个人与广场合为一程的贵州旅行体验。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
