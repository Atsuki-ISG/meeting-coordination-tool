import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getApiSession } from '@/lib/auth/api';
import { sendInvitationEmail } from '@/lib/email/send-invitation';
import crypto from 'crypto';

// Generate a secure random token
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// GET: List invitations for the team
export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceClient();

    // Get member to check team
    const { data: member } = await supabase
      .from('members')
      .select('team_id, role')
      .eq('id', session.memberId)
      .single();

    if (!member?.team_id) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    let query = supabase
      .from('booking_invitations')
      .select(`
        *,
        invited_by_member:members!booking_invitations_invited_by_fkey(id, name, email),
        approved_by_member:members!booking_invitations_approved_by_fkey(id, name, email)
      `)
      .eq('team_id', member.team_id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: invitations, error } = await query;

    if (error) {
      console.error('Error fetching invitations:', error);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('Invitations GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new invitation
export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceClient();

    // Get member to check admin role
    const { data: member } = await supabase
      .from('members')
      .select('team_id, role')
      .eq('id', session.memberId)
      .single();

    if (!member?.team_id) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 });
    }

    if (member.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create invitations' }, { status: 403 });
    }

    const body = await request.json();
    const { email, maxBookings = 1, expiresAt, note, autoApprove = true, sendEmail = false } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const token = generateInvitationToken();

    const { data: invitation, error } = await supabase
      .from('booking_invitations')
      .insert({
        email: email.toLowerCase(),
        token,
        invited_by: session.memberId,
        team_id: member.team_id,
        status: autoApprove ? 'approved' : 'pending',
        approved_by: autoApprove ? session.memberId : null,
        approved_at: autoApprove ? new Date().toISOString() : null,
        max_bookings: maxBookings,
        expires_at: expiresAt || null,
        note: note || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    // Generate the booking URL with the invitation token
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const bookingUrl = `${baseUrl}/book?invitation=${token}`;

    // Send invitation email if requested
    let emailSent = false;
    if (sendEmail) {
      try {
        // Get team name and inviter name
        const { data: teamData } = await supabase
          .from('teams')
          .select('name')
          .eq('id', member.team_id)
          .single();

        const { data: inviterData } = await supabase
          .from('members')
          .select('name')
          .eq('id', session.memberId)
          .single();

        await sendInvitationEmail({
          to: email.toLowerCase(),
          inviterName: inviterData?.name || 'チームメンバー',
          teamName: teamData?.name || 'MeetFlow',
          bookingUrl,
          note: note || undefined,
        });
        emailSent = true;
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't fail the request if email fails, just log it
      }
    }

    return NextResponse.json({
      invitation,
      bookingUrl,
      emailSent,
    });
  } catch (error) {
    console.error('Invitations POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
