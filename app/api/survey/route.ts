import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(request: NextRequest) {
  try {
    // 환경변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('Environment check:');
    console.log('supabaseUrl exists:', !!supabaseUrl);
    console.log('supabaseServiceRoleKey exists:', !!supabaseServiceRoleKey);

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { 
          success: false, 
          message: '환경변수가 설정되지 않았습니다.',
          missingUrl: !supabaseUrl,
          missingKey: !supabaseServiceRoleKey
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const data = await request.json();

    // Supabase 데이터베이스에 저장
    const surveyData = {
      name: data.name,
      affiliation: data.affiliation,
      job: data.job,
      years: parseInt(data.years) || 0,
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

    console.log('Survey data to save:', surveyData);

    const { error, data: insertedData } = await supabase
      .from('survey_responses')
      .insert([surveyData])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          success: false, 
          message: `데이터베이스 저장 중 오류가 발생했습니다. ${error.message}`,
          error: error.message,
          code: error.code,
          hint: error.hint || null,
          details: error.details || null
        },
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
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error instanceof Error ? error.constructor.name : 'Unknown');
    console.error('Error stack:', error instanceof Error ? error.stack : 'Unknown error');
    
    let errorMessage = '저장 중 오류가 발생했습니다.';
    let errorDetails = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    } else if (typeof error === 'object' && error !== null) {
      errorDetails = error;
      errorMessage = JSON.stringify(error);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: `저장 중 오류가 발생했습니다. ${errorMessage}`,
        error: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}
