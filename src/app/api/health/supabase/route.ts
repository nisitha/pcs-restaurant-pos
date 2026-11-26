import { NextResponse } from 'next/server';
import { getSupabaseUrl, getSupabaseAnonKey, createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const url = getSupabaseUrl();
    const anonKey = getSupabaseAnonKey();

    const isUrlConfigured = Boolean(url && url.startsWith('http'));
    const isKeyConfigured = Boolean(anonKey && anonKey.length > 10);

    if (!isUrlConfigured || !isKeyConfigured) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Supabase environment variables are missing or invalid.',
          details: {
            urlConfigured: isUrlConfigured,
            keyConfigured: isKeyConfigured,
          },
        },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    // Query branches or public table to verify connection
    const { data, error } = await supabase.from('branches').select('id, name, code').limit(1);

    return NextResponse.json({
      status: 'ok',
      message: 'Supabase client initialized successfully and read .env.local without errors.',
      data: {
        url: url,
        keyMasked: `${anonKey.substring(0, 8)}...${anonKey.substring(anonKey.length - 4)}`,
        querySuccess: !error,
        tableData: data || null,
        error: error ? error.message : null,
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Unexpected error testing Supabase connection.',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
