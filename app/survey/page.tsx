'use client';

import Link from 'next/link';

export default function SurveySelectPage() {
  const groups = [
    { id: 1, name: 'Group 1', questions: '1번, 2번' },
    { id: 2, name: 'Group 2', questions: '3번, 4번' },
    { id: 3, name: 'Group 3', questions: '5번, 6번' },
    { id: 4, name: 'Group 4', questions: '7번, 8번' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">설문지 소프트웨어</h1>
          <p className="text-gray-600">
            설문할 그룹을 선택해주세요.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/survey/group${group.id}`}
              className="block p-6 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition-all"
            >
              <h2 className="text-xl font-bold text-blue-800 mb-2">{group.name}</h2>
              <p className="text-blue-600">문제: {group.questions}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
