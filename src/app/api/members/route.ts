import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';

export async function GET(_req?: Request) {
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

  // Get primary team members
  const { data: primaryMembers, error } = await supabase
    .from('members')
    .select('id, name, email, is_active, role, is_note_taker, google_refresh_token')
    .eq('team_id', user.teamId)
    .eq('is_active', true);

  if (error) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }

  // Also get note-taker members via team_memberships (e.g. shared ops accounts)
  const { data: noteTakerMemberships } = await supabase
    .from('team_memberships')
    .select('member:members!inner(id, name, email, is_active, role, is_note_taker, google_refresh_token)')
    .eq('team_id', user.teamId)
    .eq('members.is_note_taker', true)
    .eq('members.is_active', true);

  const noteTakerMembers = (noteTakerMemberships || [])
    .map((row) => row.member as unknown as { id: string; name: string; email: string; is_active: boolean; role: string; is_note_taker: boolean; google_refresh_token: string | null });

  // Merge, deduplicate by id, sort by name
  const primaryIds = new Set((primaryMembers || []).map((m) => m.id));
  const allMembers = [
    ...(primaryMembers || []),
    ...noteTakerMembers.filter((m) => !primaryIds.has(m.id)),
  ].sort((a, b) => a.name.localeCompare(b.name, 'ja'));

  // Convert google_refresh_token to boolean to avoid exposing sensitive tokens
  const members = allMembers.map(({ google_refresh_token, ...m }) => ({
    ...m,
    has_google_token: google_refresh_token !== null,
  }));

  return NextResponse.json(members);
}
