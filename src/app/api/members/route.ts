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
    .select('id, name, email, is_active, role, is_note_taker, google_refresh_token')
    .eq('team_id', user.teamId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }

  // Convert google_refresh_token to boolean to avoid exposing sensitive tokens
  const members = (data || []).map(({ google_refresh_token, ...m }) => ({
    ...m,
    has_google_token: google_refresh_token !== null,
  }));

  return NextResponse.json(members);
}
