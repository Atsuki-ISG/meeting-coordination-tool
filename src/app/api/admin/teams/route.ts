import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.isSystemAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createServiceClient();

    const { data: teams, error } = await supabase
      .from('teams')
      .select('id, name')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Failed to fetch teams:', error);
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    return NextResponse.json(teams || []);
  } catch (error) {
    console.error('Admin teams API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
