"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import PageShell from "./PageShell";
import MultipleChoiceQuestion from "./MultipleChoiceQuestion";
import ClockField from "./ClockField";
import { SURVEY_DATA } from "@/lib/surveyData";
import {
  FIELD_GROUPS,
  entryLimits,
  isMeasurement,
  MEASUREMENT_UNKNOWN,
  JOBS,
  supportedVersion,
  TOTAL_ROUNDS,
  validateParticipant,
  validateQuestionIds,
  ValidationError,
} from "@/lib/survey-schema";
import type { Participant, SurveySession } from "@/lib/survey-schema";
import { ApiError, requestJSON } from "@/lib/client-api";

type PublicSession = Omit<SurveySession, "participant">;
type SessionReply = {
  success: true;
  session: PublicSession | null;
  savedRound?: number;
};
const emptyProfile = () =>
  Object.fromEntries(
    FIELD_GROUPS.flatMap((group) =>
      group.fields.map((field) => [field.key, ""]),
    ),
  );
const draftKey = (session: PublicSession) =>
  `rail-answers:${session.id}:${session.completed_rounds + 1}`;

export default function SurveyForm({
  questionIds,
}: {
  questionIds: [number, number];
}) {
  const fixedIds = questionIds.join(",");
  const [session, setSession] = useState<PublicSession | null>(null);
  const [profile, setProfile] = useState<Participant>(emptyProfile);
  const [profileStep, setProfileStep] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [roundView, setRoundView] = useState<"questions" | "saved" | "paused">("questions");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [booting, setBooting] = useState(true),
    [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [errorField, setErrorField] = useState("");
  const [notice, setNotice] = useState("");
  const saving = useRef(false),
    resetDialog = useRef<HTMLDialogElement>(null);
  const applySession = useCallback((next: PublicSession | null) => {
    setSession(next);
    setRoundView("questions");
    setQuestionIndex(0);
    setAnswers({});
    setError("");
    setErrorField("");
    setNotice("");
    if (next) {
      try {
        const draft = JSON.parse(
          sessionStorage.getItem(draftKey(next)) || "{}",
        );
        const accepted: Record<string, string> = {};
        for (const q of next.pending_questions)
          if (q.options.some((option) => option.code === draft[q.id]))
            accepted[q.id] = draft[q.id];
        setAnswers(accepted);
        if (Object.keys(accepted).length) {
          const firstMissing = next.pending_questions.findIndex((q) => !accepted[q.id]);
          setQuestionIndex(firstMissing >= 0 ? firstMissing : next.pending_questions.length - 1);
          setNotice("이 탭에서 선택한 답변을 복구했습니다. 두 문항을 확인한 뒤 이번 회차를 저장해주세요.");
        }
      } catch {
        /* A local answer draft is optional; saved rounds are authoritative. */
      }
    }
  }, []);
  const load = useCallback(async () => {
    try {
      const data = await requestJSON<SessionReply>(
        `/api/survey/session?ids=${fixedIds}`,
      );
      applySession(data.session);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "진행 내용을 불러오지 못했습니다.",
      );
      setLoadFailed(true);
    } finally {
      setBooting(false);
    }
  }, [fixedIds, applySession]);
  useEffect(() => {
    let active = true;
    requestJSON<SessionReply>(
      `/api/survey/session?ids=${fixedIds}`,
    )
      .then((data) => {
        if (!active) return;
        applySession(data.session);
      })
      .catch((e) => {
        if (active) {
          setError(
            e instanceof Error ? e.message : "진행 내용을 불러오지 못했습니다.",
          );
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (active) setBooting(false);
      });
    return () => {
      active = false;
    };
  }, [fixedIds, applySession]);
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", restore);
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("survey-disconnect");
    if (channel) channel.onmessage = () => window.location.reload();
    return () => {
      channel?.close();
      window.removeEventListener("pageshow", restore);
    };
  }, []);
  function reload() {
    setBooting(true);
    setLoadFailed(false);
    setError("");
    void load();
  }
  function showIssue(e: unknown) {
    setError(e instanceof Error ? e.message : "요청을 처리하지 못했습니다.");
    const field =
      e instanceof ValidationError || e instanceof ApiError
        ? e.field
        : undefined;
    setErrorField(field || "");
    if (field) {
      const index = FIELD_GROUPS.findIndex((group) =>
        group.fields.some((item) => item.key === field),
      );
      if (index >= 0) setProfileStep(index);
      setTimeout(
        () =>
          document
            .getElementById(field === "workTime" ? "work-start-period" : field)
            ?.focus(),
        0,
      );
    }
  }
  function updateProfile(key: string, value: string) {
    setProfile((previous) => ({ ...previous, [key]: value }));
    if (errorField === key) {
      setError("");
      setErrorField("");
    }
  }
  function goToProfileStep(step: number) {
    setProfileStep(step);
    setError("");
    setErrorField("");
    requestAnimationFrame(() => document.getElementById("profile-title")?.focus());
  }
  function focusRoundTitle() {
    requestAnimationFrame(() => document.getElementById("round-title")?.focus());
  }
  async function nextProfile() {
    if (saving.current) return;
    setError("");
    setErrorField("");
    try {
      validateQuestionIds(questionIds);
      validateParticipant(
        profile,
        FIELD_GROUPS[profileStep].fields.map((field) => field.key),
      );
      if (profileStep < FIELD_GROUPS.length - 1) {
        goToProfileStep(profileStep + 1);
        return;
      }
      const participant = validateParticipant(profile);
      saving.current = true;
      setBusy(true);
      const data = await requestJSON<SessionReply>("/api/survey/session", {
        method: "POST",
        body: JSON.stringify({ participant, questionIds }),
      });
      applySession(data.session);
      setNotice("");
      focusRoundTitle();
    } catch (e) {
      showIssue(e);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function choose(questionId: number, code: string) {
    const next = { ...answers, [questionId]: code };
    setAnswers(next);
    setError("");
    setNotice("");
    if (session)
      try {
        sessionStorage.setItem(draftKey(session), JSON.stringify(next));
      } catch {
        /* Not required for server-side resume. */
      }
  }
  function moveQuestion(index: number) {
    setQuestionIndex(index);
    setError("");
    requestAnimationFrame(() => {
      const element = document.getElementById("question-area");
      element?.focus({ preventScroll: true });
      element?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }
  async function saveRound() {
    if (!session || saving.current) return;
    const missing = session.pending_questions.findIndex((q) => !answers[q.id]);
    if (missing >= 0) {
      moveQuestion(missing);
      setError("두 문항에 모두 응답해주세요.");
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await requestJSON<SessionReply>("/api/survey", {
        method: "POST",
        body: JSON.stringify({
          sessionId: session.id,
          round: session.completed_rounds + 1,
          answers: session.pending_questions.map((q) => ({
            questionId: q.id,
            answerCode: answers[q.id],
          })),
        }),
      });
      try {
        sessionStorage.removeItem(draftKey(session));
      } catch {
        /* Optional local draft. */
      }
      applySession(result.session);
      setNotice("");
      if (!result.session?.completed_at) setRoundView("saved");
      focusRoundTitle();
    } catch (e) {
      showIssue(e);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function startOver(disconnect: boolean) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      if (session && (disconnect || !session.completed_at))
        await requestJSON("/api/survey/session", {
          method: "DELETE",
          body: JSON.stringify({ sessionId: session.id, disconnect }),
        });
      if (session)
        try {
          sessionStorage.removeItem(draftKey(session));
        } catch {
          /* Optional local draft. */
        }
      if (disconnect) {
        try {
          for (const key of Object.keys(sessionStorage))
            if (key.startsWith("rail-answers:")) sessionStorage.removeItem(key);
        } catch { /* The owner cookie has already been cleared. */ }
        if (typeof BroadcastChannel !== "undefined") {
          const channel = new BroadcastChannel("survey-disconnect");
          channel.postMessage("disconnect");
          channel.close();
        }
        window.location.replace(window.location.pathname);
        return;
      }
      resetDialog.current?.close();
      setSession(null);
      setAnswers({});
      setProfileStep(0);
      setError("");
      setNotice("새 설문을 시작합니다. 기본정보를 확인해주세요.");
    } catch (e) {
      showIssue(e);
      resetDialog.current?.close();
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const currentGroup = FIELD_GROUPS[profileStep];
  const complete = Boolean(session?.completed_at);
  const currentQuestion = session?.pending_questions[questionIndex];
  const errors = error && (
    <div className="alert error" role="alert">
      <span>{error}</span>
      {!loadFailed && !errorField && (
        <button type="button" onClick={reload} disabled={busy}>
          저장 상태 다시 확인
        </button>
      )}
    </div>
  );
  const [today] = useState(() =>
    new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10),
  );

  return (
    <PageShell brandHref={`/survey/group${(questionIds[0] + 1) / 2}`}>
      <header className="page-heading">
        <div>
          <h1>
            {complete
              ? "설문이 모두 저장되었습니다."
              : session
                ? "작업조건 평가"
                : "철도종사자 작업조건 설문"}
          </h1>
          {!complete && roundView === "questions" && <p>
            {session
              ? "제시된 작업조건을 종합해 본인의 판단에 가장 가까운 수준을 선택해주세요."
              : `총 ${TOTAL_ROUNDS}회 · 회차당 2문항 · 두 문항에 응답한 뒤 회차별로 저장합니다.`}
          </p>}
        </div>
        <span className="version-tag">{(questionIds[0] + 1) / 2}그룹</span>
      </header>
      {booting ? (
        <div className="empty-state" role="status">
          <span className="spinner" />
          저장된 진행 내용을 확인하고 있습니다.
        </div>
      ) : loadFailed ? (
        <div className="panel empty-state">
          {errors}
          <button className="button primary" onClick={reload}>
            다시 불러오기
          </button>
        </div>
      ) : complete ? (
        <section className="panel completion">
          {errors}
          <div className="completion-mark" aria-hidden="true">
            ✓
          </div>
          <h2 id="round-title" tabIndex={-1}>참여해주셔서 감사합니다.</h2>
          <p>30회차 · 총 60개 응답이 서버에 저장되었습니다.</p>
          <p className="muted">
            별도의 메일 전송이나 파일 제출은 필요하지 않습니다.
          </p>
          <div className="completion-tags">
            {session?.question_ids.map((id) => (
              <span className="tag" key={id}>
                PSF {id} · {SURVEY_DATA.find((q) => q.id === id)?.psf}
              </span>
            ))}
          </div>
          <button
            className="button secondary"
            onClick={() => resetDialog.current?.showModal()}
          >
            다른 참여자로 전환
          </button>
        </section>
      ) : session && roundView !== "questions" ? (
        <section className="panel round-checkpoint" aria-labelledby="round-title">
          <h2 id="round-title" tabIndex={-1}>
            {roundView === "paused" ? "설문을 잠시 마쳤습니다." : `${session.completed_rounds}회차까지 저장했습니다.`}
          </h2>
          <p>{roundView === "paused"
            ? `이제 창을 닫아도 됩니다. 같은 기기와 브라우저에서 이 그룹 링크를 열면 ${session.completed_rounds + 1}회차부터 이어집니다.`
            : `총 ${session.total_rounds}회 중 ${session.completed_rounds}회를 마쳤습니다. 지금 쉬었다가 같은 브라우저에서 이어서 작성할 수 있습니다.`}</p>
          <progress value={session.completed_rounds} max={session.total_rounds} aria-label="저장된 회차" />
          <div className="checkpoint-actions">
            <button className="button primary" onClick={() => {
              setRoundView("questions");
              focusRoundTitle();
            }}>
              {session.completed_rounds + 1}회차 {roundView === "paused" ? "이어서 작성" : "계속하기"}
            </button>
            {roundView === "saved" && <button className="button secondary" onClick={() => {
              setRoundView("paused");
              focusRoundTitle();
            }}>잠시 마치기</button>}
          </div>
        </section>
      ) : (
        <div className="survey-layout">
          <aside className="survey-sidebar">
            <div className="panel sidebar-panel">
              <p className="eyebrow">{session ? "응답 진행" : "참여 준비"}</p>
              {session ? (
                <>
                  <div className="progress-number">
                    <strong>{session.completed_rounds}</strong>
                    <span>/ {session.total_rounds}회 저장</span>
                  </div>
                  <progress value={session.completed_rounds} max={session.total_rounds} aria-label="저장된 회차" />
                  <nav className="question-nav" aria-label="이번 회차 문항">
                    {session.pending_questions.map((q, i) => (
                      <button
                        key={q.id}
                        className={questionIndex === i ? "current" : ""}
                        aria-current={questionIndex === i ? "step" : undefined}
                        onClick={() => moveQuestion(i)}
                        disabled={busy}
                      >
                        <span>
                          {i + 1}. {q.psf}
                        </span>
                        <small>{answers[q.id] ? "선택 완료" : "미응답"}</small>
                      </button>
                    ))}
                  </nav>
                  <p className="small muted">
                    회차 저장 후 같은 기기와 브라우저에서 이어서 작성할 수 있습니다.
                  </p>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => resetDialog.current?.showModal()}
                  >
                    다른 참여자로 전환
                  </button>
                </>
              ) : (
                <>
                  <ol className="profile-steps">
                    {FIELD_GROUPS.map((group, i) => (
                      <li
                        key={group.title}
                        aria-current={i === profileStep ? "step" : undefined}
                        className={
                          i === profileStep
                            ? "current"
                            : i < profileStep
                              ? "done"
                              : ""
                        }
                      >
                        <span>{i + 1}</span>
                        {group.title}
                      </li>
                    ))}
                  </ol>
                  <div className="sidebar-note">
                    <strong>응답 안내</strong>
                    <p>
                      정답이 정해져 있지 않습니다. 조건을 종합한 본인의 판단을
                      선택해주세요.
                    </p>
                  </div>
                </>
              )}
            </div>
          </aside>
          <div className="survey-main" aria-busy={busy}>
            {notice && (
              <div className="alert info" role="status">
                {notice}
              </div>
            )}
            {errors}
            {!session ? (
              <>
                {profileStep === 0 && (
                  <section className="panel assigned-psfs">
                    <div className="section-heading"><h2>평가할 두 영역</h2></div>
                    <div className="psf-options">
                      {SURVEY_DATA.filter(q => questionIds.includes(q.id)).map(q => (
                        <div className="assigned-psf" key={q.id}><span>PSF {q.id}</span><strong>{q.psf}</strong></div>
                      ))}
                    </div>
                  </section>
                )}
                <form
                  className="panel profile-panel"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void nextProfile();
                  }}
                  noValidate
                >
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">참여자 정보 {profileStep + 1} / {FIELD_GROUPS.length}단계</p>
                      <h2 id="profile-title" tabIndex={-1}>{currentGroup.title}</h2>
                      <p className="muted small">
                        {currentGroup.description} 모든 항목은 필수입니다.
                      </p>
                      {profileStep === 0 && <p className="muted small">기본정보는 마지막 단계에서 ‘설문 시작하기’를 누르면 저장됩니다.</p>}
                    </div>
                  </div>
                  <fieldset disabled={busy} className="profile-fields">
                    <legend className="sr-only">{currentGroup.title}</legend>
                    {currentGroup.fields.map((field) => (
                      <div
                        className={`field ${field.type === "workTime" ? "wide" : ""}`}
                        key={field.key}
                      >
                        {field.type === "workTime" ? (
                          <>
                            <p className="field-label">{field.label}</p>
                            <div className="work-clocks">
                              <ClockField
                                id="work-start"
                                label="출근"
                                value={profile.workTime?.split("/")[0] || ""}
                                onChange={(value) =>
                                  updateProfile(
                                    "workTime",
                                    `${value}/${profile.workTime?.split("/")[1] || ""}`,
                                  )
                                }
                              />
                              <ClockField
                                id="work-end"
                                label="퇴근"
                                value={profile.workTime?.split("/")[1] || ""}
                                onChange={(value) =>
                                  updateProfile(
                                    "workTime",
                                    `${profile.workTime?.split("/")[0] || ""}/${value}`,
                                  )
                                }
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <label htmlFor={field.key}>{field.label}</label>
                            {field.type === "job" || field.type === "gender" ? (
                              <select
                                id={field.key}
                                value={profile[field.key]}
                                onChange={(e) =>
                                  updateProfile(field.key, e.target.value)
                                }
                                aria-invalid={errorField === field.key}
                                aria-describedby={
                                  errorField === field.key
                                    ? "profile-field-error"
                                    : undefined
                                }
                              >
                                <option value="">선택해주세요</option>
                                {(field.type === "job"
                                  ? JOBS
                                  : ["남성", "여성", "응답하지 않음"]
                                ).map((value) => (
                                  <option key={value}>{value}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                id={field.key}
                                type={field.type}
                                disabled={isMeasurement(field.key) && profile[field.key] === MEASUREMENT_UNKNOWN}
                                value={isMeasurement(field.key) && profile[field.key] === MEASUREMENT_UNKNOWN ? "" : profile[field.key]}
                                onChange={(e) =>
                                  updateProfile(field.key, e.target.value)
                                }
                                placeholder={field.placeholder}
                                maxLength={200}
                                max={
                                  field.type === "date"
                                    ? today
                                    : entryLimits[field.key]?.[1]
                                }
                                min={
                                  field.type === "number"
                                    ? entryLimits[field.key]?.[0]
                                    : field.type === "date"
                                      ? "1900-01-01"
                                      : undefined
                                }
                                step={field.key === "years" ? 1 : "any"}
                                autoComplete="off"
                                aria-invalid={errorField === field.key}
                                aria-describedby={
                                  errorField === field.key
                                    ? "profile-field-error"
                                    : undefined
                                }
                              />
                            )}
                          </>
                        )}
                        {isMeasurement(field.key) && (
                          <label className="measurement-choice">
                            <input type="checkbox" aria-label={`${field.label} 미측정`} checked={profile[field.key] === MEASUREMENT_UNKNOWN}
                              onChange={event => updateProfile(field.key, event.target.checked ? MEASUREMENT_UNKNOWN : "")} />
                            미측정
                          </label>
                        )}
                        {errorField === field.key && (
                          <p id="profile-field-error" className="field-error">
                            {error}
                          </p>
                        )}
                      </div>
                    ))}
                  </fieldset>
                  <div className="form-actions">
                    <button
                      className="button secondary"
                      type="button"
                      disabled={profileStep === 0 || busy}
                      onClick={() => goToProfileStep(profileStep - 1)}
                    >
                      이전
                    </button>
                    <button
                      className="button primary"
                      type="submit"
                      disabled={busy}
                    >
                      {busy
                        ? "준비 중…"
                        : profileStep === 2
                          ? "설문 시작하기"
                          : "다음 단계"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="round-heading">
                  <div className="round-progress">
                    <h2 id="round-title" tabIndex={-1}>{session.completed_rounds + 1}/{session.total_rounds}회차 · {questionIndex + 1}/{session.pending_questions.length}문항</h2>
                  </div>
                  <span className="tag">
                    {Object.keys(answers).length} / 2 선택
                  </span>
                </div>
                {!supportedVersion(session.survey_version) && (
                  <div className="alert error" role="alert">
                    이전 버전의 설문입니다. 기존 응답은 보관되어 있습니다.
                    관리자에게 문의하거나 새 설문을 시작해주세요.
                  </div>
                )}
                <div id="question-area" tabIndex={-1}>
                  {currentQuestion && (
                    <MultipleChoiceQuestion
                      question={currentQuestion}
                      value={answers[currentQuestion.id] || ""}
                      onChange={(code) => choose(currentQuestion.id, code)}
                      disabled={busy}
                    />
                  )}
                </div>
                <div className="survey-actions">
                  <div className="save-state">
                    <strong>
                      {busy
                        ? "응답을 저장하고 있습니다…"
                        : session.completed_rounds ? `${session.completed_rounds}회차까지 저장됨` : "첫 회차 작성 중"}
                    </strong>
                    <span>두 문항을 확인한 후 이번 회차를 저장해주세요.</span>
                  </div>
                  <div className="action-buttons">
                    <button
                      className="button secondary"
                      disabled={busy || questionIndex === 0}
                      onClick={() => moveQuestion(questionIndex - 1)}
                    >
                      이전 문항
                    </button>
                    {questionIndex === 0 ? (
                      <button
                        className="button primary"
                        disabled={busy || !answers[currentQuestion?.id || 0]}
                        onClick={() => moveQuestion(1)}
                      >
                        다음 문항
                      </button>
                    ) : (
                      <button
                        className="button primary"
                        disabled={
                          busy || !supportedVersion(session.survey_version)
                        }
                        onClick={() => void saveRound()}
                      >
                        {busy
                          ? "저장 중…"
                          : session.completed_rounds === 29
                            ? "마지막 회차 저장"
                            : "이번 회차 저장"}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <dialog
        ref={resetDialog}
        className="app-dialog"
        aria-labelledby="reset-title"
      >
        <h2 id="reset-title">다른 참여자로 전환할까요?</h2>
        <p>
          저장된 응답은 보관됩니다. 연결을 해제하면 이 브라우저에서 진행 중인 모든 그룹의 설문이 종료됩니다.
          다음 참여자는 기본정보부터 새로 작성합니다.
        </p>
        <div className="form-actions">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => resetDialog.current?.close()}
          >
            돌아가기
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void startOver(true)}
          >
            연결 해제 · 다른 참여자로 시작
          </button>
          {profile.name && (
            <button className="button secondary" disabled={busy} onClick={() => void startOver(false)}>
              내 기본정보로 다시 시작
            </button>
          )}
        </div>
      </dialog>
    </PageShell>
  );
}
