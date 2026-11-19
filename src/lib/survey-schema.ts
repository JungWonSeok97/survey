import { ALL_OPTION_LISTS, SURVEY_DATA } from "./surveyData";

export const SURVEY_VERSION = "2026-11-19-v2";
export const TOTAL_ROUNDS = 30;
export const JOBS = ["기관사", "관제사", "정비사", "선로작업자", "기타"];
export type Participant = Record<string, string>;
export type Answer = { questionId: number; answerCode: string; answer: string };
export type Scenario = {
  id: number;
  psf: string;
  text: string;
  options: { code: string; label: string }[];
  conditions: Record<string, string>;
  conditionCodes: Record<string, string>;
};
export type SurveySession = {
  id: string;
  survey_version: string;
  question_ids: number[];
  participant: Participant;
  completed_rounds: number;
  total_rounds: number;
  pending_questions: Scenario[];
  completed_at: string | null;
  abandoned_at: string | null;
  created_at: string;
  updated_at: string;
};
export type RoundRecord = {
  id: string;
  session_id: string;
  round: number;
  questions: (Scenario & { answer: string; answerCode: string })[];
  saved_at: string;
};
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

export const FIELD_GROUPS = [
  {
    title: "기본 정보",
    description: "현재 소속과 직무를 알려주세요.",
    fields: [
      { key: "name", label: "성명", type: "text", placeholder: "성명" },
      {
        key: "affiliation",
        label: "회사",
        type: "text",
        placeholder: "예: 한국철도공사",
      },
      { key: "employeeId", label: "사번", type: "text", placeholder: "사번" },
      { key: "job", label: "종사자 구분", type: "job", placeholder: "" },
      {
        key: "years",
        label: "근속기간 (년)",
        type: "number",
        placeholder: "예: 10",
      },
      { key: "position", label: "직급", type: "text", placeholder: "직급" },
      {
        key: "department",
        label: "부서·소속",
        type: "text",
        placeholder: "부서 또는 사업소",
      },
    ],
  },
  {
    title: "연락·자격 정보",
    description: "참여자 확인을 위한 정보를 입력해주세요.",
    fields: [
      { key: "gender", label: "성별", type: "gender", placeholder: "" },
      { key: "dateOfBirth", label: "생년월일", type: "date", placeholder: "" },
      {
        key: "officePhone",
        label: "사무실 연락처",
        type: "tel",
        placeholder: "예: 042-000-0000",
      },
      {
        key: "companyEmail",
        label: "회사 이메일",
        type: "email",
        placeholder: "name@example.com",
      },
      {
        key: "railroadCertification",
        label: "철도 관련 자격증",
        type: "text",
        placeholder: "자격증 명칭 또는 없음",
      },
      {
        key: "jobEducation",
        label: "직무교육 이수 여부",
        type: "text",
        placeholder: "교육명 또는 미이수",
      },
    ],
  },
  {
    title: "건강·근무 정보",
    description: "최근 건강검진과 현재 근무 정보를 입력해주세요.",
    fields: [
      {
        key: "healthCheckDate",
        label: "건강검진 날짜",
        type: "date",
        placeholder: "",
      },
      {
        key: "bodyTemperature",
        label: "체온 (℃)",
        type: "number",
        placeholder: "예: 36.5",
      },
      {
        key: "systolicBP",
        label: "수축기 혈압 (mmHg)",
        type: "number",
        placeholder: "예: 120",
      },
      {
        key: "diastolicBP",
        label: "이완기 혈압 (mmHg)",
        type: "number",
        placeholder: "예: 80",
      },
      {
        key: "pulse",
        label: "맥박 (회/분)",
        type: "number",
        placeholder: "예: 70",
      },
      {
        key: "workType",
        label: "근무유형",
        type: "text",
        placeholder: "예: 통상일근, 4조 2교대",
      },
      {
        key: "workTime",
        label: "출근 / 퇴근 시각",
        type: "workTime",
        placeholder: "09:00/18:00",
      },
      {
        key: "employeeCardNumber",
        label: "사원증·출입증 일련번호",
        type: "text",
        placeholder: "일련번호",
      },
    ],
  },
] as const;
export const PARTICIPANT_KEYS = FIELD_GROUPS.flatMap((group) =>
  group.fields.map((field) => field.key),
);

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ValidationError("요청 형식을 확인해주세요.");
  return value as Record<string, unknown>;
}
export function onlyKeys(
  data: Record<string, unknown>,
  allowed: readonly string[],
) {
  if (Object.keys(data).some((key) => !allowed.includes(key)))
    throw new ValidationError("지원하지 않는 입력 항목이 있습니다.");
}
export function validateParticipant(
  value: unknown,
  keys: readonly string[] = PARTICIPANT_KEYS,
): Participant {
  const data = record(value),
    result: Participant = {};
  onlyKeys(data, PARTICIPANT_KEYS);
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  for (const key of keys) {
    const field = FIELD_GROUPS.flatMap((g) => [...g.fields]).find(
      (f) => f.key === key,
    )!;
    const item = data[key];
    if (
      typeof item !== "string" ||
      !item.trim() ||
      item.length > 200 ||
      /[\u0000-\u001f\u007f]/.test(item)
    )
      throw new ValidationError(
        `${field.label}을(를) 올바르게 입력해주세요.`,
        key,
      );
    const text = item.trim();
    if (key === "job" && !JOBS.includes(text))
      throw new ValidationError("종사자 구분을 선택해주세요.", key);
    if (key === "gender" && !["남성", "여성", "응답하지 않음"].includes(text))
      throw new ValidationError("성별을 선택해주세요.", key);
    if (key === "companyEmail" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))
      throw new ValidationError("이메일 형식을 확인해주세요.", key);
    if (key === "officePhone" && (!/^[+\d() -]{7,30}$/.test(text) || text.replace(/\D/g, '').length < 7))
      throw new ValidationError(
        "연락처를 숫자와 하이픈으로 입력해주세요.",
        key,
      );
    if (
      key === "workTime" &&
      !/^([01]\d|2[0-3]):[0-5]\d\/([01]\d|2[0-3]):[0-5]\d$/.test(text)
    )
      throw new ValidationError("출근·퇴근 시각을 모두 선택해주세요.", key);
    if (field.type === "number") {
      const number = Number(text);
      const valid =
        /^\d+(?:\.\d+)?$/.test(text) &&
        Number.isFinite(number) &&
        (key === "years"
          ? /^\d+$/.test(text) && number >= 0 && number <= 80
          : number > 0 && number <= (key === "bodyTemperature" ? 60 : 1000));
      if (!valid)
        throw new ValidationError(
          `${field.label}의 숫자 범위를 확인해주세요.`,
          key,
        );
    }
    if (field.type === "date") {
      const date = new Date(`${text}T00:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(text) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== text ||
        text > today ||
        text < "1900-01-01"
      )
        throw new ValidationError(
          `${field.label}을(를) 유효한 과거 날짜로 선택해주세요.`,
          key,
        );
    }
    result[key] = text;
  }
  return result;
}
export function validateQuestionIds(value: unknown): number[] {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    value.some((id) => !Number.isInteger(id) || id < 1 || id > 8) ||
    value[0] === value[1]
  )
    throw new ValidationError("서로 다른 두 PSF를 선택해주세요.");
  return [...value].sort((a, b) => a - b);
}
export function validateRound(value: unknown): number {
  if (
    !Number.isInteger(value) ||
    Number(value) < 1 ||
    Number(value) > TOTAL_ROUNDS
  )
    throw new ValidationError("회차는 1~30이어야 합니다.");
  return Number(value);
}
export function validateUUID(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new ValidationError("설문 식별자가 올바르지 않습니다.");
  return value;
}
export function validateAnswers(value: unknown, ids: number[]): Answer[] {
  if (!Array.isArray(value) || value.length !== 2)
    throw new ValidationError("두 문항에 모두 응답해주세요.");
  const answers = value
    .map((item) => {
      const answer = record(item);
      onlyKeys(answer, ["questionId", "answerCode"]);
      const question = SURVEY_DATA.find((q) => q.id === answer.questionId);
      if (!question || !ids.includes(question.id))
        throw new ValidationError("배정된 문항에 응답해주세요.");
      const index = question.options.findIndex(
        (_, i) => `F.${question.id}.${i + 1}` === answer.answerCode,
      );
      if (index < 0) throw new ValidationError("허용되지 않은 답변입니다.");
      return {
        questionId: question.id,
        answerCode: String(answer.answerCode),
        answer: question.options[index],
      };
    })
    .sort((a, b) => a.questionId - b.questionId);
  if (answers[0].questionId === answers[1].questionId)
    throw new ValidationError("같은 문항에 중복 응답할 수 없습니다.");
  return answers;
}

// Codes follow the prediction app's condition identities, not risk rank/display order.
export function conditionCode(
  psf: number,
  questionIndex: number,
  optionIndex: number,
) {
  const suffix =
    psf === 6 && questionIndex === 8 ? [2, 1][optionIndex] : optionIndex + 1;
  return `F.${psf}.S.${questionIndex + 1}.${suffix}`;
}
export function generateScenarios(
  ids: number[],
  random: () => number = Math.random,
): Scenario[] {
  return validateQuestionIds(ids).map((id) => {
    const q = SURVEY_DATA.find((item) => item.id === id)!;
    const labels: Record<string, string | undefined> = q.condition_labels;
    const conditions: Record<string, string> = {},
      conditionCodes: Record<string, string> = {};
    q.condition_keys.forEach((key, index) => {
      const list = ALL_OPTION_LISTS[key as keyof typeof ALL_OPTION_LISTS];
      const option = Math.min(
        list.length - 1,
        Math.floor(random() * list.length),
      );
      conditions[labels[key] || key] = list[option];
      conditionCodes[`F.${id}.S.${index + 1}`] = conditionCode(
        id,
        index,
        option,
      );
    });
    return {
      id,
      psf: q.psf,
      text: q.text,
      conditions,
      conditionCodes,
      options: q.options.map((label, i) => ({
        code: `F.${id}.${i + 1}`,
        label,
      })),
    };
  });
}
