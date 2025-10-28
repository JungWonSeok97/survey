import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Supabase 데이터베이스에 저장
    const surveyData = {
      name: data.name,
      affiliation: data.affiliation,
      job: data.job,
      years: data.years,
      employee_id: data.employeeId,
      position: data.position,
      department: data.department,
      gender: data.gender,
      date_of_birth: data.dateOfBirth,
      office_phone: data.officePhone,
      company_email: data.companyEmail,
      railroad_certification: data.railroadCertification,
      job_education: data.jobEducation,
      health_check_date: data.healthCheckDate,
      body_temperature: data.bodyTemperature,
      systolic_bp: data.systolicBP,
      diastolic_bp: data.diastolicBP,
      pulse: data.pulse,
      work_type: data.workType,
      work_time: data.workTime,
      employee_card_number: data.employeeCardNumber,
      round: data.round,
      questions: data.questions,
      saved_at: new Date().toISOString(),
    };

    const { error, data: insertedData } = await supabase
      .from('survey_responses')
      .insert([surveyData])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { success: false, message: '데이터베이스 저장 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '저장되었습니다.',
      id: insertedData?.[0]?.id,
    });
  } catch (error) {
    console.error('Survey save error:', error);
    return NextResponse.json(
      { success: false, message: '저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
