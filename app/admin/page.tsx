"use client";
import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import { requestJSON } from "@/lib/client-api";
export default function AdminLoginPage() {
  return <Suspense fallback={<p role="status">로그인 화면을 불러오는 중…</p>}><AdminLoginForm /></Suspense>;
}
function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false);
  const changed = useSearchParams().get("passwordChanged") === "1";
  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await requestJSON("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      setPassword("");
      router.replace("/admin/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인하지 못했습니다.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <PageShell admin>
      <section className="panel login-panel">
        <p className="eyebrow">RESEARCH ADMIN</p>
        <h1>응답 관리 로그인</h1>
        <p className="muted">등록된 관리자 계정으로 로그인해주세요.</p>
        {changed && <p className="alert info" role="status">비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.</p>}
        <form onSubmit={login}>
          <div className="field">
            <label htmlFor="username">아이디</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <div className="field">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <button className="button primary" disabled={busy} type="submit">
            {busy ? "확인 중…" : "로그인"}
          </button>
        </form>
        <p className="small muted">
          계정 등록과 권한 부여는 연구 관리자에게 문의해주세요.
        </p>
      </section>
    </PageShell>
  );
}
