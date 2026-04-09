/**
 * event_type_members テーブルへの insert 行を組み立てる。
 * memberIds 配列の順序をそのまま priority(0=最優先) として保存する。
 * これにより「優先度順」戦略でドラッグ&ドロップによる並び替え結果を保持できる。
 */
export function buildEventTypeMemberInserts(
  eventTypeId: string,
  memberIds: string[]
): Array<{ event_type_id: string; member_id: string; priority: number }> {
  return memberIds.map((memberId, index) => ({
    event_type_id: eventTypeId,
    member_id: memberId,
    priority: index,
  }));
}
