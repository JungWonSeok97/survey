'use client';

import { useState, useEffect, useRef } from 'react';
import MultipleChoiceQuestion from '@/components/MultipleChoiceQuestion';
import { SURVEY_DATA, ALL_OPTION_LISTS } from '@/lib/surveyData';

export default function SurveyPage() {
  const [currentRound, setCurrentRound] = useState(1);
  const [name, setName] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [years, setYears] = useState('');
  const [job, setJob] = useState('선택');
  const [questions, setQuestions] = useState<any[]>([]);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [showQuestionSelector, setShowQuestionSelector] = useState(true);
  const [isInfoFormFilled, setIsInfoFormFilled] = useState(false);

  // 새로 추가된 필드들
  const [employeeId, setEmployeeId] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [gender, setGender] = useState('선택');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [railroadCertification, setRailroadCertification] = useState('');
  const [jobEducation, setJobEducation] = useState('');
  const [healthCheckDate, setHealthCheckDate] = useState('');
  const [bodyTemperature, setBodyTemperature] = useState('');
  const [systolicBP, setSystolicBP] = useState('');
  const [diastolicBP, setDiastolicBP] = useState('');
  const [pulse, setPulse] = useState('');
  const [workType, setWorkType] = useState('');
  const [workTime, setWorkTime] = useState('');
  const [employeeCardNumber, setEmployeeCardNumber] = useState('');

  const TOTAL_ROUNDS = 30;

  // 각 필드의 ref
  const nameRef = useRef<HTMLInputElement>(null);
  const affiliationRef = useRef<HTMLInputElement>(null);
  const yearsRef = useRef<HTMLInputElement>(null);
  const jobRef = useRef<HTMLSelectElement>(null);
  const employeeIdRef = useRef<HTMLInputElement>(null);
  const positionRef = useRef<HTMLInputElement>(null);
  const departmentRef = useRef<HTMLInputElement>(null);
  const genderRef = useRef<HTMLSelectElement>(null);
  const dateOfBirthRef = useRef<HTMLInputElement>(null);
  const officePhoneRef = useRef<HTMLInputElement>(null);
  const companyEmailRef = useRef<HTMLInputElement>(null);
  const railroadCertificationRef = useRef<HTMLInputElement>(null);
  const jobEducationRef = useRef<HTMLInputElement>(null);
  const healthCheckDateRef = useRef<HTMLInputElement>(null);
  const bodyTemperatureRef = useRef<HTMLInputElement>(null);
  const systolicBPRef = useRef<HTMLInputElement>(null);
  const diastolicBPRef = useRef<HTMLInputElement>(null);
  const pulseRef = useRef<HTMLInputElement>(null);
  const workTypeRef = useRef<HTMLInputElement>(null);
  const workTimeRef = useRef<HTMLInputElement>(null);
  const employeeCardNumberRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!showQuestionSelector && selectedQuestionIds.length > 0) {
      populateQuestions();
    }
  }, [currentRound, showQuestionSelector, selectedQuestionIds]);

  const generateCombinations = (arrays: string[][]): string[][] => {
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
  };

  const populateQuestions = () => {
    const newQuestions = SURVEY_DATA.filter((qDef: any) => selectedQuestionIds.includes(qDef.id))
      .map((qDef: any) => {
        const keysForThisQ: string[] = qDef.condition_keys;
        const listsToCombing = keysForThisQ.map((key: string) => ALL_OPTION_LISTS[key as keyof typeof ALL_OPTION_LISTS]);
        
        // 랜덤 시나리오 선택
        const allScenarios = generateCombinations(listsToCombing);
        const selectedScenario = allScenarios[Math.floor(Math.random() * allScenarios.length)];

        const qConditions: Record<string, string> = {};
        const qDetails: Record<string, any> = {};
        const labels = qDef.condition_labels;
        const allDescriptions = qDef.condition_descriptions || {};

        keysForThisQ.forEach((key: string, i: number) => {
          const label = labels[key as keyof typeof labels];
          const value = selectedScenario[i];
          qConditions[label] = value;

          if (allDescriptions[key as keyof typeof allDescriptions] && 
              allDescriptions[key as keyof typeof allDescriptions][value]) {
            qDetails[label] = allDescriptions[key as keyof typeof allDescriptions][value];
          }
        });

        return {
          ...qDef,
          conditions: qConditions,
          details: qDetails,
        };
      });

    setQuestions(newQuestions);
  };

  const validateInputs = (): boolean => {
    if (!name.trim()) {
      setError('성명을 입력해 주세요.');
      nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nameRef.current?.focus();
      return false;
    }

    if (!/^[가-힣]+$/.test(name)) {
      setError('성명에는 특수문자나 공백을 사용할 수 없습니다.');
      nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nameRef.current?.focus();
      return false;
    }

    if (!affiliation.trim()) {
      setError('회사를 입력해 주세요.');
      affiliationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      affiliationRef.current?.focus();
      return false;
    }

    if (!years.trim()) {
      setError('근속기간(년)을 입력해 주세요.');
      yearsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      yearsRef.current?.focus();
      return false;
    }

    if (!/^\d+$/.test(years)) {
      setError('근속기간은 숫자만 입력할 수 있습니다.');
      yearsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      yearsRef.current?.focus();
      return false;
    }

    if (job === '선택') {
      setError('종사자 구분을 선택해 주세요.');
      jobRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      jobRef.current?.focus();
      return false;
    }

    // 새로운 필드 검증
    if (!employeeId.trim()) {
      setError('사번을 입력해 주세요.');
      employeeIdRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      employeeIdRef.current?.focus();
      return false;
    }

    if (!position.trim()) {
      setError('직급을 입력해 주세요.');
      positionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      positionRef.current?.focus();
      return false;
    }

    if (!department.trim()) {
      setError('소속을 입력해 주세요.');
      departmentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      departmentRef.current?.focus();
      return false;
    }

    if (gender === '선택') {
      setError('성별을 선택해 주세요.');
      genderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      genderRef.current?.focus();
      return false;
    }

    if (!dateOfBirth.trim()) {
      setError('생년월일을 입력해 주세요.');
      dateOfBirthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dateOfBirthRef.current?.focus();
      return false;
    }

    if (!officePhone.trim()) {
      setError('사무실 연락처를 입력해 주세요.');
      officePhoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      officePhoneRef.current?.focus();
      return false;
    }

    if (!companyEmail.trim()) {
      setError('회사 메일을 입력해 주세요.');
      companyEmailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      companyEmailRef.current?.focus();
      return false;
    }

    if (!railroadCertification.trim()) {
      setError('철도 관련 자격증 보유 여부를 입력해 주세요.');
      railroadCertificationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      railroadCertificationRef.current?.focus();
      return false;
    }

    if (!jobEducation.trim()) {
      setError('직무교육이수 여부를 입력해 주세요.');
      jobEducationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      jobEducationRef.current?.focus();
      return false;
    }

    if (!healthCheckDate.trim()) {
      setError('건강검진 일시를 입력해 주세요.');
      healthCheckDateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      healthCheckDateRef.current?.focus();
      return false;
    }

    if (!bodyTemperature.trim()) {
      setError('건강검진시 체온을 입력해 주세요.');
      bodyTemperatureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      bodyTemperatureRef.current?.focus();
      return false;
    }

    if (!systolicBP.trim()) {
      setError('건강검진시 수축기 혈압을 입력해 주세요.');
      systolicBPRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      systolicBPRef.current?.focus();
      return false;
    }

    if (!diastolicBP.trim()) {
      setError('건강검진시 이완기 혈압을 입력해 주세요.');
      diastolicBPRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      diastolicBPRef.current?.focus();
      return false;
    }

    if (!pulse.trim()) {
      setError('건강검진시 맥박을 입력해 주세요.');
      pulseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pulseRef.current?.focus();
      return false;
    }

    if (!workType.trim()) {
      setError('근무유형을 입력해 주세요.');
      workTypeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      workTypeRef.current?.focus();
      return false;
    }

    if (!workTime.trim()) {
      setError('출근/퇴근일시를 입력해 주세요.');
      workTimeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      workTimeRef.current?.focus();
      return false;
    }

    if (!employeeCardNumber.trim()) {
      setError('사원증 출입증 일련번호를 입력해 주세요.');
      employeeCardNumberRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      employeeCardNumberRef.current?.focus();
      return false;
    }

    setError('');
    return true;
  };

  const handleComplete = async () => {
    if (!validateInputs()) return;

    // 질문에서 답변 추출
    const questionElements = document.querySelectorAll('[data-question-id]');
    const answers: Record<string, string> = {};
    
    questionElements.forEach((elem) => {
      const id = elem.getAttribute('data-question-id');
      const checked = (elem as HTMLInputElement).querySelector('input[type="radio"]:checked') as HTMLInputElement;
      if (checked) {
        answers[id!] = checked.value;
      }
    });

    // 모든 질문이 답변되었는지 확인
    if (Object.keys(answers).length < questions.length) {
      setError('모든 문항에 답변해 주세요.');
      return;
    }

    try {
      // 서버에 저장 요청
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          affiliation,
          job,
          years,
          employeeId,
          position,
          department,
          gender,
          dateOfBirth,
          officePhone,
          companyEmail,
          railroadCertification,
          jobEducation,
          healthCheckDate,
          bodyTemperature,
          systolicBP,
          diastolicBP,
          pulse,
          workType,
          workTime,
          employeeCardNumber,
          round: currentRound,
          selectedQuestions: selectedQuestionIds,
          questions: questions.map((q) => ({
            id: q.id,
            number: q.text.split('.')[0] + '.',
            conditions: q.conditions,
            answer: answers[q.id],
          })),
        }),
      });

      if (!response.ok) throw new Error('저장 실패');

      if (currentRound < TOTAL_ROUNDS) {
        alert(`${currentRound}/${TOTAL_ROUNDS}회 완료 및 저장되었습니다.`);
        // 모든 라디오 버튼 체크 풀기
        const allRadios = document.querySelectorAll('input[type="radio"]');
        allRadios.forEach((radio) => {
          (radio as HTMLInputElement).checked = false;
        });
        // 페이지 맨 위로 스크롤
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // 다음 라운드: 같은 문제로 시나리오만 새로 생성
        setCurrentRound(currentRound + 1);
      } else {
        alert('모든 설문이 완료되었습니다.\n제출 버튼을 눌러주세요.');
        setCompleted(true);
      }
    } catch (err) {
      setError('저장 중 오류가 발생했습니다.');
    }
  };

  const handleSubmit = () => {
    const recipient = 'jerry@bees.pro';
    const subject = `설문 결과 제출 (${name})`;
    const body = `안녕하세요.\n\n${name}(${job}, 소속 ${affiliation}, 근속 ${years}년)님이 작성한 설문 결과입니다.\n\n'survey_results' 폴더에 저장된 엑셀 파일들을 이 메일에 첨부하여 보내주세요.\n\n감사합니다.`;
    
    const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  const handleQuestionSelect = (questionId: number) => {
    if (selectedQuestionIds.includes(questionId)) {
      setSelectedQuestionIds(selectedQuestionIds.filter(id => id !== questionId));
    } else if (selectedQuestionIds.length < 2) {
      setSelectedQuestionIds([...selectedQuestionIds, questionId].sort((a, b) => a - b));
    }
  };

  const handleStartSurvey = () => {
    if (!validateInputs()) return;
    if (selectedQuestionIds.length !== 2) {
      setError('문제를 정확히 2개 선택해 주세요.');
      return;
    }
    setIsInfoFormFilled(true);
    setShowQuestionSelector(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">설문지 소프트웨어</h1>
          <p className="text-gray-600">
            총 {TOTAL_ROUNDS}번의 설문을 완료해 주세요. 매 라운드마다 2개의 문제를 선택하고 답변해주세요.
          </p>
        </div>

        {/* 문제 선택 및 정보 입력 섹션 */}
        {showQuestionSelector && (
          <>
            {/* 입력 폼 */}
            <div className="space-y-4 mb-8 pb-8 border-b">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">성명을 적어주세요.</label>
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="성명을 적어주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">회사를 적어주세요.</label>
                <input
                  ref={affiliationRef}
                  type="text"
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  placeholder="회사를 적어주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">근속기간(년)을 적어주세요.</label>
                <input
                  ref={yearsRef}
                  type="text"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  placeholder="근속기간(년)을 적어주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">종사자 구분</label>
                <select
                  ref={jobRef}
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                >
                  <option>선택</option>
                  <option>기관사</option>
                  <option>관제사</option>
                  <option>승무원</option>
                  <option>작업자</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">사번을 적어주세요.</label>
                <input
                  ref={employeeIdRef}
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="사번을 적어주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">직급을 적어주세요. ex) 운전3급, 토목4급 등</label>
                <input
                  ref={positionRef}
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="직급을 적어주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">소속을 적어주세요. ex) OO본부 OO처 등</label>
                <input
                  ref={departmentRef}
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="소속을 적어주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">성별을 적어주세요.</label>
                <select
                  ref={genderRef}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                >
                  <option>선택</option>
                  <option>남</option>
                  <option>여</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">생년월일을 적어주세요.</label>
                <input
                  ref={dateOfBirthRef}
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">사무실 연락처를 적어주세요.</label>
                <input
                  ref={officePhoneRef}
                  type="tel"
                  value={officePhone}
                  onChange={(e) => setOfficePhone(e.target.value)}
                  placeholder="사무실 연락처를 적어주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">회사 메일을 적어주세요.</label>
                <input
                  ref={companyEmailRef}
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="회사 메일을 적어주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">철도 관련 자격증 보유 여부를 적어주세요.</label>
                <input
                  ref={railroadCertificationRef}
                  type="text"
                  value={railroadCertification}
                  onChange={(e) => setRailroadCertification(e.target.value)}
                  placeholder="자격증 여부를 적어주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">직무교육이수 여부(2학점 인정)를 적어주세요.</label>
                <input
                  ref={jobEducationRef}
                  type="text"
                  value={jobEducation}
                  onChange={(e) => setJobEducation(e.target.value)}
                  placeholder="교육 이수 여부를 적어주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">건강검진 일시를 적어주세요.</label>
                <input
                  ref={healthCheckDateRef}
                  type="datetime-local"
                  value={healthCheckDate}
                  onChange={(e) => setHealthCheckDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">건강검진시 체온을 적어주세요.</label>
                <input
                  ref={bodyTemperatureRef}
                  type="number"
                  step="0.1"
                  value={bodyTemperature}
                  onChange={(e) => setBodyTemperature(e.target.value)}
                  placeholder="체온을 입력해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">건강검진시 수축기 혈압을 적어주세요.</label>
                <input
                  ref={systolicBPRef}
                  type="number"
                  value={systolicBP}
                  onChange={(e) => setSystolicBP(e.target.value)}
                  placeholder="수축기 혈압을 입력해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">건강검진시 이완기 혈압을 적어주세요.</label>
                <input
                  ref={diastolicBPRef}
                  type="number"
                  value={diastolicBP}
                  onChange={(e) => setDiastolicBP(e.target.value)}
                  placeholder="이완기 혈압을 입력해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">건강검진시 맥박을 적어주세요.</label>
                <input
                  ref={pulseRef}
                  type="number"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  placeholder="맥박을 입력해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">근무유형을 적어주세요. ex) 야간격일 O조, 4조 2교대 O조, 통상일근, 시차O형 등</label>
                <input
                  ref={workTypeRef}
                  type="text"
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  placeholder="근무유형을 적어주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">출근/퇴근일시를 적어주세요. ex) 09:00/18:00 등</label>
                <input
                  ref={workTimeRef}
                  type="text"
                  value={workTime}
                  onChange={(e) => setWorkTime(e.target.value)}
                  placeholder="시간을 입력해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">사원증 출입증 일련번호를 적어주세요.</label>
                <input
                  ref={employeeCardNumberRef}
                  type="text"
                  value={employeeCardNumber}
                  onChange={(e) => setEmployeeCardNumber(e.target.value)}
                  placeholder="사원증 일련번호를 적어주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* 문제 선택 섹션 */}
            <div className="mb-8 pb-8 border-b">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                설문할 문제를 2개 선택해주세요
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SURVEY_DATA.map((question) => (
                  <button
                    key={question.id}
                    onClick={() => handleQuestionSelect(question.id)}
                    className={`p-4 rounded-lg font-bold text-center transition-all ${
                      selectedQuestionIds.includes(question.id)
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <div className="text-lg">{question.id}번</div>
                    <div className="text-sm mt-2">{question.psf}</div>
                  </button>
                ))}
              </div>
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 mb-4">
                  선택된 문제: {selectedQuestionIds.length}/2
                </p>
                <button
                  onClick={handleStartSurvey}
                  disabled={selectedQuestionIds.length !== 2}
                  className={`px-8 py-3 rounded-md font-bold text-white ${
                    selectedQuestionIds.length === 2
                      ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  설문 시작
                </button>
              </div>
            </div>
          </>
        )}

        {/* 설문 진행 중 */}
        {!showQuestionSelector && isInfoFormFilled && (
          <>
            {/* 에러 메시지 */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* 현재 라운드 정보 */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-700">
                현재: {currentRound}/{TOTAL_ROUNDS}회 - 선택된 문제: {selectedQuestionIds.join(', ')}번
              </p>
            </div>

            {/* 질문들 */}
            <div className="space-y-12 mb-8">
              {questions.map((question) => (
                <MultipleChoiceQuestion
                  key={question.id}
                  question={question}
                />
              ))}
            </div>

            {/* 버튼 */}
            <div className="flex gap-4 justify-end pt-8 border-t">
              <button
                onClick={handleComplete}
                disabled={completed}
                className={`px-6 py-2 rounded-md font-medium ${
                  completed
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                완료
              </button>

              <button
                onClick={handleSubmit}
                disabled={!completed}
                className={`px-6 py-2 rounded-md font-medium ${
                  completed
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                }`}
              >
                제출
              </button>
            </div>

            {/* 진행도 */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                진행률: {completed ? TOTAL_ROUNDS : currentRound - 1}/{TOTAL_ROUNDS}회 완료
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
