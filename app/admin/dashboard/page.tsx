'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Supabase에서 가져온 데이터 타입
interface SurveyData {
  id: number;
  name: string;
  affiliation: string;
  job: string;
  years: number;
  round: number;
  saved_at: string;
  employee_id: string;
  position: string;
  department: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJob, setFilterJob] = useState('전체');
  const [sortBy, setSortBy] = useState<'name' | 'job' | 'years'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [surveyData, setSurveyData] = useState<SurveyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // 로그인 확인
    const loggedIn = sessionStorage.getItem('adminLoggedIn');
    if (!loggedIn) {
      router.push('/admin');
    } else {
      setIsLoggedIn(true);
      fetchSurveyData();
    }
  }, [router]);

  // Supabase에서 데이터 가져오기
  const fetchSurveyData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // 환경변수 확인
      console.log('Environment check:', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });

      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .order('saved_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setError(`데이터를 불러오는데 실패했습니다: ${error.message}`);
        setSurveyData([]); // 에러시 빈 배열
      } else {
        // Supabase 데이터를 UI 형식에 맞게 변환
        const formattedData = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          affiliation: item.affiliation,
          job: item.job,
          years: parseInt(item.years) || 0,
          round: item.round,
          saved_at: item.saved_at,
          employee_id: item.employee_id || 'N/A',
          position: item.position || 'N/A',
          department: item.department || 'N/A',
        }));
        setSurveyData(formattedData);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setSurveyData([]); // 에러시 빈 배열
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminLoggedIn');
    router.push('/admin');
  };

  // 필터링된 데이터
  const filteredData = surveyData.filter((item) => {
    const matchSearch = 
      item.name.includes(searchTerm) || 
      item.affiliation.includes(searchTerm) ||
      item.employee_id.includes(searchTerm);
    const matchJob = filterJob === '전체' || item.job === filterJob;
    
    return matchSearch && matchJob;
  });

  // 사용자별로 그룹화 (이름 + 사번으로 구분)
  const groupedData = filteredData.reduce((acc, item) => {
    const key = `${item.name}_${item.employee_id}`;
    if (!acc[key]) {
      acc[key] = {
        ...item,
        totalRounds: 1,
      };
    } else {
      acc[key].totalRounds += 1;
    }
    return acc;
  }, {} as Record<string, any>);

  const uniqueUsers = Object.values(groupedData);

  // 정렬
  const sortedUsers = [...uniqueUsers].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'job') {
      comparison = a.job.localeCompare(b.job);
    } else if (sortBy === 'years') {
      comparison = a.years - b.years;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  if (!isLoggedIn) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p>로그인 확인 중...</p>
    </div>;
  }

  if (isLoading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">데이터를 불러오는 중...</p>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">설문 결과 관리</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">❌ {error}</p>
            <p className="text-sm text-red-600 mt-1">Supabase 연결을 확인해주세요.</p>
          </div>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">총 응답자</h3>
            <p className="text-3xl font-bold text-blue-600">{uniqueUsers.length}명</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">총 응답 수</h3>
            <p className="text-3xl font-bold text-green-600">{surveyData.length}회</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">평균 완료율</h3>
            <p className="text-3xl font-bold text-purple-600">
              {uniqueUsers.length > 0 ? Math.round((surveyData.length / uniqueUsers.length / 30) * 100) : 0}%
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">최근 응답</h3>
            <p className="text-sm font-semibold text-gray-700">
              {surveyData.length > 0 
                ? new Date(surveyData[0]?.saved_at).toLocaleDateString('ko-KR')
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                검색 (이름, 회사, 사번)
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="검색어를 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종사자 구분
              </label>
              <select
                value={filterJob}
                onChange={(e) => setFilterJob(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="전체">전체</option>
                <option value="기관사">기관사</option>
                <option value="관제사">관제사</option>
                <option value="승무원">승무원</option>
                <option value="작업자">작업자</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                정렬 기준
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'job' | 'years')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name">이름순</option>
                <option value="job">직업별</option>
                <option value="years">근속년수</option>
              </select>
            </div>
          </div>
          
          {/* 정렬 순서 버튼 */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">정렬 순서:</span>
            <button
              onClick={() => setSortOrder('asc')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                sortOrder === 'asc'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              오름차순 ↑
            </button>
            <button
              onClick={() => setSortOrder('desc')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                sortOrder === 'desc'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              내림차순 ↓
            </button>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사번
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    아이디
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    회사
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    직급
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    종사자 구분
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    근속년수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    완료 회차
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    최근 작성일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uniqueUsers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map((user) => (
                    <tr key={`${user.name}_${user.employee_id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{user.employee_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">ID-{user.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.affiliation}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{user.position}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {user.job}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.years}년</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.totalRounds} / 30
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(user.totalRounds / 30) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.saved_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          onClick={() => alert(`${user.name}님의 상세 정보 (구현 예정)`)}
                        >
                          상세보기
                        </button>
                        <button
                          className="text-green-600 hover:text-green-900"
                          onClick={() => alert(`데이터 다운로드 (구현 예정)`)}
                        >
                          다운로드
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 페이지네이션 (나중에 구현 예정) */}
        <div className="mt-6 flex justify-center">
          <div className="text-sm text-gray-500">
            총 {sortedUsers.length}명의 응답자
          </div>
        </div>
      </main>
    </div>
  );
}