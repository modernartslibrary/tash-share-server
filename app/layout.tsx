import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TASH",
  description: "창작물을 발견하고 기록하는 공간",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
