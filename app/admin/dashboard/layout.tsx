import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, HttpError, logServerError, verifyAdminToken } from "@/lib/server";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  try {
    await verifyAdminToken(token);
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/admin");
    const requestId = logServerError(error, "admin.dashboard.auth");
    return <main role="alert"><h1>관리자 연결을 확인할 수 없습니다</h1>
      <p>잠시 후 다시 시도해주세요. 문의 번호 {requestId}</p>
      <a href="/admin/dashboard">다시 시도</a></main>;
  }
  return children;
}
