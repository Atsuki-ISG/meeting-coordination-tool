import { describe, it, expect } from 'vitest';
import { buildEventTypeMemberInserts } from './event-type-members';

describe('buildEventTypeMemberInserts', () => {
  it('memberIds の配列順を priority として付与する（0=最優先）', () => {
    const result = buildEventTypeMemberInserts('et1', ['m1', 'm2', 'm3']);
    expect(result).toEqual([
      { event_type_id: 'et1', member_id: 'm1', priority: 0 },
      { event_type_id: 'et1', member_id: 'm2', priority: 1 },
      { event_type_id: 'et1', member_id: 'm3', priority: 2 },
    ]);
  });

  it('空配列なら空配列を返す', () => {
    expect(buildEventTypeMemberInserts('et1', [])).toEqual([]);
  });

  it('1件でも priority=0 を付与', () => {
    expect(buildEventTypeMemberInserts('et1', ['m1'])).toEqual([
      { event_type_id: 'et1', member_id: 'm1', priority: 0 },
    ]);
  });
});
