export default function MainPage() {
  const styles = {
    page: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "linear-gradient(135deg, #f5f7ff 0%, #eefbf6 100%)",
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
      color: "#111827",
    },
    card: {
      width: "100%",
      maxWidth: 420,
      background: "rgba(255,255,255,0.9)",
      border: "1px solid rgba(17, 24, 39, 0.08)",
      borderRadius: 18,
      boxShadow: "0 20px 60px rgba(17, 24, 39, 0.12)",
      padding: 24,
      backdropFilter: "blur(10px)",
    },
    title: { margin: 0, fontSize: 28, letterSpacing: "-0.02em" },
    subtitle: { margin: "8px 0 20px", color: "#6b7280", fontSize: 14 },
    field: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 },
    label: { fontSize: 13, fontWeight: 700, color: "#374151" },
    input: {
      padding: "12px 12px",
      borderRadius: 12,
      border: "1px solid rgba(17, 24, 39, 0.12)",
      outline: "none",
      fontSize: 14,
    },
    row: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      margin: "8px 0 16px",
      fontSize: 13,
      color: "#374151",
    },
    link: { color: "#4f46e5", textDecoration: "none", fontWeight: 700 },
    button: {
      width: "100%",
      padding: "12px 14px",
      border: "none",
      borderRadius: 12,
      cursor: "pointer",
      fontWeight: 800,
      color: "white",
      background: "linear-gradient(135deg, #4f46e5 0%, #22c55e 140%)",
      boxShadow: "0 10px 24px rgba(79, 70, 229, 0.22)",
    },
    footer: { marginTop: 14, fontSize: 13, color: "#6b7280" },
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = form.get("email");
    const password = form.get("password");

    // TODO: 여기서 로그인 API 호출하면 됨
    alert(`로그인 시도\nemail: ${email}\npassword: ${"*".repeat(String(password).length)}`);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>로그인</h1>
        <p style={styles.subtitle}>계정 정보로 로그인하세요.</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="email">
              이메일
            </label>
            <input
              style={styles.input}
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              required
              placeholder="name@example.com"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">
              비밀번호
            </label>
            <input
              style={styles.input}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          <div style={styles.row}>
            <label>
              <input type="checkbox" name="remember" value="1" /> 로그인 상태 유지
            </label>
            <a style={styles.link} href="/forgot-password">
              비밀번호 찾기
            </a>
          </div>

          <button style={styles.button} type="submit">
            로그인
          </button>

          <div style={styles.footer}>
            계정이 없나요? <a style={styles.link} href="/signup">회원가입</a>
          </div>
        </form>
      </div>
    </div>
  );
}
