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
    .select('id, name, email, is_active, google_refresh_token, created_at')
    .eq('team_id', user.teamId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }

  // Don't expose actual tokens, just whether they exist
  const sanitizedData = data?.map((member) => ({
    ...member,
    google_refresh_token: member.google_refresh_token ? 'connected' : null,
  }));

  return NextResponse.json(sanitizedData || []);
}
