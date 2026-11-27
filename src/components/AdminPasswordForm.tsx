"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { requestJSON } from "@/lib/client-api";

export default function AdminPasswordForm() {
  const router = useRouter();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  async function change(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    setError("");
    if (newPassword !== confirm) { setError("새 비밀번호가 서로 다릅니다."); return; }
    pending.current = true;
    setBusy(true);
    try {
      await requestJSON("/api/admin/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      setCurrent(""); setNew(""); setConfirm("");
      router.replace("/admin?passwordChanged=1");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "비밀번호를 변경하지 못했습니다."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <details className="panel account-settings">
    <summary>관리자 비밀번호 변경</summary>
    <p className="small muted">12자 이상으로 설정해주세요. 변경하면 모든 기기에서 로그아웃되며 새 비밀번호로 다시 로그인합니다.</p>
    <form onSubmit={change}>
      <div className="field"><label htmlFor="current-password">현재 비밀번호</label><input id="current-password" type="password" autoComplete="current-password" required maxLength={256} value={currentPassword} onChange={e => setCurrent(e.target.value)} disabled={busy} /></div>
      <div className="field"><label htmlFor="new-password">새 비밀번호</label><input id="new-password" type="password" autoComplete="new-password" required minLength={12} maxLength={256} value={newPassword} onChange={e => setNew(e.target.value)} disabled={busy} /></div>
      <div className="field"><label htmlFor="confirm-password">새 비밀번호 확인</label><input id="confirm-password" type="password" autoComplete="new-password" required minLength={12} maxLength={256} value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy} /></div>
      {error && <div className="alert error" role="alert">{error}</div>}
      <button className="button secondary" type="submit" disabled={busy}>{busy ? "변경 중…" : "비밀번호 변경 후 다시 로그인"}</button>
    </form>
  </details>;
}
