import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';

const createPresetSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  days: z.array(z.number().min(0).max(6)),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, '時間はHH:MM形式で入力してください'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, '時間はHH:MM形式で入力してください'),
  color: z.string().optional(),
});

// GET all presets for current team
export async function GET() {
  const user = await getSessionUser();

  if (!user || !user.teamId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('time_slot_presets')
    .select('*')
    .eq('team_id', user.teamId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch presets:', error);
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

// POST create new preset (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user || !user.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceClient();

    // Check if user is admin
    const { data: member } = await supabase
      .from('members')
      .select('role')
      .eq('id', user.memberId)
      .single();

    if (member?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createPresetSchema.parse(body);

    const { data: preset, error } = await supabase
      .from('time_slot_presets')
      .insert({
        team_id: user.teamId,
        name: validatedData.name,
        days: validatedData.days,
        start_time: validatedData.start_time,
        end_time: validatedData.end_time,
        color: validatedData.color || '#3b82f6',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create preset:', error);
      return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 });
    }

    return NextResponse.json(preset, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Create preset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
