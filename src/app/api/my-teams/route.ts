import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('team_memberships')
    .select('role, joined_at, team:teams(id, name, invite_code)')
    .eq('member_id', user.memberId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch memberships:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }

  const teams = (data || []).map((m) => {
    const team = m.team as unknown as { id: string; name: string; invite_code: string };
    return {
      ...team,
      role: m.role,
      isActive: team.id === user.teamId,
    };
  });

  return NextResponse.json(teams);
}
