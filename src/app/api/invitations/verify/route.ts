import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// POST: Verify an invitation token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Find the invitation by token
    const { data: invitation, error } = await supabase
      .from('booking_invitations')
      .select(`
        *,
        team:teams(id, name, require_invitation)
      `)
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid invitation token',
      }, { status: 404 });
    }

    // Check if invitation is approved
    if (invitation.status !== 'approved') {
      let errorMessage = 'Invitation is not valid';
      if (invitation.status === 'pending') {
        errorMessage = 'Invitation is pending approval';
      } else if (invitation.status === 'rejected') {
        errorMessage = 'Invitation has been rejected';
      } else if (invitation.status === 'used') {
        errorMessage = 'Invitation has already been fully used';
      }

      return NextResponse.json({
        valid: false,
        error: errorMessage,
        status: invitation.status,
      });
    }

    // Check if invitation has expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'Invitation has expired',
      });
    }

    // Check if max bookings reached
    if (invitation.bookings_count >= invitation.max_bookings) {
      return NextResponse.json({
        valid: false,
        error: 'Maximum number of bookings reached for this invitation',
      });
    }

    // Calculate remaining bookings
    const remainingBookings = invitation.max_bookings - invitation.bookings_count;

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        remainingBookings,
        expiresAt: invitation.expires_at,
      },
      team: invitation.team,
    });
  } catch (error) {
    console.error('Invitation verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
