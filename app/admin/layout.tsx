import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./admin.css";

export const metadata: Metadata = { title: "설문 응답 관리 · 철도 PSF" };

export default function AdminArea({ children }: { children: ReactNode }) {
  return <div className="admin-workspace">{children}</div>;
}
