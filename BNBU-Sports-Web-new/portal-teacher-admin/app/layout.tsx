import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./teacher-workspace.css";
import "./admin-workspace.css";
import "./typography.css";
import { ScrollbarManager } from "./scrollbar-manager";
import "./app-select.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title: "BNBU 体育课程管理平台",
    description: "教师与管理员统一入口，按身份进入清晰、专注的职责工作台。",
    openGraph: {
      title: "BNBU 体育课程管理平台",
      description: "统一入口 · 职责清晰 · 高效协同",
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "BNBU 体育课程管理平台",
      description: "统一入口 · 职责清晰 · 高效协同",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ScrollbarManager />
        {children}
      </body>
    </html>
  );
}
