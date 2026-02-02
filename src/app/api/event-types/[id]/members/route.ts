import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('event_type_members')
    .select('member_id')
    .eq('event_type_id', id);

  if (error) {
    console.error('Failed to fetch event type members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }

  return NextResponse.json(data || []);
}
