import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getApiSession } from '@/lib/auth/api';

// GET: List member requests (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceClient();

    // Check if user is admin
    const { data: member } = await supabase
      .from('members')
      .select('role')
      .eq('id', session.memberId)
      .single();

    if (member?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    let query = supabase
      .from('member_requests')
      .select(`
        *,
        reviewer:members!member_requests_reviewed_by_fkey(id, name, email)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching member requests:', error);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Member requests GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
