import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getApiSession } from '@/lib/auth/api';

// GET: Get a single invitation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServiceClient();

    const { data: member } = await supabase
      .from('members')
      .select('team_id')
      .eq('id', session.memberId)
      .single();

    if (!member?.team_id) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 });
    }

    const { data: invitation, error } = await supabase
      .from('booking_invitations')
      .select(`
        *,
        invited_by_member:members!booking_invitations_invited_by_fkey(id, name, email),
        approved_by_member:members!booking_invitations_approved_by_fkey(id, name, email)
      `)
      .eq('id', id)
      .eq('team_id', member.team_id)
      .single();

    if (error || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    return NextResponse.json({ invitation });
  } catch (error) {
    console.error('Invitation GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update invitation (approve/reject/update settings)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServiceClient();

    const { data: member } = await supabase
      .from('members')
      .select('team_id, role')
      .eq('id', session.memberId)
      .single();

    if (!member?.team_id) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 });
    }

    if (member.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update invitations' }, { status: 403 });
    }

    const body = await request.json();
    const { action, maxBookings, expiresAt, note } = body;

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (action === 'approve') {
      updateData.status = 'approved';
      updateData.approved_by = session.memberId;
      updateData.approved_at = new Date().toISOString();
    } else if (action === 'reject') {
      updateData.status = 'rejected';
    } else if (action === 'reset') {
      // Reset to pending (for re-review)
      updateData.status = 'pending';
      updateData.approved_by = null;
      updateData.approved_at = null;
    }

    if (maxBookings !== undefined) {
      updateData.max_bookings = maxBookings;
    }

    if (expiresAt !== undefined) {
      updateData.expires_at = expiresAt;
    }

    if (note !== undefined) {
      updateData.note = note;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { data: invitation, error } = await supabase
      .from('booking_invitations')
      .update(updateData)
      .eq('id', id)
      .eq('team_id', member.team_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating invitation:', error);
      return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 });
    }

    return NextResponse.json({ invitation });
  } catch (error) {
    console.error('Invitation PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete an invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServiceClient();

    const { data: member } = await supabase
      .from('members')
      .select('team_id, role')
      .eq('id', session.memberId)
      .single();

    if (!member?.team_id) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 });
    }

    if (member.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete invitations' }, { status: 403 });
    }

    const { error } = await supabase
      .from('booking_invitations')
      .delete()
      .eq('id', id)
      .eq('team_id', member.team_id);

    if (error) {
      console.error('Error deleting invitation:', error);
      return NextResponse.json({ error: 'Failed to delete invitation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invitation DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
