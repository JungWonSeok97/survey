'use client';

interface Question {
  id: number;
  text: string;
  conditions: Record<string, string>;
  options: string[];
  details: Record<string, any>;
}

interface MultipleChoiceQuestionProps {
  question: Question;
}

export default function MultipleChoiceQuestion({ question }: MultipleChoiceQuestionProps) {
  const questionNumber = question.text.split('.')[0] + '.';
  const questionBody = question.text.split('. ').slice(1).join('. ');

  return (
    <div data-question-id={question.id} className="border-l-4 border-blue-500 pl-6">
      {/* 질문 제목 */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">
          <span className="text-blue-600">{questionNumber}</span> {questionBody}
        </h3>
      </div>

      {/* 조건 섹션 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-800 mb-4">조건</h4>
        <div className="grid grid-cols-1 gap-3">
          {Object.entries(question.conditions).map(([label, value]) => (
            <div key={label} className="bg-white p-3 rounded border border-gray-200">
              <p className="text-sm font-medium text-gray-700">• {label}: {value}</p>
              
              {/* 상세 설명 */}
              {question.details[label] && (
                <div className="mt-2 ml-4 text-sm text-gray-600">
                  {question.details[label].description && (
                    <p>- {question.details[label].description}</p>
                  )}
                  {question.details[label].description2 && (
                    <p>- {question.details[label].description2}</p>
                  )}
                  {question.details[label].description3 && (
                    <p>- {question.details[label].description3}</p>
                  )}
                  {question.details[label].nominal && (
                    <p>- Nominal: {question.details[label].nominal}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 선택지 */}
      <div className="space-y-3">
        {question.options.map((option) => (
          <label key={option} className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-blue-50 cursor-pointer">
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option}
              className="w-4 h-4 text-blue-600"
            />
            <span className="ml-3 text-gray-900 font-medium">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
