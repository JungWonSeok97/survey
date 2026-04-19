"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

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
  occupation_detail?: string;
  overtime_period?: string;
  overtime_long?: string;
  physical_effort?: string;
  cognitive_focus?: string;
  accident_loss?: string;
}

const FINAL_SURVEY_FIELDS = [
  { key: "occupation_detail", label: "상세 직종" },
  { key: "overtime_period", label: "초과근무 빈도" },
  { key: "overtime_long", label: "평균 초과근무 길이" },
  { key: "physical_effort", label: "신체 부하" },
  { key: "cognitive_focus", label: "인지 부하" },
  { key: "accident_loss", label: "사고로 인한 손실" },
] as const;

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [surveyData, setSurveyData] = useState<SurveyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [yearsFilter, setYearsFilter] = useState<string>("all"); // 근속년수 필터

  useEffect(() => {
    // 로그인 확인
    const loggedIn = sessionStorage.getItem("adminLoggedIn");
    if (!loggedIn) {
      router.push("/admin");
    } else {
      setIsLoggedIn(true);
      fetchSurveyData();
    }
  }, [router]);

  // Supabase에서 데이터 가져오기
  const fetchSurveyData = async () => {
    try {
      setIsLoading(true);
      setError("");

      // 환경변수 확인
      console.log("Environment check:", {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });

      // 모든 데이터를 가져오기 위해 페이지네이션 사용
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("survey_responses")
          .select("*")
          .order("saved_at", { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) {
          console.error("Supabase error:", error);
          console.error("Error details:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          setError(`데이터를 불러오는데 실패했습니다: ${error.message}`);
          setSurveyData([]);
          return;
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += pageSize;
          hasMore = data.length === pageSize; // 1000개 미만이면 마지막 페이지
        } else {
          hasMore = false;
        }
      }

      console.log("📊 Supabase 조회 결과:", {
        총_레코드_수: allData.length,
        페이지_수: Math.ceil(allData.length / pageSize),
      });

      // Supabase 데이터를 UI 형식에 맞게 변환 (questions 포함)
      const formattedData = (allData || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        affiliation: item.affiliation,
        job: item.job,
        years: parseInt(item.years) || 0,
        round: item.round,
        saved_at: item.saved_at,
        employee_id: item.employee_id || "N/A",
        position: item.position || "N/A",
        department: item.department || "N/A",
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
        occupation_detail: item.occupation_detail,
        overtime_period: item.overtime_period,
        overtime_long: item.overtime_long,
        physical_effort: item.physical_effort,
        cognitive_focus: item.cognitive_focus,
        accident_loss: item.accident_loss,
      }));

      console.log("✅ 데이터 변환 완료:", {
        변환된_데이터_수: formattedData.length,
        고유_사용자_수: new Set(
          formattedData.map((d: any) => `${d.name}_${d.employee_id}`),
        ).size,
      });

      setSurveyData(formattedData);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
      setSurveyData([]); // 에러시 빈 배열
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminLoggedIn");
    router.push("/admin");
  };

  const handleExportToExcel = () => {
    // 엑셀로 내보낼 데이터 준비 (round, questions 제외한 모든 개인정보)
    const excelData = sortedUsers.map((user) => ({
      이름: user.name,
      사번: user.employee_id,
      성별: user.gender || "N/A",
      생년월일: user.date_of_birth || "N/A",
      회사: user.affiliation,
      부서: user.department || "N/A",
      직급: user.position,
      종사자구분: user.job,
      근속년수: user.years,
      사무실전화: user.office_phone || "N/A",
      회사이메일: user.company_email || "N/A",
      사원증번호: user.employee_card_number || "N/A",
      철도자격증: user.railroad_certification || "N/A",
      직무교육: user.job_education || "N/A",
      건강검진일: user.health_check_date || "N/A",
      체온: user.body_temperature || "N/A",
      수축기혈압: user.systolic_bp || "N/A",
      이완기혈압: user.diastolic_bp || "N/A",
      맥박: user.pulse || "N/A",
      근무형태: user.work_type || "N/A",
      근무시간: user.work_time || "N/A",
      완료회차: user.totalRounds,
      최근저장일시: new Date(user.saved_at).toLocaleString("ko-KR"),
    }));

    // 워크시트 생성
    const enrichedExcelData = excelData.map((row, index) => ({
      ...row,
      상세직종: sortedUsers[index]?.occupation_detail || "N/A",
      초과근무빈도: sortedUsers[index]?.overtime_period || "N/A",
      평균초과근무길이: sortedUsers[index]?.overtime_long || "N/A",
      신체부하: sortedUsers[index]?.physical_effort || "N/A",
      인지부하: sortedUsers[index]?.cognitive_focus || "N/A",
      사고손실수준: sortedUsers[index]?.accident_loss || "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(enrichedExcelData);

    // 컬럼 너비 설정
    const colWidths = [
      { wch: 10 }, // 이름
      { wch: 15 }, // 사번
      { wch: 8 }, // 성별
      { wch: 12 }, // 생년월일
      { wch: 20 }, // 회사
      { wch: 15 }, // 부서
      { wch: 12 }, // 직급
      { wch: 12 }, // 종사자구분
      { wch: 10 }, // 근속년수
      { wch: 15 }, // 사무실전화
      { wch: 25 }, // 회사이메일
      { wch: 15 }, // 사원증번호
      { wch: 15 }, // 철도자격증
      { wch: 15 }, // 직무교육
      { wch: 12 }, // 건강검진일
      { wch: 8 }, // 체온
      { wch: 12 }, // 수축기혈압
      { wch: 12 }, // 이완기혈압
      { wch: 8 }, // 맥박
      { wch: 12 }, // 근무형태
      { wch: 12 }, // 근무시간
      { wch: 10 }, // 완료회차
      { wch: 20 }, // 최근저장일시
    ];
    worksheet["!cols"] = colWidths;

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "설문조사 결과");

    // 파일명 생성 (현재 날짜 포함)
    const fileName = `설문조사_결과_${new Date().toLocaleDateString("ko-KR").replace(/\. /g, "-").replace(".", "")}.xlsx`;

    // 파일 다운로드
    XLSX.writeFile(workbook, fileName);
  };

  // 사용자별로 그룹화 (이름 + 사번으로 구분)
  const groupedData = surveyData.reduce(
    (acc, item) => {
      const key = `${item.name}_${item.employee_id}`;

      // 해당 키가 없거나, 더 최근 데이터라면 업데이트
      if (!acc[key] || new Date(item.saved_at) > new Date(acc[key].saved_at)) {
        const totalRounds = surveyData.filter(
          (d) => `${d.name}_${d.employee_id}` === key,
        ).length;
        acc[key] = {
          ...item,
          totalRounds,
        };
      }

      return acc;
    },
    {} as Record<string, any>,
  );

  const uniqueUsers = Object.values(groupedData);

  // 통계 계산
  const stats = {
    // 평균 근속년수
    avgYears:
      uniqueUsers.length > 0
        ? (
            uniqueUsers.reduce(
              (sum: number, user: any) => sum + (user.years || 0),
              0,
            ) / uniqueUsers.length
          ).toFixed(1)
        : 0,

    // 평균 나이 (생년월일 기반)
    avgAge: (() => {
      const usersWithBirth = uniqueUsers.filter(
        (user: any) => user.date_of_birth,
      );
      if (usersWithBirth.length === 0) return "N/A";
      const totalAge = usersWithBirth.reduce((sum: number, user: any) => {
        const birthYear = new Date(user.date_of_birth).getFullYear();
        const currentYear = new Date().getFullYear();
        return sum + (currentYear - birthYear);
      }, 0);
      return (totalAge / usersWithBirth.length).toFixed(1);
    })(),

    // 종사자 구분별 수
    jobCounts: uniqueUsers.reduce((acc: any, user: any) => {
      const job = user.job || "미지정";
      acc[job] = (acc[job] || 0) + 1;
      return acc;
    }, {}),

    // 직급별 수
    positionCounts: uniqueUsers.reduce((acc: any, user: any) => {
      const position = user.position || "미지정";
      acc[position] = (acc[position] || 0) + 1;
      return acc;
    }, {}),
  };

  // 차트 데이터 변환
  const jobChartData = Object.entries(stats.jobCounts).map(([name, value]) => ({
    name,
    value: value as number,
  }));

  const positionChartData = Object.entries(stats.positionCounts).map(
    ([name, value]) => ({
      name,
      value: value as number,
    }),
  );

  // 차트 색상
  const JOB_COLORS = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
  ];
  const POSITION_COLORS = [
    "#6366F1",
    "#14B8A6",
    "#F97316",
    "#E11D48",
    "#8B5CF6",
    "#06B6D4",
    "#84CC16",
  ];

  // 근속년수 필터링
  const filteredUsers = uniqueUsers.filter((user: any) => {
    if (yearsFilter === "all") return true;
    if (yearsFilter === "under10") return user.years < 10;
    if (yearsFilter === "10to20") return user.years >= 10 && user.years < 20;
    if (yearsFilter === "20to30") return user.years >= 20 && user.years < 30;
    if (yearsFilter === "over30") return user.years >= 30;
    return true;
  });

  // saved_at으로 내림차순 정렬 (최신 데이터가 위로)
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime();
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>로그인 확인 중...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">설문 결과 확인</h1>
            <div className="flex gap-3">
              <button
                onClick={handleExportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center gap-2"
              >
                📊 엑셀 다운로드
              </button>
              <button
                onClick={() => fetchSurveyData()}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? "로딩 중..." : "🔄 새로고침"}
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
            <p className="text-sm text-red-600 mt-1">
              Supabase 연결을 확인해주세요.
            </p>
          </div>
        )}

        {/* 기본 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-xs font-medium text-gray-500 mb-1">
              총 응답자
            </h3>
            <p className="text-2xl font-bold text-blue-600">
              {uniqueUsers.length}명
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-xs font-medium text-gray-500 mb-1">
              총 응답 수
            </h3>
            <p className="text-2xl font-bold text-green-600">
              {surveyData.length}회
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-xs font-medium text-gray-500 mb-1">
              평균 완료율
            </h3>
            <p className="text-2xl font-bold text-purple-600">
              {uniqueUsers.length > 0
                ? Math.round(
                    (surveyData.length / uniqueUsers.length / 30) * 100,
                  )
                : 0}
              %
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-xs font-medium text-gray-500 mb-1">
              평균 근속년수
            </h3>
            <p className="text-2xl font-bold text-orange-600">
              {stats.avgYears}년
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-xs font-medium text-gray-500 mb-1">
              평균 나이
            </h3>
            <p className="text-2xl font-bold text-pink-600">{stats.avgAge}세</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-xs font-medium text-gray-500 mb-1">
              최근 응답
            </h3>
            <p className="text-sm font-semibold text-gray-700 mt-1">
              {surveyData.length > 0
                ? new Date(surveyData[0]?.saved_at).toLocaleDateString("ko-KR")
                : "N/A"}
            </p>
          </div>
        </div>

        {/* 종사자 구분 & 직급 통계 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 종사자 구분별 통계 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              종사자 구분별 현황
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-4">
              {/* 종사자 구분 목록 */}
              <div className="flex-1 w-full">
                <div className="space-y-2">
                  {jobChartData.map((item, idx) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              JOB_COLORS[idx % JOB_COLORS.length],
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {item.value}명
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* 원형 차트 */}
              <div className="w-full md:w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={jobChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {jobChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={JOB_COLORS[index % JOB_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value}명`, "인원"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 직급별 통계 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              직급별 현황
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-4">
              {/* 직급 목록 */}
              <div className="flex-1 w-full">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {positionChartData.map((item, idx) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              POSITION_COLORS[idx % POSITION_COLORS.length],
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {item.value}명
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* 원형 차트 */}
              <div className="w-full md:w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={positionChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {positionChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={POSITION_COLORS[index % POSITION_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value}명`, "인원"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* 필터 영역 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              근속년수 필터:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setYearsFilter("all")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  yearsFilter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setYearsFilter("under10")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  yearsFilter === "under10"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                10년 미만
              </button>
              <button
                onClick={() => setYearsFilter("10to20")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  yearsFilter === "10to20"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                10년 이상
              </button>
              <button
                onClick={() => setYearsFilter("20to30")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  yearsFilter === "20to30"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                20년 이상
              </button>
              <button
                onClick={() => setYearsFilter("over30")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  yearsFilter === "over30"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                30년 이상
              </button>
            </div>
            {yearsFilter !== "all" && (
              <span className="text-sm text-gray-500">
                ({sortedUsers.length}명)
              </span>
            )}
          </div>
        </div>

        {/* 데이터 테이블/카드 */}
        <div className="bg-white rounded-lg shadow">
          {sortedUsers.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              검색 결과가 없습니다.
            </div>
          ) : (
            <>
              {/* 데스크톱: 테이블 뷰 */}
              <div className="hidden lg:block overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        이름
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        사번
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        회사
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        직급
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        종사자 구분
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        근속년수
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        완료 회차
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        최근 작성일
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedUsers.map((user) => (
                      <tr
                        key={`${user.name}_${user.employee_id}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {user.employee_id}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.affiliation}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {user.position}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.job}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.years}년
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.totalRounds} / 30
                            <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${(user.totalRounds / 30) * 100}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(user.saved_at).toLocaleString("ko-KR")}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => {
                              const userAllRounds = surveyData.filter(
                                (item) =>
                                  item.name === user.name &&
                                  item.employee_id === user.employee_id,
                              );
                              setSelectedUser({
                                ...user,
                                allRounds: userAllRounds,
                              });
                              setShowDetailModal(true);
                            }}
                          >
                            상세보기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일/태블릿: 카드 뷰 */}
              <div className="lg:hidden divide-y divide-gray-200">
                {sortedUsers.map((user) => (
                  <div
                    key={`${user.name}_${user.employee_id}`}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-gray-900">
                          {user.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {user.employee_id}
                        </p>
                      </div>
                      <button
                        className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                        onClick={() => {
                          const userAllRounds = surveyData.filter(
                            (item) =>
                              item.name === user.name &&
                              item.employee_id === user.employee_id,
                          );
                          setSelectedUser({
                            ...user,
                            allRounds: userAllRounds,
                          });
                          setShowDetailModal(true);
                        }}
                      >
                        상세보기
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">회사:</span>
                        <p className="font-medium text-gray-900">
                          {user.affiliation}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">직급:</span>
                        <p className="font-medium text-gray-900">
                          {user.position}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">종사자 구분:</span>
                        <p className="mt-1">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.job}
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">근속년수:</span>
                        <p className="font-medium text-gray-900">
                          {user.years}년
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-500">완료 회차</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {user.totalRounds} / 30
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${(user.totalRounds / 30) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        최근 작성일:
                      </span>
                      <p className="text-sm text-gray-700 mt-0.5">
                        {new Date(user.saved_at).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
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
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
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
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      이름
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.name || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      사번
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.employee_id || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      소속
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.affiliation || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      직급
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.position || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      부서
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.department || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      종사자 구분
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.job || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      근속년수
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.years || 0}년
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      성별
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.gender || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      생년월일
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.date_of_birth || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      사무실 전화
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.office_phone || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      회사 이메일
                    </span>
                    <p
                      className="text-sm font-medium text-gray-900 truncate"
                      title={selectedUser?.company_email}
                    >
                      {selectedUser?.company_email || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      철도자격증
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.railroad_certification || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      직무교육
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.job_education || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      건강검진일
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.health_check_date || "N/A"}
                    </p>
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
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      체온
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.body_temperature || "N/A"}°C
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      수축기 혈압
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.systolic_bp || "N/A"} mmHg
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      이완기 혈압
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.diastolic_bp || "N/A"} mmHg
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      맥박
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.pulse || "N/A"} bpm
                    </p>
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
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      근무 형태
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.work_type || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      근무 시간
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.work_time || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      사원증 번호
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.employee_card_number || "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                      총 회차
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser?.allRounds?.length || 0}회차
                    </p>
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
                <div className="mb-6 bg-white rounded-lg shadow-sm p-5">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    추가 설문 정보
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {FINAL_SURVEY_FIELDS.map((field) => (
                      <div key={field.key} className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                          {field.label}
                        </span>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedUser?.[field.key] || "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedUser?.allRounds &&
                Array.isArray(selectedUser.allRounds) &&
                selectedUser.allRounds.length > 0 ? (
                  <div className="space-y-4">
                    {selectedUser.allRounds
                      .sort((a: any, b: any) => a.round - b.round)
                      .map((roundData: any, roundIdx: number) => (
                        <div
                          key={roundIdx}
                          className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm"
                        >
                          {/* 회차 헤더 */}
                          <div className="bg-gray-700 px-5 py-3 flex justify-between items-center">
                            <div className="flex items-center">
                              <span className="bg-white text-gray-700 font-bold px-3 py-1 rounded-md text-base">
                                {roundData.round}회차
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-medium text-sm">
                                {roundData.saved_at
                                  ? new Date(roundData.saved_at).toLocaleString(
                                      "ko-KR",
                                      {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )
                                  : "N/A"}
                              </p>
                            </div>
                          </div>

                          {/* 설문 응답 테이블 */}
                          {roundData.questions &&
                          Array.isArray(roundData.questions) &&
                          roundData.questions.length > 0 ? (
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
                                  {roundData.questions.map(
                                    (q: any, qIdx: number) => (
                                      <tr
                                        key={qIdx}
                                        className="hover:bg-gray-50 transition-colors"
                                      >
                                        <td className="px-5 py-4 border-r border-gray-200">
                                          <span className="font-semibold text-gray-800 text-sm">
                                            PSF {q?.id || "N/A"}
                                          </span>
                                        </td>
                                        <td className="px-5 py-4 text-center border-r border-gray-200">
                                          <span className="font-bold text-gray-800 text-lg">
                                            {q?.answer || "N/A"}
                                          </span>
                                        </td>
                                        <td className="px-5 py-4">
                                          {(() => {
                                            // 저장된 conditions 객체에서 실제 선택된 조건만 표시
                                            const savedConditions =
                                              q?.conditions;

                                            if (
                                              !savedConditions ||
                                              typeof savedConditions !==
                                                "object"
                                            ) {
                                              return (
                                                <span className="text-gray-400 italic text-sm">
                                                  조건 없음
                                                </span>
                                              );
                                            }

                                            const conditionEntries =
                                              Object.entries(savedConditions);

                                            if (conditionEntries.length === 0) {
                                              return (
                                                <span className="text-gray-400 italic text-sm">
                                                  조건 없음
                                                </span>
                                              );
                                            }

                                            return (
                                              <div className="space-y-1.5">
                                                {conditionEntries.map(
                                                  ([label, value], idx) => (
                                                    <div
                                                      key={idx}
                                                      className="flex items-start"
                                                    >
                                                      <span className="font-semibold text-gray-700 text-sm mr-2 whitespace-nowrap">
                                                        {label}:
                                                      </span>
                                                      <span className="text-gray-800 text-sm">
                                                        {value as string}
                                                      </span>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </td>
                                      </tr>
                                    ),
                                  )}
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
                  <p className="text-sm text-gray-500">
                    설문 응답 데이터가 없습니다.
                  </p>
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
