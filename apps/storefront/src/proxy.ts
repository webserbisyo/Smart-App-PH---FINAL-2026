import { refreshSession } from '@smartapp/data/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest): Promise<Response> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }
  return refreshSession(request, supabaseUrl, supabaseKey, NextResponse.next({ request }));
}

export default proxy;
