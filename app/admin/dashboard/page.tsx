'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SURVEY_DATA, ALL_OPTION_LISTS } from '@/lib/surveyData';

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
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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
        // Supabase 데이터를 UI 형식에 맞게 변환 (questions 포함)
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
          questions: item.questions || [], // questions 데이터 포함
          // 모든 필드 포함
          gender: item.gender,
          date_of_birth: item.date_of_birth,
          office_phone: item.office_phone,
          company_email: item.company_email,
          railroad_certification: item.railroad_certification,
          job_education: item.job_education,
          health_check_date: item.health_check_date,
          body_temperature: item.body_temperature,
          systolic_bp: item.systolic_bp,
          diastolic_bp: item.diastolic_bp,
          pulse: item.pulse,
          work_type: item.work_type,
          work_time: item.work_time,
          employee_card_number: item.employee_card_number,
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
        totalRounds: filteredData.filter(d => `${d.name}_${d.employee_id}` === key).length,
      };
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
            <div className="flex gap-3">
              <button
                onClick={() => fetchSurveyData()}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? '로딩 중...' : '🔄 새로고침'}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                로그아웃
              </button>
            </div>
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
            <span className="text-sm font-medium text-gray-700">
              {sortBy === 'name' ? '이름' : sortBy === 'job' ? '직업' : '근속년수'} 정렬 순서:
            </span>
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
                          className="text-blue-600 hover:text-blue-900"
                          onClick={() => {
                            // 해당 사용자의 모든 회차 데이터 찾기
                            const userAllRounds = surveyData.filter(
                              item => item.name === user.name && item.employee_id === user.employee_id
                            );
                            setSelectedUser({
                              ...user,
                              allRounds: userAllRounds
                            });
                            setShowDetailModal(true);
                          }}
                        >
                          상세보기
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

      {/* 상세보기 모달 */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* 헤더 */}
            <div className="sticky top-0 bg-gray-800 px-6 py-5 flex justify-between items-center shadow-md z-10">
              <div>
                <h2 className="text-2xl font-bold text-white">응답 상세정보</h2>
                <p className="text-gray-300 text-sm mt-1">
                  {selectedUser?.name} ({selectedUser?.employee_id})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedUser(null);
                }}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 bg-gray-50">
              {/* 기본 정보 */}
              <div className="mb-6 bg-white rounded-lg shadow-sm p-5">
                <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  기본 정보
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">이름</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.name || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">사번</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.employee_id || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">소속</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.affiliation || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">직급</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.position || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">부서</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.department || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">종사자 구분</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.job || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">근속년수</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.years || 0}년</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">성별</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.gender || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">생년월일</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.date_of_birth || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">사무실 전화</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.office_phone || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">회사 이메일</span>
                    <p className="text-sm font-medium text-gray-900 truncate" title={selectedUser?.company_email}>
                      {selectedUser?.company_email || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">철도자격증</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.railroad_certification || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">직무교육</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.job_education || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">건강검진일</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.health_check_date || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* 건강 정보 */}
              <div className="mb-6 bg-white rounded-lg shadow-sm p-5">
                <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  건강 정보
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">체온</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.body_temperature || 'N/A'}°C</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">수축기 혈압</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.systolic_bp || 'N/A'} mmHg</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">이완기 혈압</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.diastolic_bp || 'N/A'} mmHg</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">맥박</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.pulse || 'N/A'} bpm</p>
                  </div>
                </div>
              </div>

              {/* 근무 정보 */}
              <div className="mb-6 bg-white rounded-lg shadow-sm p-5">
                <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  근무 정보
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">근무 형태</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.work_type || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">근무 시간</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.work_time || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">사원증 번호</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.employee_card_number || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">총 회차</span>
                    <p className="text-sm font-medium text-gray-900">{selectedUser?.allRounds?.length || 0}회차</p>
                  </div>
                </div>
              </div>

              {/* 모든 회차 설문 응답 */}
              <div className="mb-6">
                <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center justify-between">
                    전체 설문 응답
                    <span className="bg-gray-800 text-white px-3 py-1 rounded-md text-sm font-semibold">
                      총 {selectedUser?.allRounds?.length || 0}회차
                    </span>
                  </h3>
                </div>
                {selectedUser?.allRounds && Array.isArray(selectedUser.allRounds) && selectedUser.allRounds.length > 0 ? (
                  <div className="space-y-4">
                    {selectedUser.allRounds
                      .sort((a: any, b: any) => a.round - b.round)
                      .map((roundData: any, roundIdx: number) => (
                      <div key={roundIdx} className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                        {/* 회차 헤더 */}
                        <div className="bg-gray-700 px-5 py-3 flex justify-between items-center">
                          <div className="flex items-center">
                            <span className="bg-white text-gray-700 font-bold px-3 py-1 rounded-md text-base">
                              {roundData.round}회차
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium text-sm">
                              {roundData.saved_at ? new Date(roundData.saved_at).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        {/* 설문 응답 테이블 */}
                        {roundData.questions && Array.isArray(roundData.questions) && roundData.questions.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 w-28">
                                    PSF 번호
                                  </th>
                                  <th className="px-5 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 w-24">
                                    선택 답변
                                  </th>
                                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    설문 조건
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {roundData.questions.map((q: any, qIdx: number) => (
                                  <tr key={qIdx} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-4 border-r border-gray-200">
                                      <span className="inline-flex items-center px-3 py-1 rounded-md bg-gray-100 text-gray-800 font-semibold text-sm">
                                        PSF {q?.id || 'N/A'}
                                      </span>
                                    </td>
                                    <td className="px-5 py-4 text-center border-r border-gray-200">
                                      <span className="inline-flex items-center justify-center w-9 h-9 bg-gray-800 text-white rounded-md font-bold text-base">
                                        {q?.answer || 'N/A'}
                                      </span>
                                    </td>
                                    <td className="px-5 py-4">
                                      {(() => {
                                        // 저장된 conditions 객체에서 실제 선택된 조건만 표시
                                        const savedConditions = q?.conditions;
                                        
                                        if (!savedConditions || typeof savedConditions !== 'object') {
                                          return <span className="text-gray-400 italic text-sm">조건 없음</span>;
                                        }

                                        const conditionEntries = Object.entries(savedConditions);
                                        
                                        if (conditionEntries.length === 0) {
                                          return <span className="text-gray-400 italic text-sm">조건 없음</span>;
                                        }

                                        return (
                                          <div className="space-y-1.5">
                                            {conditionEntries.map(([label, value], idx) => (
                                              <div key={idx} className="flex items-start">
                                                <span className="inline-flex items-center bg-gray-700 text-white font-semibold text-xs px-2 py-1 rounded mr-2 whitespace-nowrap">
                                                  {label}
                                                </span>
                                                <span className="text-gray-800 text-sm">
                                                  {value as string}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="px-4 py-8 text-center text-gray-500">
                            이 회차의 설문 응답 데이터가 없습니다.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">설문 응답 데이터가 없습니다.</p>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedUser(null);
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}