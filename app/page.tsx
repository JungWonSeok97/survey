'use server';

import { redirect } from 'next/navigation';

export default function Home() {
  // Server-side redirect to the survey page to avoid client-side routing issues
  redirect('/survey');
}
