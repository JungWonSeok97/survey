'use client';

import { useState, useEffect } from 'react';
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

  const TOTAL_ROUNDS = 10;

  // 초기 질문 로드
  useEffect(() => {
    populateQuestions();
  }, [currentRound]);

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
    const newQuestions = SURVEY_DATA.map((qDef: any) => {
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
      return false;
    }

    if (!/^[가-힣]+$/.test(name)) {
      setError('성명에는 특수문자나 공백을 사용할 수 없습니다.');
      return false;
    }

    if (!affiliation.trim()) {
      setError('소속을 입력해 주세요.');
      return false;
    }

    if (!/^[a-zA-Z0-9가-힣\s]+$/.test(affiliation)) {
      setError('소속(회사)에는 특수문자를 사용할 수 없습니다.');
      return false;
    }

    if (!years.trim()) {
      setError('근속기간을 입력해 주세요.');
      return false;
    }

    if (!/^\d+$/.test(years)) {
      setError('근속기간은 숫자만 입력할 수 있습니다.');
      return false;
    }

    if (job === '선택') {
      setError('종사자 구분을 선택해 주세요.');
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
          round: currentRound,
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
        setCurrentRound(currentRound + 1);
      } else {
        alert('모든 설문이 완료되었습니다.\n제출 버튼을 눌러주세요.');
        setCompleted(true);
      }
    } catch (err) {
      setError('저장 중 오류가 발생했습니다.');
    }
  };

  const handleReset = () => {
    setCurrentRound(1);
    setName('');
    setAffiliation('');
    setYears('');
    setJob('선택');
    setCompleted(false);
    setError('');
    populateQuestions();
  };

  const handleSubmit = () => {
    const recipient = 'jerry@bees.pro';
    const subject = `설문 결과 제출 (${name})`;
    const body = `안녕하세요.\n\n${name}(${job}, 소속 ${affiliation}, 근속 ${years}년)님이 작성한 설문 결과입니다.\n\n'survey_results' 폴더에 저장된 엑셀 파일들을 이 메일에 첨부하여 보내주세요.\n\n감사합니다.`;
    
    const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">설문지 소프트웨어</h1>
          <p className="text-gray-600">
            총 {TOTAL_ROUNDS}번의 설문을 완료해 주세요. 모두 완료되면 제출 버튼을 눌러주세요.
          </p>
        </div>

        {/* 입력 폼 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 pb-8 border-b">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">성명</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">소속(회사)</label>
            <input
              type="text"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              placeholder="소속을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">근속기간(년)</label>
            <input
              type="text"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              placeholder="숫자만 입력"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">종사자 구분</label>
            <select
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

          <div className="flex items-end">
            <button
              onClick={handleReset}
              className="w-full px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 font-medium"
            >
              Reset
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

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
      </div>
    </div>
  );
}
