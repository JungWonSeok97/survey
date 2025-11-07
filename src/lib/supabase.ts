import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type SurveyResponse = {
  id?: string;
  name: string;
  affiliation: string;
  job: string;
  years: string;
  employeeId: string;
  position: string;
  department: string;
  gender: string;
  dateOfBirth: string;
  officePhone: string;
  companyEmail: string;
  railroadCertification: string;
  jobEducation: string;
  healthCheckDate: string;
  bodyTemperature: string;
  systolicBP: string;
  diastolicBP: string;
  pulse: string;
  workType: string;
  workTime: string;
  employeeCardNumber: string;
  round: number;
  questions: { questionId: number; answer: number }[];
  savedAt?: string;
};