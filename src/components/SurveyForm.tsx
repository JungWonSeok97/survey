'use client';

import { useEffect, useRef, useState } from 'react';
import MultipleChoiceQuestion from '@/components/MultipleChoiceQuestion';
import { ALL_OPTION_LISTS, SURVEY_DATA } from '@/lib/surveyData';

interface SurveyFormProps {
  questionIds: [number, number];
  groupName: string;
}

type SurveyProfile = {
  name: string;
  affiliation: string;
  years: string;
  job: string;
  employeeId: string;
  position: string;
  department: string;
  gender: string;
  dateOfBirth: string;
  officePhone: string;
  companyEmail: string;
  railroadCertification: string;
  jobEducation: string;
  healthCheckDate: string;
  bodyTemperature: string;
  systolicBP: string;
  diastolicBP: string;
  pulse: string;
  workType: string;
  workTime: string;
  employeeCardNumber: string;
};

type ProfileFieldKey = keyof SurveyProfile;
type FinalSurveyKey =
  | 'occupationDetail'
  | 'overtimePeriod'
  | 'overtimeLong'
  | 'physicalEffort'
  | 'cognitiveFocus'
  | 'accidentLoss';

type ProfileFieldConfig = {
  key: ProfileFieldKey;
  label: string;
  type: 'text' | 'date' | 'datetime-local' | 'email' | 'tel' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
};

type SurveyDefinition = (typeof SURVEY_DATA)[number];

type RenderedQuestion = SurveyDefinition & {
  conditions: Record<string, string>;
  details: Record<string, unknown>;
};

const TOTAL_ROUNDS = 30;

const INITIAL_PROFILE: SurveyProfile = {
  name: '',
  affiliation: '',
  years: '',
  job: '기관사',
  employeeId: '',
  position: '',
  department: '',
  gender: '선택',
  dateOfBirth: '',
  officePhone: '',
  companyEmail: '',
  railroadCertification: '',
  jobEducation: '',
  healthCheckDate: '',
  bodyTemperature: '',
  systolicBP: '',
  diastolicBP: '',
  pulse: '',
  workType: '',
  workTime: '',
  employeeCardNumber: '',
};

const PROFILE_FIELDS: ProfileFieldConfig[] = [
  {
    key: 'name',
    label: '성명을 적어주세요.',
    type: 'text',
    placeholder: '홍길동',
  },
  {
    key: 'affiliation',
    label: '소속 기관을 적어주세요.',
    type: 'text',
    placeholder: '예: 코레일',
  },
  {
    key: 'years',
    label: '근속기간(년)을 적어주세요.',
    type: 'text',
    placeholder: '10',
  },
  {
    key: 'job',
    label: '직종 구분',
    type: 'select',
    options: [
      { value: '기관사', label: '기관사' },
      { value: '관제사', label: '관제사' },
      { value: '승무원', label: '승무원' },
      { value: '작업자', label: '작업자' },
    ],
  },
  {
    key: 'employeeId',
    label: '사번을 적어주세요.',
    type: 'text',
    placeholder: '사번 입력',
  },
  {
    key: 'position',
    label: '직급을 적어주세요. ex) 3급, 4급',
    type: 'text',
    placeholder: '예: 3급',
  },
  {
    key: 'department',
    label: '부서를 적어주세요. ex) OO본부 OO처',
    type: 'text',
    placeholder: '예: 서울본부 운전처',
  },
  {
    key: 'gender',
    label: '성별',
    type: 'select',
    options: [
      { value: '선택', label: '선택' },
      { value: '남성', label: '남성' },
      { value: '여성', label: '여성' },
    ],
  },
  {
    key: 'dateOfBirth',
    label: '생년월일',
    type: 'date',
  },
  {
    key: 'officePhone',
    label: '업무 연락처를 적어주세요.',
    type: 'tel',
    placeholder: '02-1234-5678',
  },
  {
    key: 'companyEmail',
    label: '회사 이메일을 적어주세요.',
    type: 'email',
    placeholder: 'email@company.com',
  },
  {
    key: 'railroadCertification',
    label: '철도 관련 자격증 보유 여부를 적어주세요.',
    type: 'text',
    placeholder: '예: 있음 / 없음',
  },
  {
    key: 'jobEducation',
    label: '직무교육 이수 여부를 적어주세요.',
    type: 'text',
    placeholder: '예: 2년 주기 이수',
  },
  {
    key: 'healthCheckDate',
    label: '최근 건강검진 일시를 적어주세요.',
    type: 'datetime-local',
  },
  {
    key: 'bodyTemperature',
    label: '건강검진 시 체온을 적어주세요.',
    type: 'text',
    placeholder: '36.5',
  },
  {
    key: 'systolicBP',
    label: '건강검진 시 수축기 혈압을 적어주세요.',
    type: 'text',
    placeholder: '120',
  },
  {
    key: 'diastolicBP',
    label: '건강검진 시 이완기 혈압을 적어주세요.',
    type: 'text',
    placeholder: '80',
  },
  {
    key: 'pulse',
    label: '건강검진 시 맥박을 적어주세요.',
    type: 'text',
    placeholder: '70',
  },
  {
    key: 'workType',
    label: '근무유형을 적어주세요.',
    type: 'text',
    placeholder: '예: 주간/교대/야간',
  },
  {
    key: 'workTime',
    label: '출근/퇴근 시각을 적어주세요. ex) 09:00/18:00',
    type: 'text',
    placeholder: '09:00/18:00',
  },
  {
    key: 'employeeCardNumber',
    label: '사원증 또는 출입증 일련번호를 적어주세요.',
    type: 'text',
    placeholder: '일련번호 입력',
  },
];

const FINAL_SURVEY_QUESTIONS: {
  key: FinalSurveyKey;
  question: string;
  options: string[];
}[] = [
  {
    key: 'occupationDetail',
    question: 'Q. (직종) 상세 직종을 선택해주세요.',
    options: [
      '1. 기관사_기관사',
      '2. 관제사_중앙(TTC/CTC)',
      '3. 관제사_로컬(역 구내)',
      '4. 승무원_열차승무(열차 내)',
      '5. 승무원_역무영업(역사 내)',
      '6. 작업자_수송원(입환작업)',
      '7. 작업자_선로 유지보수(시설)',
      '8. 작업자_건축/구조물 점검(시설)',
      '9. 작업자_전철전력(전기)',
      '10. 작업자_신호 및 통신(전기)',
      '11. 작업자_차량중정비(차량)',
      '12. 작업자_차량경정비(차량)',
    ],
  },
  {
    key: 'overtimePeriod',
    question:
      'Q. (작업 시간) 귀하는 얼마나 자주 초과근무를 합니까? (최근 10작업일 이내)',
    options: [
      '1. 전혀 하지 않음',
      '2. 30분~1시간 미만',
      '3. 1시간~2시간 미만',
      '4. 2시간~3시간 미만',
      '5. 3시간 이상',
    ],
  },
  {
    key: 'overtimeLong',
    question:
      'Q. (작업 시간) 귀하는 초과근무를 할 때 평균적으로 얼마나 길게 초과근무를 합니까?',
    options: [
      '1. 30분 미만',
      '2. 30분~1시간 미만',
      '3. 1시간~2시간 미만',
      '4. 2시간~3시간 미만',
      '5. 3시간 이상',
    ],
  },
  {
    key: 'physicalEffort',
    question:
      'Q. (신체 부하) 귀하의 일상적인 업무는 어느 정도의 육체적 노력(근력 사용, 걷기, 무거운 짐 들기 등)을 요구합니까?',
    options: [
      '1. 앉아서 하는 업무',
      '2. 가벼운 신체 활동(걷기)',
      '3. 가벼운 물건 운반',
      '4. 장비 조작, 운반 등',
      '5. 탈력 수준의 고강도 노동',
    ],
  },
  {
    key: 'cognitiveFocus',
    question:
      'Q. (인지 부하) 귀하의 업무는 어느 정도의 인지적 집중(단순 반복, 문제 해결 능력, 돌발상황 대처능력 등)을 요구합니까?',
    options: [
      '1. 단순 반복 작업',
      '2. 일상적 대응',
      '3. 문제 파악 및 해결',
      '4. 다중 정보 모니터링',
      '5. 돌발상황 대처능력 요구',
    ],
  },
  {
    key: 'accidentLoss',
    question:
      'Q. (사고로 인한 손실) 귀하가 업무 중 실수했을 때, 사고로 발생하는 손해가 어느 수준에 가깝다고 생각합니까?',
    options: [
      '1. 응급 처치 가능',
      '2. 병원 방문 필요',
      '3. 3주 이상 치료',
      '4. 1인 사망/영구 장애',
      '5. 대형 사고 (다수 상해)',
    ],
  },
];

const INITIAL_FINAL_ANSWERS: Record<FinalSurveyKey, string> = {
  occupationDetail: '',
  overtimePeriod: '',
  overtimeLong: '',
  physicalEffort: '',
  cognitiveFocus: '',
  accidentLoss: '',
};

function generateCombinations(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return arrays[0].map((item) => [item]);

  const result: string[][] = [];
  const restCombinations = generateCombinations(arrays.slice(1));

  for (const item of arrays[0]) {
    for (const rest of restCombinations) {
      result.push([item, ...rest]);
    }
  }

  return result;
}

function buildQuestions(questionIds: [number, number]): RenderedQuestion[] {
  return SURVEY_DATA.filter((questionDefinition) =>
    questionIds.includes(questionDefinition.id),
  ).map((questionDefinition) => {
    const keysForThisQuestion = questionDefinition.condition_keys;
    const listsToCombine = keysForThisQuestion.map(
      (key) => ALL_OPTION_LISTS[key as keyof typeof ALL_OPTION_LISTS],
    );

    const allScenarios = generateCombinations(listsToCombine);
    const selectedScenario =
      allScenarios[Math.floor(Math.random() * allScenarios.length)];

    const conditions: Record<string, string> = {};
    const details: Record<string, unknown> = {};
    const labels = questionDefinition.condition_labels;
    const descriptions = questionDefinition.condition_descriptions || {};

    keysForThisQuestion.forEach((key, index) => {
      const label = labels[key as keyof typeof labels];
      const value = selectedScenario[index];
      const descriptionGroup = descriptions[
        key as keyof typeof descriptions
      ] as Record<string, unknown> | undefined;

        if (!label || typeof value !== 'string') {
          return;
        }

        conditions[label] = value;

      if (descriptionGroup?.[value]) {
        details[label] = descriptionGroup[value];
      }
    });

    return {
      ...questionDefinition,
      conditions,
      details,
    };
  });
}

export default function SurveyForm({ questionIds, groupName }: SurveyFormProps) {
  const [currentRound, setCurrentRound] = useState(1);
  const [profile, setProfile] = useState<SurveyProfile>(INITIAL_PROFILE);
  const [questions, setQuestions] = useState<RenderedQuestion[]>([]);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');
  const [isInfoFormFilled, setIsInfoFormFilled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalSurveyStep, setIsFinalSurveyStep] = useState(false);
  const [savedResponseIds, setSavedResponseIds] = useState<string[]>([]);
  const [finalAnswers, setFinalAnswers] =
    useState<Record<FinalSurveyKey, string>>(INITIAL_FINAL_ANSWERS);

  const fieldRefs = useRef<
    Partial<Record<ProfileFieldKey, HTMLInputElement | HTMLSelectElement | null>>
  >({});

  useEffect(() => {
    if (isInfoFormFilled && !isFinalSurveyStep) {
      setQuestions(buildQuestions(questionIds));
    }
  }, [currentRound, isFinalSurveyStep, isInfoFormFilled, questionIds]);

  const updateProfile = (key: ProfileFieldKey, value: string) => {
    setProfile((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const focusField = (key: ProfileFieldKey, message: string) => {
    setError(message);
    const field = fieldRefs.current[key];
    field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    field?.focus();
    return false;
  };

  const validateInputs = (): boolean => {
    if (!profile.name.trim()) {
      return focusField('name', '성명을 입력해 주세요.');
    }

    if (!/^[가-힣]+$/.test(profile.name.trim())) {
      return focusField('name', '성명은 공백 없이 한글만 입력해 주세요.');
    }

    if (!profile.affiliation.trim()) {
      return focusField('affiliation', '소속 기관을 입력해 주세요.');
    }

    if (!profile.years.trim()) {
      return focusField('years', '근속기간(년)을 입력해 주세요.');
    }

    if (!/^\d+$/.test(profile.years.trim())) {
      return focusField('years', '근속기간은 숫자만 입력해 주세요.');
    }

    if (!profile.employeeId.trim()) {
      return focusField('employeeId', '사번을 입력해 주세요.');
    }

    if (!profile.position.trim()) {
      return focusField('position', '직급을 입력해 주세요.');
    }

    if (!profile.department.trim()) {
      return focusField('department', '부서를 입력해 주세요.');
    }

    if (profile.gender === '선택') {
      return focusField('gender', '성별을 선택해 주세요.');
    }

    if (!profile.dateOfBirth.trim()) {
      return focusField('dateOfBirth', '생년월일을 입력해 주세요.');
    }

    if (!profile.officePhone.trim()) {
      return focusField('officePhone', '업무 연락처를 입력해 주세요.');
    }

    if (!profile.companyEmail.trim()) {
      return focusField('companyEmail', '회사 이메일을 입력해 주세요.');
    }

    if (!profile.railroadCertification.trim()) {
      return focusField(
        'railroadCertification',
        '철도 관련 자격증 보유 여부를 입력해 주세요.',
      );
    }

    if (!profile.jobEducation.trim()) {
      return focusField('jobEducation', '직무교육 이수 여부를 입력해 주세요.');
    }

    if (!profile.healthCheckDate.trim()) {
      return focusField(
        'healthCheckDate',
        '최근 건강검진 일시를 입력해 주세요.',
      );
    }

    if (!profile.bodyTemperature.trim()) {
      return focusField('bodyTemperature', '체온을 입력해 주세요.');
    }

    if (!profile.systolicBP.trim()) {
      return focusField('systolicBP', '수축기 혈압을 입력해 주세요.');
    }

    if (!profile.diastolicBP.trim()) {
      return focusField('diastolicBP', '이완기 혈압을 입력해 주세요.');
    }

    if (!profile.pulse.trim()) {
      return focusField('pulse', '맥박을 입력해 주세요.');
    }

    if (!profile.workType.trim()) {
      return focusField('workType', '근무유형을 입력해 주세요.');
    }

    if (!profile.workTime.trim()) {
      return focusField('workTime', '출근/퇴근 시각을 입력해 주세요.');
    }

    if (!profile.employeeCardNumber.trim()) {
      return focusField(
        'employeeCardNumber',
        '사원증 또는 출입증 일련번호를 입력해 주세요.',
      );
    }

    setError('');
    return true;
  };

  const validateFinalSurvey = () => {
    for (const question of FINAL_SURVEY_QUESTIONS) {
      if (!finalAnswers[question.key]) {
        setError('추가 설문의 모든 문항에 응답해 주세요.');
        document
          .getElementById(`final-question-${question.key}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }
    }

    setError('');
    return true;
  };

  const collectRoundAnswers = () => {
    const questionElements = document.querySelectorAll('[data-question-id]');
    const answers: Record<string, string> = {};

    questionElements.forEach((element) => {
      const id = element.getAttribute('data-question-id');
      const checked = element.querySelector(
        'input[type="radio"]:checked',
      ) as HTMLInputElement | null;

      if (id && checked) {
        answers[id] = checked.value;
      }
    });

    return answers;
  };

  const handleRoundSubmit = async () => {
    if (!validateInputs()) return;
    if (isSubmitting) return;
    if (currentRound > TOTAL_ROUNDS) {
      window.alert('이미 모든 설문이 완료되었습니다.');
      return;
    }

    const answers = collectRoundAnswers();

    if (Object.keys(answers).length < questions.length) {
      setError('모든 문항에 응답해 주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          round: currentRound,
          selectedQuestions: questionIds,
          questions: questions.map((question) => ({
            id: question.id,
            number: question.text.split('.')[0] + '.',
            conditions: question.conditions,
            answer: answers[question.id],
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || errorData.message || '설문 저장 실패');
      }

      const result = await response.json();
      const insertedId =
        typeof result.id === 'string' && result.id.trim() ? result.id : '';
      const nextResponseIds = insertedId
        ? [...savedResponseIds, insertedId]
        : savedResponseIds;

      setSavedResponseIds(nextResponseIds);

      if (currentRound < TOTAL_ROUNDS) {
        window.alert(
          `${currentRound}/${TOTAL_ROUNDS}회차가 저장되었습니다.`,
        );
        const roundRadios = document.querySelectorAll(
          'input[type="radio"][name^="question-"]',
        );
        roundRadios.forEach((radio) => {
          (radio as HTMLInputElement).checked = false;
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setCurrentRound((prev) => prev + 1);
        return;
      }

      window.alert(
        '30회차 설문이 저장되었습니다. 마지막 추가 설문에 응답해 주세요.',
      );
      setIsFinalSurveyStep(true);
      setError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Survey save error:', err);
      setError('설문 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalAnswerChange = (key: FinalSurveyKey, value: string) => {
    setFinalAnswers((prev) => ({
      ...prev,
      [key]: value,
    }));
    setError('');
  };

  const handleFinalSurveySubmit = async () => {
    if (!validateFinalSurvey()) return;
    if (isSubmitting) return;
    if (savedResponseIds.length === 0) {
      setError('저장된 설문 응답을 찾지 못했습니다. 다시 시도해 주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseIds: savedResponseIds,
          occupationDetail: finalAnswers.occupationDetail,
          overtimePeriod: finalAnswers.overtimePeriod,
          overtimeLong: finalAnswers.overtimeLong,
          physicalEffort: finalAnswers.physicalEffort,
          cognitiveFocus: finalAnswers.cognitiveFocus,
          accidentLoss: finalAnswers.accidentLoss,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Final survey API Error:', errorData);
        throw new Error(
          errorData.error || errorData.message || '추가 설문 저장 실패',
        );
      }

      await response.json();
      setCompleted(true);
      setIsFinalSurveyStep(false);
      setError('');
      window.alert('추가 설문까지 모두 저장되었습니다. 감사합니다.');
    } catch (err) {
      console.error('Final survey save error:', err);
      setError('추가 설문 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartSurvey = () => {
    if (!validateInputs()) return;
    setCurrentRound(1);
    setSavedResponseIds([]);
    setFinalAnswers({ ...INITIAL_FINAL_ANSWERS });
    setIsFinalSurveyStep(false);
    setIsInfoFormFilled(true);
    setError('');
  };

  const psfNames = questionIds
    .map((id) => {
      const question = SURVEY_DATA.find((item) => item.id === id);
      return question ? `${id}번 (${question.psf})` : `${id}번`;
    })
    .join(', ');

  const renderProfileField = (field: ProfileFieldConfig) => {
    const commonClassName =
      'w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent';

    return (
      <div key={field.key}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {field.label} <span className="text-red-500">*</span>
        </label>

        {field.type === 'select' ? (
          <select
            ref={(node) => {
              fieldRefs.current[field.key] = node;
            }}
            value={profile[field.key]}
            onChange={(event) => updateProfile(field.key, event.target.value)}
            className={commonClassName}
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={(node) => {
              fieldRefs.current[field.key] = node;
            }}
            type={field.type}
            value={profile[field.key]}
            onChange={(event) => updateProfile(field.key, event.target.value)}
            className={commonClassName}
            placeholder={field.placeholder}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
        {completed && (
          <div className="text-center py-12">
            <div className="mb-6">
              <svg
                className="mx-auto h-24 w-24 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              설문이 완료되었습니다!
            </h2>
            <p className="text-lg text-gray-600 mb-2">
              총 {TOTAL_ROUNDS}회의 반복 설문과 마지막 추가 설문 응답이 저장되었습니다.
            </p>
            <p className="text-sm text-gray-500">
              페이지를 닫으셔도 됩니다.
            </p>
          </div>
        )}

        {!completed && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {isFinalSurveyStep ? '마지막 추가 설문' : '설문지'}
              </h1>
              <p className="text-gray-600">
                {isFinalSurveyStep
                  ? '30회 반복 설문이 끝났습니다. 아래 6개 문항에 응답하면 설문이 최종 완료됩니다.'
                  : `${groupName}에서 ${psfNames} PSF 설문을 총 ${TOTAL_ROUNDS}회 진행해 주세요.`}
              </p>
            </div>

            {!isInfoFormFilled && (
              <>
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}

                <div className="space-y-6">
                  {PROFILE_FIELDS.map(renderProfileField)}

                  <button
                    onClick={handleStartSurvey}
                    className="w-full mt-6 px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
                  >
                    설문 시작
                  </button>
                </div>
              </>
            )}

            {isInfoFormFilled && !isFinalSurveyStep && (
              <>
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}

                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-blue-700">
                    현재: {currentRound}/{TOTAL_ROUNDS}회차 - PSF: {psfNames}
                  </p>
                </div>

                <div className="space-y-12 mb-8">
                  {questions.map((question) => (
                    <MultipleChoiceQuestion
                      key={question.id}
                      question={question}
                    />
                  ))}
                </div>

                <div className="flex gap-4 justify-end pt-8 border-t">
                  <button
                    onClick={handleRoundSubmit}
                    disabled={isSubmitting}
                    className={`px-6 py-2 rounded-md font-medium ${
                      isSubmitting
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isSubmitting ? '저장 중...' : '회차 저장'}
                  </button>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-600">
                    진행률 {currentRound - 1}/{TOTAL_ROUNDS}회 완료
                  </p>
                </div>
              </>
            )}

            {isInfoFormFilled && isFinalSurveyStep && (
              <>
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}

                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-amber-800">
                    반복 설문 30회는 이미 저장되었습니다. 아래 추가 6문항까지 제출하면
                    전체 설문이 완료됩니다.
                  </p>
                </div>

                <div className="space-y-10 mb-8">
                  {FINAL_SURVEY_QUESTIONS.map((question) => (
                    <div
                      key={question.key}
                      id={`final-question-${question.key}`}
                      className="border-l-4 border-emerald-500 pl-6"
                    >
                      <h3 className="text-lg font-bold text-gray-900">
                        {question.question}
                      </h3>

                      <div className="mt-4 space-y-3">
                        {question.options.map((option) => {
                          const isChecked = finalAnswers[question.key] === option;

                          return (
                            <label
                              key={option}
                              className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                                isChecked
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`final-${question.key}`}
                                value={option}
                                checked={isChecked}
                                onChange={() =>
                                  handleFinalAnswerChange(question.key, option)
                                }
                                className="mt-1 w-4 h-4 text-emerald-600"
                              />
                              <span className="ml-3 text-gray-900">
                                {option}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 justify-end pt-8 border-t">
                  <button
                    onClick={handleFinalSurveySubmit}
                    disabled={isSubmitting}
                    className={`px-6 py-2 rounded-md font-medium ${
                      isSubmitting
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {isSubmitting ? '저장 중...' : '최종 제출'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
