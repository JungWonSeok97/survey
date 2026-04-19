import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const FINAL_SURVEY_KEYS = [
  'occupationDetail',
  'overtimePeriod',
  'overtimeLong',
  'physicalEffort',
  'cognitiveFocus',
  'accidentLoss',
] as const;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

function getMissingFinalSurveyFields(data: Record<string, unknown>) {
  return FINAL_SURVEY_KEYS.filter((key) => {
    const value = data[key];
    return typeof value !== 'string' || !value.trim();
  });
}

function buildFinalSurveyData(data: Record<string, unknown>) {
  return {
    occupation_detail: (data.occupationDetail as string).trim(),
    overtime_period: (data.overtimePeriod as string).trim(),
    overtime_long: (data.overtimeLong as string).trim(),
    physical_effort: (data.physicalEffort as string).trim(),
    cognitive_focus: (data.cognitiveFocus as string).trim(),
    accident_loss: (data.accidentLoss as string).trim(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          message: 'Supabase environment variables are missing.',
          missingUrl: !process.env.NEXT_PUBLIC_SUPABASE_URL,
          missingKey: !process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        { status: 500 },
      );
    }

    const data = (await request.json()) as Record<string, unknown>;

    if (Array.isArray(data.responseIds)) {
      const responseIds = data.responseIds
        .map((id) => (typeof id === 'string' ? id.trim() : ''))
        .filter((id) => id.length > 0);

      if (responseIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'No saved survey response ids were provided.',
          },
          { status: 400 },
        );
      }

      const missingFinalSurveyFields = getMissingFinalSurveyFields(data);

      if (missingFinalSurveyFields.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Final survey answers are incomplete.',
            missingFields: missingFinalSurveyFields,
          },
          { status: 400 },
        );
      }

      const finalSurveyData = buildFinalSurveyData(data);

      const { data: updatedRows, error } = await supabase
        .from('survey_responses')
        .update(finalSurveyData)
        .in('id', responseIds)
        .select('id');

      if (error) {
        console.error('Supabase final survey update error:', error);
        return NextResponse.json(
          {
            success: false,
            message: `Failed to save final survey answers. ${error.message}`,
            error: error.message,
            code: error.code,
            hint: error.hint || null,
            details: error.details || null,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Final survey answers were saved.',
        updatedCount: updatedRows?.length ?? 0,
      });
    }

    const surveyData = {
      name: data.name,
      affiliation: data.affiliation,
      job: data.job,
      years: parseInt(String(data.years ?? ''), 10) || 0,
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
      occupation_detail: typeof data.occupationDetail === 'string' ? data.occupationDetail : '',
      overtime_period: typeof data.overtimePeriod === 'string' ? data.overtimePeriod : '',
      overtime_long: typeof data.overtimeLong === 'string' ? data.overtimeLong : '',
      physical_effort: typeof data.physicalEffort === 'string' ? data.physicalEffort : '',
      cognitive_focus: typeof data.cognitiveFocus === 'string' ? data.cognitiveFocus : '',
      accident_loss: typeof data.accidentLoss === 'string' ? data.accidentLoss : '',
      round: data.round,
      questions: data.questions,
      saved_at: new Date().toISOString(),
    };

    const { error, data: insertedData } = await supabase
      .from('survey_responses')
      .insert([surveyData])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        {
          success: false,
          message: `Failed to save survey response. ${error.message}`,
          error: error.message,
          code: error.code,
          hint: error.hint || null,
          details: error.details || null,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Survey response was saved.',
      id: insertedData?.id ?? null,
    });
  } catch (error) {
    console.error('Survey save error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown survey save error';

    return NextResponse.json(
      {
        success: false,
        message: `An error occurred while saving the survey. ${errorMessage}`,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
