import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!user.teamId) {
    return NextResponse.json(
      { error: 'Team required' },
      { status: 403 }
    );
  }

  const supabase = await createServiceClient();

  // Only get members in the same team
  const { data, error } = await supabase
    .from('members')
    .select('id, name, email, is_active, role')
    .eq('team_id', user.teamId)
    .eq('is_active', true)
    .not('google_refresh_token', 'is', null)
    .order('name');

  if (error) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }

  return NextResponse.json(data || []);
}
