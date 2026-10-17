import { refreshSession } from '@smartapp/data/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest): Promise<Response> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'placeholder-key';
  return refreshSession(request, supabaseUrl, supabaseKey, NextResponse.next({ request }));
}

export default proxy;
