import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';
import { DEFAULT_AVAILABILITY } from '@/types';

// PATCH: Approve or reject a member request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServiceClient();

    // Check if user is admin
    const { data: adminMember } = await supabase
      .from('members')
      .select('role, team_id')
      .eq('id', session.memberId)
      .single();

    if (adminMember?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, rejectionReason } = body;

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get the member request
    const { data: memberRequest, error: fetchError } = await supabase
      .from('member_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !memberRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (memberRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request has already been processed' }, { status: 400 });
    }

    if (action === 'approve') {
      // Check if a member already exists with this email (e.g. logged in before approval)
      const { data: existingMember } = await supabase
        .from('members')
        .select('id')
        .eq('email', memberRequest.email)
        .single();

      let newMember;
      let memberId: string;

      if (existingMember) {
        // Update the existing pending member instead of creating a duplicate
        const { data: updatedMember, error: updateError } = await supabase
          .from('members')
          .update({
            name: memberRequest.name,
            google_refresh_token: memberRequest.google_refresh_token,
            is_active: true,
            availability_settings: DEFAULT_AVAILABILITY,
            role: 'member',
            team_id: adminMember.team_id,
            status: 'active',
          })
          .eq('id', existingMember.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating member:', updateError);
          return NextResponse.json({ error: 'Failed to activate member' }, { status: 500 });
        }
        newMember = updatedMember;
        memberId = existingMember.id;
      } else {
        // Create a new member from the request
        const { data: createdMember, error: createError } = await supabase
          .from('members')
          .insert({
            email: memberRequest.email,
            name: memberRequest.name,
            google_refresh_token: memberRequest.google_refresh_token,
            is_active: true,
            availability_settings: DEFAULT_AVAILABILITY,
            role: 'member',
            team_id: adminMember.team_id,
            status: 'active',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating member:', createError);
          return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });
        }
        newMember = createdMember;
        memberId = createdMember.id;
      }

      // Add to team_memberships so the member appears in /api/my-teams
      if (adminMember.team_id) {
        const { error: membershipError } = await supabase
          .from('team_memberships')
          .upsert(
            { member_id: memberId, team_id: adminMember.team_id, role: 'member' },
            { onConflict: 'member_id,team_id', ignoreDuplicates: true }
          );
        if (membershipError) {
          console.error('Error adding team membership:', membershipError);
        }
      }

      // Update the request status
      await supabase
        .from('member_requests')
        .update({
          status: 'approved',
          reviewed_by: session.memberId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        member: newMember,
        message: 'Member approved and created successfully',
      });
    } else {
      // Reject the request
      await supabase
        .from('member_requests')
        .update({
          status: 'rejected',
          reviewed_by: session.memberId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason || null,
        })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        message: 'Request rejected',
      });
    }
  } catch (error) {
    console.error('Member request PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a member request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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

    const { error } = await supabase
      .from('member_requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting member request:', error);
      return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Member request DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
