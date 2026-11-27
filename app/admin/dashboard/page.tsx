"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminPasswordForm from "@/components/AdminPasswordForm";
import PageShell from "@/components/PageShell";
import { ApiError, requestJSON } from "@/lib/client-api";
import { FIELD_GROUPS } from "@/lib/survey-schema";
import type {
  Participant,
  RoundRecord,
  SurveySession,
} from "@/lib/survey-schema";
type Row = Partial<SurveySession> & {
  id: string;
  participant: Participant;
  record_count?: number;
  answer_count?: number;
  last_saved_at?: string;
};
type Listing = { rows: Row[]; total: number };
type Detail = {
  participant: Participant;
  rounds: RoundRecord[];
  source: string;
};
const dateLabel = (value?: string) =>
  value
    ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
    : "—";
export default function AdminDashboard() {
  const router = useRouter();
  const [source, setSource] = useState("legacy"),
    [years, setYears] = useState("all");
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1);
  const [listing, setListing] = useState<Listing>({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  const [exporting, setExporting] = useState(""),
    [detail, setDetail] = useState<Detail | null>(null);
  const [actionError, setActionError] = useState("");
  const [selectedRound, setSelectedRound] = useState("");
  const [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    detailRequest = useRef(0);
  const params = new URLSearchParams({
    source,
    years,
    search: query,
    page: String(page),
  }).toString();
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await requestJSON<Listing>(
          `/api/admin/responses?${params}`,
        );
        if (active) setListing(data);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "불러오지 못했습니다.");
          if (e instanceof ApiError && e.status === 401)
            router.replace("/admin");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [params, refresh, router]);
  async function openDetail(row: Row) {
    const request = ++detailRequest.current;
    setDetail(null);
    setSelectedRound("");
    setDetailError("");
    setDetailLoading(true);
    dialog.current?.showModal();
    try {
      const result = await requestJSON<Detail>(
        `/api/admin/responses?source=${source}&id=${encodeURIComponent(row.id)}`,
      );
      if (request === detailRequest.current) setDetail(result);
    } catch (e) {
      if (request === detailRequest.current)
        setDetailError(
          e instanceof Error ? e.message : "상세 응답을 불러오지 못했습니다.",
        );
    } finally {
      if (request === detailRequest.current) setDetailLoading(false);
    }
  }
  async function download(kind: string) {
    if (exporting) return;
    setExporting(kind);
    setActionError("");
    try {
      const response = await fetch(`/api/admin/export?${params}&kind=${kind}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const body = await response.json();
        throw new ApiError(
          body.error || "내보내기에 실패했습니다.",
          response.status,
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = `survey-${source}-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setActionError(
        e instanceof Error
          ? e.message
          : "파일을 내려받지 못했습니다. 다시 시도해주세요.",
      );
      if (e instanceof ApiError && e.status === 401) router.replace("/admin");
    } finally {
      setExporting("");
    }
  }
  async function logout() {
    setActionError("");
    setLoggingOut(true);
    try {
      await requestJSON("/api/admin/logout", { method: "POST" });
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "로그아웃하지 못했습니다.");
    } finally {
      setLoggingOut(false);
    }
  }
  const pages = Math.max(1, Math.ceil(listing.total / 30));
  const availableRounds = [...new Set(detail?.rounds.map((round) => round.round))].sort((a, b) => a - b);
  const visibleRounds = detail?.rounds.filter((round) => !selectedRound || String(round.round) === selectedRound);
  return (
    <PageShell admin>
      <header className="page-heading">
        <div>
          <h1>설문 응답 관리</h1>
        </div>
        <button
          className="button secondary"
          disabled={loggingOut}
          onClick={() => void logout()}
        >
          로그아웃
        </button>
      </header>
      <section className="panel admin-toolbar" aria-label="설문 선택 및 검색">
        <div className="source-tabs" role="group" aria-label="설문 데이터 구분">
          {[
            ["legacy", "기존 응답"],
            ["v2", "새 설문"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={source === value}
              className={source === value ? "selected" : ""}
              onClick={() => {
                setSource(value);
                setActionError("");
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <form
          className="filter-form"
          role="search"
          aria-label="참여자 검색"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
            setPage(1);
          }}
        >
          <div className="field">
            <label htmlFor="years-filter">근속기간</label>
            <select
              id="years-filter"
              value={years}
              onChange={(e) => {
                setYears(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">전체</option>
              <option value="under10">10년 미만</option>
              <option value="10to20">10년 이상 ~ 20년 미만</option>
              <option value="20to30">20년 이상 ~ 30년 미만</option>
              <option value="over30">30년 이상</option>
            </select>
          </div>
          <div className="field search-field">
            <label htmlFor="search">이름·사번 검색</label>
            <input
              id="search"
              type="search"
              value={search}
              maxLength={60}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 또는 사번"
            />
          </div>
          <button className="button primary" type="submit">
            검색
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setSearch("");
              setQuery("");
              setYears("all");
              setPage(1);
            }}
          >
            초기화
          </button>
        </form>
        <div className="export-bar">
          <p className="small muted">
            현재 검색 조건에 해당하는 모든 페이지를 내보냅니다.
            {source === "legacy" && " 참여자 정보는 사람별 1행입니다."}
          </p>
          <div className="action-buttons">
            <button
              className="button secondary"
              disabled={Boolean(exporting) || loading || Boolean(error)}
              onClick={() => void download("answers")}
            >
              {exporting === "answers" ? "내보내는 중…" : "응답·조건 CSV"}
            </button>
            <button
              className="button secondary"
              disabled={Boolean(exporting) || loading || Boolean(error)}
              onClick={() => void download("participants")}
            >
              {exporting === "participants"
                ? "내보내는 중…"
                : "참여자 정보 CSV"}
            </button>
          </div>
        </div>
        {actionError && <p className="alert error" role="alert">{actionError}</p>}
      </section>
      {error && (
        <div className="alert error" role="alert">
          {error}
          <button onClick={() => setRefresh((value) => value + 1)}>
            다시 불러오기
          </button>
        </div>
      )}
      <section className="panel results-panel" aria-labelledby="response-list-title" aria-busy={loading}>
        <div className="section-heading">
          <h2 id="response-list-title">{source === "legacy" ? "참여자별 응답 현황" : "설문별 진행 현황"}</h2>
          <span className="tag" role="status">
            {loading ? "확인 중" : error ? "조회 실패" : `${listing.total.toLocaleString()}${source === "legacy" ? "개 참여자 기록" : "건"}`}
          </span>
        </div>
        {source === "legacy" && (
          <details className="grouping-help">
            <summary>참여자 집계 기준</summary>
            <p>사번·이름·생년월일이 같은 기록을 한 사람으로 묶습니다. 식별 정보가 다르거나 누락된 기록은 별도로 표시합니다. 참여자 정보는 가장 최근 기록이며, 상세 보기에는 반복 저장된 회차도 포함됩니다.</p>
          </details>
        )}
        {loading ? (
          <div className="empty-state" role="status">
            응답을 불러오고 있습니다.
          </div>
        ) : error ? null : listing.rows.length === 0 ? (
          <div className="empty-state">
            검색 조건에 해당하는 응답이 없습니다.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="response-table" role="table">
              <caption className="sr-only">
                {source === "legacy" ? "기존 참여자별 응답" : "새 설문 진행 현황"}
              </caption>
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader">참여자</th>
                  <th scope="col" role="columnheader">소속·직무</th>
                  <th scope="col" role="columnheader">근속기간</th>
                  <th scope="col" role="columnheader">{source === "legacy" ? "저장 기록·응답" : "저장 현황"}</th>
                  <th scope="col" role="columnheader">{source === "legacy" ? "최근 응답 일시 (한국)" : "시작 일시 (한국)"}</th>
                  <th scope="col" role="columnheader">상세</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {listing.rows.map((row) => (
                  <tr key={row.id} role="row">
                    <td role="cell" className="person-cell">
                      <strong>{row.participant.name || "—"}</strong>
                      <small>{row.participant.employeeId || "—"}</small>
                    </td>
                    <td role="cell">
                      <span className="mobile-label" aria-hidden="true">소속·직무</span>
                      {row.participant.affiliation || "—"}
                      <small>{row.participant.job}</small>
                    </td>
                    <td role="cell">
                      <span className="mobile-label" aria-hidden="true">근속기간</span>
                      {row.participant.years ? `${row.participant.years}년` : "—"}
                    </td>
                    <td role="cell">
                      <span className="mobile-label" aria-hidden="true">저장 현황</span>
                      {source === "legacy" ? (
                        <><strong>회차 기록 {row.record_count?.toLocaleString()}건</strong><small>PSF 응답 {row.answer_count?.toLocaleString()}개</small></>
                      ) : (
                        <>
                          <strong>
                            {row.completed_rounds} / {row.total_rounds}회
                          </strong>
                          <small>
                            {row.abandoned_at
                              ? "중단"
                              : row.completed_at
                                ? "완료"
                                : "진행 중"}
                          </small>
                        </>
                      )}
                    </td>
                    <td role="cell" className="date-cell">
                      <span className="mobile-label" aria-hidden="true">{source === "legacy" ? "최근 응답 (한국)" : "시작 일시 (한국)"}</span>
                      {dateLabel(source === "legacy" ? row.last_saved_at : row.created_at)}
                    </td>
                    <td role="cell" className="detail-cell">
                      <button
                        className="button compact secondary"
                        onClick={() => void openDetail(row)}
                        aria-label={`${row.participant.name || "참여자"} 응답 상세 보기`}
                      >
                        상세 보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <nav className="pagination" aria-label="응답 목록 페이지">
          <button
            className="button secondary"
            disabled={loading || page <= 1}
            onClick={() => setPage(page - 1)}
          >
            이전
          </button>
          <span>
            {page} / {pages}
          </span>
          <button
            className="button secondary"
            disabled={loading || page >= pages}
            onClick={() => setPage(page + 1)}
          >
            다음
          </button>
        </nav>
      </section>
      <AdminPasswordForm />
      <dialog
        ref={dialog}
        className="app-dialog detail-dialog"
        aria-labelledby="detail-title"
      >
        <div className="section-heading">
          <h2 id="detail-title">{detail?.participant.name ? `${detail.participant.name} · 응답 상세` : "참여자와 응답 상세"}</h2>
          <button
            className="button secondary compact"
            onClick={() => dialog.current?.close()}
          >
            닫기
          </button>
        </div>
        {detailLoading && <p role="status">상세 응답을 불러오고 있습니다.</p>}
        {detailError && (
          <div className="alert error" role="alert">
            {detailError}
          </div>
        )}
        {detail && (
          <>
            <details className="participant-details">
              <summary>참여자 정보 · {detail.participant.name}</summary>
              <dl className="conditions">
                {FIELD_GROUPS.flatMap((group) =>
                  group.fields.map((field) => (
                    <div key={field.key}>
                      <dt>{field.label}</dt>
                      <dd>{detail.participant[field.key] || "—"}</dd>
                    </div>
                  )),
                )}
              </dl>
            </details>
            <h3 className="detail-rounds-heading">
              저장된 회차 기록 {detail.rounds.length}건
            </h3>
            {availableRounds.length > 1 && (
              <div className="round-filter field">
                <label htmlFor="detail-round">회차 선택</label>
                <select id="detail-round" value={selectedRound} onChange={(e) => setSelectedRound(e.target.value)}>
                  <option value="">전체 회차</option>
                  {availableRounds.map((round) => <option value={round} key={round}>{round}회차</option>)}
                </select>
              </div>
            )}
            {visibleRounds?.map((round) => (
              <details key={round.id || round.round} className="round-details">
                <summary>
                  {round.round}회차{" "}
                  <span className="muted small">
                    {dateLabel(round.saved_at)}
                  </span>
                </summary>
                {(round.questions || []).map((question) => (
                  <section className="detail-question" key={question.id}>
                    <h4>
                      PSF {question.id} · {question.psf}{" "}
                      <span className="tag">{question.answer}</span>
                    </h4>
                    <dl className="conditions">
                      {Object.entries(question.conditions || {}).map(
                        ([label, text]) => (
                          <div key={label}>
                            <dt>{label}</dt>
                            <dd>{text}</dd>
                          </div>
                        ),
                      )}
                    </dl>
                  </section>
                ))}
              </details>
            ))}
          </>
        )}
      </dialog>
    </PageShell>
  );
}
