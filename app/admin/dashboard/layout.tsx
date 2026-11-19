import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/server";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
  } catch {
    redirect("/admin");
  }
  return children;
}
