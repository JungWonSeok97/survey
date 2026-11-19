import Link from "next/link";
export default function PageShell({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        본문으로 이동
      </a>
      <header className="app-header">
        <div className="header-inner">
          <Link className="brand" href="/survey">
            <span className="brand-symbol" aria-hidden="true">
              R
            </span>
            <span>
              철도 PSF <span className="brand-separator">/</span>
              <span className="brand-caption">
                {admin ? "응답 관리" : "종사자 설문"}
              </span>
            </span>
          </Link>
          <span className="header-caption">철도종사자 인적요인 연구</span>
        </div>
      </header>
      <main id="main-content" className="page-container">
        {children}
      </main>
      <footer className="site-footer">
        <span>철도종사자 인적요인 연구 · PSF 설문</span>
        {!admin && <Link href="/admin">관리자 로그인</Link>}
      </footer>
    </>
  );
}
