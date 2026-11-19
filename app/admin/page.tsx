"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";
import { requestJSON } from "@/lib/client-api";
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false);
  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await requestJSON("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
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
        <form onSubmit={login}>
          <div className="field">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
