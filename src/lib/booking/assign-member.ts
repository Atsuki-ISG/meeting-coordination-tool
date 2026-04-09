import type { SupabaseClient } from '@supabase/supabase-js';
import type { Member } from '@/types';

export type AssignmentStrategy = 'balanced' | 'priority';

/**
 * 「誰か1人が参加」モードで担当メンバーを1人決める。
 * 空き確認を通過した `availableMembers` の中から、戦略に応じて1人を返す。
 *
 * - balanced: 過去30日間でそのイベントタイプの担当件数が最少の人
 *             （同数の場合は Member.id 昇順で決定的に選ぶ）
 * - priority: event_type_members.priority 昇順
 *             （同値の場合は Member.id 昇順）
 */
export async function assignMember(
  supabase: SupabaseClient,
  params: {
    eventTypeId: string;
    strategy: AssignmentStrategy;
    availableMembers: Member[];
  }
): Promise<Member | null> {
  const { eventTypeId, strategy, availableMembers } = params;

  if (availableMembers.length === 0) return null;
  if (availableMembers.length === 1) return availableMembers[0];

  if (strategy === 'priority') {
    const { data: rows } = await supabase
      .from('event_type_members')
      .select('member_id, priority')
      .eq('event_type_id', eventTypeId)
      .in(
        'member_id',
        availableMembers.map((m) => m.id)
      );

    const priorityMap = new Map<string, number>();
    for (const r of rows || []) {
      priorityMap.set(r.member_id, r.priority ?? 0);
    }

    const sorted = [...availableMembers].sort((a, b) => {
      const pa = priorityMap.get(a.id) ?? 0;
      const pb = priorityMap.get(b.id) ?? 0;
      if (pa !== pb) return pa - pb;
      return a.id.localeCompare(b.id);
    });
    return sorted[0];
  }

  // balanced: past 30 days bookings count for this event type
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: rows } = await supabase
    .from('bookings')
    .select('assigned_member_id')
    .eq('event_type_id', eventTypeId)
    .eq('status', 'confirmed')
    .gte('start_at', since.toISOString())
    .not('assigned_member_id', 'is', null);

  const countMap = new Map<string, number>();
  for (const m of availableMembers) countMap.set(m.id, 0);
  for (const r of rows || []) {
    const id = r.assigned_member_id as string;
    if (countMap.has(id)) countMap.set(id, (countMap.get(id) ?? 0) + 1);
  }

  const sorted = [...availableMembers].sort((a, b) => {
    const ca = countMap.get(a.id) ?? 0;
    const cb = countMap.get(b.id) ?? 0;
    if (ca !== cb) return ca - cb;
    return a.id.localeCompare(b.id);
  });
  return sorted[0];
}
