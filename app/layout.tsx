import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "철도 PSF 종사자 설문",
  description: "철도종사자 인적요인 연구를 위한 작업조건 시나리오 설문",
  formatDetection: { telephone: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
