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

    // Get all members
    const { data: allMembers, error } = await supabase
      .from('members')
      .select('id, name, email, status, is_system_admin, team_id, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch members:', error);
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      );
    }

    // Filter pending members
    const pendingMembers = allMembers?.filter((m) => m.status === 'pending') || [];

    return NextResponse.json({
      pending: pendingMembers,
      all: allMembers || [],
    });
  } catch (error) {
    console.error('Admin members API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
