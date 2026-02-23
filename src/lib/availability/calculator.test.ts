import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  intersectBusySlots,
  mergeBusySlots,
  calculateAvailability,
  isSlotAvailable,
} from './calculator';
import type { BusySlot } from '@/types';

// ヘルパー: UTC 文字列から Date を作成
const d = (iso: string) => new Date(iso);

// テスト中の「現在時刻」を固定する (calculateAvailability が new Date() に依存するため)
// 2024-01-14 20:00 UTC = 2024-01-15 05:00 JST (月曜日の早朝)
// JST 09:00 (UTC 00:00) より前にすることで、minBookingNotice=0 の場合に
// JST 09:00 からスロットが生成されるようにする
const FIXED_NOW = '2024-01-14T20:00:00Z';

// 全曜日 disabled のデフォルト設定
const allDisabled = {
  '0': { enabled: false, startTime: '09:00', endTime: '18:00' },
  '1': { enabled: false, startTime: '09:00', endTime: '18:00' },
  '2': { enabled: false, startTime: '09:00', endTime: '18:00' },
  '3': { enabled: false, startTime: '09:00', endTime: '18:00' },
  '4': { enabled: false, startTime: '09:00', endTime: '18:00' },
  '5': { enabled: false, startTime: '09:00', endTime: '18:00' },
  '6': { enabled: false, startTime: '09:00', endTime: '18:00' },
};

// 平日 (月〜金) のみ有効な設定
const weekdaysOnly = {
  ...allDisabled,
  '1': { enabled: true, startTime: '09:00', endTime: '18:00' }, // 月
  '2': { enabled: true, startTime: '09:00', endTime: '18:00' }, // 火
  '3': { enabled: true, startTime: '09:00', endTime: '18:00' }, // 水
  '4': { enabled: true, startTime: '09:00', endTime: '18:00' }, // 木
  '5': { enabled: true, startTime: '09:00', endTime: '18:00' }, // 金
};

// ======================================================
// mergeBusySlots
// ======================================================
describe('mergeBusySlots', () => {
  it('空の配列を返す（引数が空）', () => {
    expect(mergeBusySlots([])).toEqual([]);
  });

  it('空の配列を返す（中身が空配列）', () => {
    expect(mergeBusySlots([[]])).toEqual([]);
  });

  it('重複しないスロットはそのまま返す', () => {
    const slots: BusySlot[][] = [[
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') },
      { start: d('2024-01-15T11:00Z'), end: d('2024-01-15T12:00Z') },
    ]];
    const result = mergeBusySlots(slots);
    expect(result).toHaveLength(2);
    expect(result[0].start).toEqual(d('2024-01-15T09:00Z'));
    expect(result[1].start).toEqual(d('2024-01-15T11:00Z'));
  });

  it('重複するスロットを1つに統合する', () => {
    const slots: BusySlot[][] = [[
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T11:00Z') },
      { start: d('2024-01-15T10:00Z'), end: d('2024-01-15T12:00Z') },
    ]];
    const result = mergeBusySlots(slots);
    expect(result).toHaveLength(1);
    expect(result[0].start).toEqual(d('2024-01-15T09:00Z'));
    expect(result[0].end).toEqual(d('2024-01-15T12:00Z'));
  });

  it('隣接するスロット（end === start）は1つに統合する', () => {
    const slots: BusySlot[][] = [[
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') },
      { start: d('2024-01-15T10:00Z'), end: d('2024-01-15T11:00Z') },
    ]];
    const result = mergeBusySlots(slots);
    expect(result).toHaveLength(1);
    expect(result[0].end).toEqual(d('2024-01-15T11:00Z'));
  });

  it('複数メンバーの配列をフラット化して統合する', () => {
    const memberA: BusySlot[] = [
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') },
    ];
    const memberB: BusySlot[] = [
      { start: d('2024-01-15T09:30Z'), end: d('2024-01-15T11:00Z') },
    ];
    const result = mergeBusySlots([memberA, memberB]);
    expect(result).toHaveLength(1);
    expect(result[0].start).toEqual(d('2024-01-15T09:00Z'));
    expect(result[0].end).toEqual(d('2024-01-15T11:00Z'));
  });

  it('3つのスロットが完全に重複する場合は1つに', () => {
    const slots: BusySlot[][] = [[
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T11:00Z') },
      { start: d('2024-01-15T09:30Z'), end: d('2024-01-15T10:30Z') },
      { start: d('2024-01-15T10:00Z'), end: d('2024-01-15T12:00Z') },
    ]];
    const result = mergeBusySlots(slots);
    expect(result).toHaveLength(1);
    expect(result[0].end).toEqual(d('2024-01-15T12:00Z'));
  });
});

// ======================================================
// intersectBusySlots
// ======================================================
describe('intersectBusySlots', () => {
  it('busySlotsArrays が空の場合は空を返す', () => {
    expect(intersectBusySlots([], 0)).toEqual([]);
  });

  it('totalMembers が 0 の場合は空を返す', () => {
    const slots: BusySlot[] = [
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') },
    ];
    expect(intersectBusySlots([slots], 0)).toEqual([]);
  });

  it('1人だけ busy → totalMembers=2 なら空を返す', () => {
    const memberA: BusySlot[] = [
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') },
    ];
    const result = intersectBusySlots([memberA, []], 2);
    expect(result).toEqual([]);
  });

  it('全員が busy な時間帯だけ返す', () => {
    const memberA: BusySlot[] = [
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T12:00Z') },
    ];
    const memberB: BusySlot[] = [
      { start: d('2024-01-15T10:00Z'), end: d('2024-01-15T14:00Z') },
    ];
    const result = intersectBusySlots([memberA, memberB], 2);
    expect(result).toHaveLength(1);
    expect(result[0].start).toEqual(d('2024-01-15T10:00Z'));
    expect(result[0].end).toEqual(d('2024-01-15T12:00Z'));
  });

  it('3人中2人だけ busy な場合は返さない', () => {
    const memberA: BusySlot[] = [
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') },
    ];
    const memberB: BusySlot[] = [
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') },
    ];
    const result = intersectBusySlots([memberA, memberB, []], 3);
    expect(result).toEqual([]);
  });

  it('全員 busy な複数の時間帯を正しく返す', () => {
    const memberA: BusySlot[] = [
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') },
      { start: d('2024-01-15T13:00Z'), end: d('2024-01-15T14:00Z') },
    ];
    const memberB: BusySlot[] = [
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') },
      { start: d('2024-01-15T13:00Z'), end: d('2024-01-15T14:00Z') },
    ];
    const result = intersectBusySlots([memberA, memberB], 2);
    expect(result).toHaveLength(2);
  });

  it('境界ぴったり（end == start）は交差なしとして扱う', () => {
    const memberA: BusySlot[] = [
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') },
    ];
    const memberB: BusySlot[] = [
      { start: d('2024-01-15T10:00Z'), end: d('2024-01-15T11:00Z') },
    ];
    // A の end と B の start がぴったり: 同時に2人になる瞬間がない
    const result = intersectBusySlots([memberA, memberB], 2);
    expect(result).toEqual([]);
  });
});

// ======================================================
// isSlotAvailable
// ======================================================
describe('isSlotAvailable', () => {
  it('busy スロットがなければ true', () => {
    const slot = { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') };
    expect(isSlotAvailable(slot, [])).toBe(true);
  });

  it('busy スロットと重複がなければ true', () => {
    const slot = { start: d('2024-01-15T13:00Z'), end: d('2024-01-15T14:00Z') };
    const busy: BusySlot[][] = [[
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') },
    ]];
    expect(isSlotAvailable(slot, busy)).toBe(true);
  });

  it('busy スロットと完全に重複すれば false', () => {
    const slot = { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') };
    const busy: BusySlot[][] = [[
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') },
    ]];
    expect(isSlotAvailable(slot, busy)).toBe(false);
  });

  it('busy スロットが前側にかかる場合は false', () => {
    const slot = { start: d('2024-01-15T09:30Z'), end: d('2024-01-15T10:30Z') };
    const busy: BusySlot[][] = [[
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') },
    ]];
    expect(isSlotAvailable(slot, busy)).toBe(false);
  });

  it('busy スロットが後側にかかる場合は false', () => {
    const slot = { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') };
    const busy: BusySlot[][] = [[
      { start: d('2024-01-15T09:30Z'), end: d('2024-01-15T11:00Z') },
    ]];
    expect(isSlotAvailable(slot, busy)).toBe(false);
  });

  it('隣接する busy スロット（境界ぴったり）は重複なし', () => {
    const slot = { start: d('2024-01-15T10:00Z'), end: d('2024-01-15T11:00Z') };
    const busy: BusySlot[][] = [[
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') },
    ]];
    expect(isSlotAvailable(slot, busy)).toBe(true);
  });

  it('複数メンバーの busy を統合して判定する', () => {
    const slot = { start: d('2024-01-15T09:30Z'), end: d('2024-01-15T10:30Z') };
    const memberA: BusySlot[] = [
      { start: d('2024-01-15T09:00Z'), end: d('2024-01-15T10:00Z') },
    ];
    const memberB: BusySlot[] = [
      { start: d('2024-01-15T10:00Z'), end: d('2024-01-15T11:00Z') },
    ];
    expect(isSlotAvailable(slot, [memberA, memberB])).toBe(false);
  });
});

// ======================================================
// calculateAvailability
// ======================================================
describe('calculateAvailability', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('enabled な曜日にスロットが生成される', () => {
    // 2024-01-15 (月) 〜 2024-01-16 (火) の範囲
    // 月曜のみ有効、JST 09:00-18:00
    const mondayOnlyConfig = {
      ...allDisabled,
      '1': { enabled: true, startTime: '09:00', endTime: '18:00' }, // 月
    };

    // 月曜の UTC midnight = JST 09:00
    const start = d('2024-01-15T00:00:00Z');
    const end = d('2024-01-16T00:00:00Z');

    const slots = calculateAvailability(
      [],
      { start, end },
      30,
      { weeklyAvailability: mondayOnlyConfig, minBookingNoticeMinutes: 0 }
    );

    expect(slots.length).toBeGreaterThan(0);
    // JST 09:00 = UTC 00:00
    expect(slots[0].start.getUTCHours()).toBe(0);
  });

  it('disabled な曜日にスロットが生成されない', () => {
    // 2024-01-13 (土) の範囲 — weekdaysOnly では土は無効
    const start = d('2024-01-12T15:00:00Z'); // JST 土曜 0:00
    const end = d('2024-01-13T15:00:00Z');   // JST 日曜 0:00

    const slots = calculateAvailability(
      [],
      { start, end },
      30,
      { weeklyAvailability: weekdaysOnly, minBookingNoticeMinutes: 0 }
    );

    expect(slots).toHaveLength(0);
  });

  it('minBookingNotice 内のスロットは除外される', () => {
    // このテストだけ現在時刻を JST 09:30 (UTC 00:30) に設定
    // minBookingNoticeMinutes = 60 → minBookingTime = JST 10:30 (UTC 01:30)
    // effectiveStart = max(UTC 00:00, UTC 01:30) = UTC 01:30 (JST 10:30)
    vi.setSystemTime(new Date('2024-01-15T00:30:00Z')); // JST 09:30

    const mondayOnlyConfig = {
      ...allDisabled,
      '1': { enabled: true, startTime: '09:00', endTime: '18:00' }, // 月
    };

    const start = d('2024-01-15T00:00:00Z');
    const end = d('2024-01-16T00:00:00Z');

    const slots = calculateAvailability(
      [],
      { start, end },
      30,
      { weeklyAvailability: mondayOnlyConfig, minBookingNoticeMinutes: 60 }
    );

    // 全スロットが JST 10:30 (UTC 01:30) 以降であること
    slots.forEach((slot) => {
      expect(slot.start.getTime()).toBeGreaterThanOrEqual(
        new Date('2024-01-15T01:30:00Z').getTime()
      );
    });
  });

  it('busy スロットが入った時間帯はスロットが生成されない', () => {
    const mondayOnlyConfig = {
      ...allDisabled,
      '1': { enabled: true, startTime: '09:00', endTime: '12:00' }, // 月 09-12 JST
    };

    const start = d('2024-01-15T00:00:00Z'); // JST 月 0:00
    const end = d('2024-01-16T00:00:00Z');

    // JST 09:00-10:00 (UTC 00:00-01:00) が busy
    const busy: BusySlot[][] = [[
      { start: d('2024-01-15T00:00:00Z'), end: d('2024-01-15T01:00:00Z') },
    ]];

    const slots = calculateAvailability(
      busy,
      { start, end },
      30,
      { weeklyAvailability: mondayOnlyConfig, minBookingNoticeMinutes: 0 }
    );

    // JST 09:00-10:00 のスロットは存在しないこと
    const hasConflict = slots.some(
      (slot) =>
        slot.start < d('2024-01-15T01:00:00Z') &&
        slot.end > d('2024-01-15T00:00:00Z')
    );
    expect(hasConflict).toBe(false);
    // JST 10:00 以降にスロットが存在すること
    expect(slots.length).toBeGreaterThan(0);
  });

  // ====================================================
  // [回帰テスト] JSTタイムゾーンバグ
  // ====================================================
  describe('[回帰] JSTタイムゾーンバグ', () => {
    it('UTC midnight (JST月曜朝) は月曜として処理される', () => {
      // 2024-01-15T00:00:00Z = JST 2024-01-15 09:00 (月曜)
      // バグ修正前: UTC の getDay() = 1 (月曜) だが、
      //            startOfDay が UTC 基準で計算されていた
      const mondayJSTConfig = {
        ...allDisabled,
        '1': { enabled: true, startTime: '09:00', endTime: '18:00' }, // 月のみ有効
      };

      const start = d('2024-01-15T00:00:00Z'); // JST 月曜 09:00
      const end = d('2024-01-16T00:00:00Z');   // JST 火曜 09:00

      const slots = calculateAvailability(
        [],
        { start, end },
        30,
        { weeklyAvailability: mondayJSTConfig, minBookingNoticeMinutes: 0 }
      );

      // 月曜設定が有効なのでスロットが生成されるはず
      expect(slots.length).toBeGreaterThan(0);
    });

    it('JST土曜深夜 (UTC金曜15:00) は土曜として処理される', () => {
      // 2024-01-19T15:00:00Z = JST 2024-01-20 00:00 (土曜)
      // バグ修正前: UTC getDay() = 5 (金曜) と判定されていた
      const saturdayJSTConfig = {
        ...allDisabled,
        '6': { enabled: true, startTime: '10:00', endTime: '17:00' }, // 土のみ有効
      };

      const start = d('2024-01-19T15:00:00Z'); // JST 土曜 00:00
      const end = d('2024-01-20T15:00:00Z');   // JST 日曜 00:00

      const slots = calculateAvailability(
        [],
        { start, end },
        30,
        { weeklyAvailability: saturdayJSTConfig, minBookingNoticeMinutes: 0 }
      );

      // 土曜設定が有効なのでスロットが生成されるはず
      expect(slots.length).toBeGreaterThan(0);
    });

    it('JST日曜深夜 (UTC土曜15:00) は日曜として処理される', () => {
      // 2024-01-20T15:00:00Z = JST 2024-01-21 00:00 (日曜)
      // バグ修正前: UTC getDay() = 6 (土曜) と判定されていた
      const sundayJSTConfig = {
        ...allDisabled,
        '0': { enabled: true, startTime: '10:00', endTime: '15:00' }, // 日のみ有効
      };

      const start = d('2024-01-20T15:00:00Z'); // JST 日曜 00:00
      const end = d('2024-01-21T15:00:00Z');   // JST 月曜 00:00

      const slots = calculateAvailability(
        [],
        { start, end },
        30,
        { weeklyAvailability: sundayJSTConfig, minBookingNoticeMinutes: 0 }
      );

      // 日曜設定が有効なのでスロットが生成されるはず
      expect(slots.length).toBeGreaterThan(0);
    });

    it('スロットの開始時刻が JST 時刻に正しく対応する', () => {
      // JST 09:00 = UTC 00:00、JST 18:00 = UTC 09:00
      const mondayJSTConfig = {
        ...allDisabled,
        '1': { enabled: true, startTime: '09:00', endTime: '10:00' }, // JST 09:00-10:00
      };

      const start = d('2024-01-15T00:00:00Z');
      const end = d('2024-01-16T00:00:00Z');

      const slots = calculateAvailability(
        [],
        { start, end },
        30,
        { weeklyAvailability: mondayJSTConfig, minBookingNoticeMinutes: 0 }
      );

      expect(slots).toHaveLength(2); // 09:00-09:30, 09:30-10:00 (JST)
      // JST 09:00 = UTC 00:00
      expect(slots[0].start.getUTCHours()).toBe(0);
      expect(slots[0].start.getUTCMinutes()).toBe(0);
      // JST 09:30 = UTC 00:30
      expect(slots[1].start.getUTCHours()).toBe(0);
      expect(slots[1].start.getUTCMinutes()).toBe(30);
    });
  });

  describe('participationMode', () => {
    it('all_required: 1人でも busy なら除外される', () => {
      const mondayOnlyConfig = {
        ...allDisabled,
        '1': { enabled: true, startTime: '09:00', endTime: '10:00' },
      };

      // メンバーAが 09:00-09:30 busy
      const memberA: BusySlot[] = [
        { start: d('2024-01-15T00:00:00Z'), end: d('2024-01-15T00:30:00Z') }, // JST 09:00-09:30
      ];

      const slots = calculateAvailability(
        [memberA, []],
        { start: d('2024-01-15T00:00:00Z'), end: d('2024-01-16T00:00:00Z') },
        30,
        { weeklyAvailability: mondayOnlyConfig, minBookingNoticeMinutes: 0 },
        'all_required'
      );

      // JST 09:00-09:30 のスロットは除外される
      const hasConflict = slots.some(
        (slot) => slot.start < d('2024-01-15T00:30:00Z')
      );
      expect(hasConflict).toBe(false);
    });

    it('any_available: 全員 busy の時のみ除外される', () => {
      const mondayOnlyConfig = {
        ...allDisabled,
        '1': { enabled: true, startTime: '09:00', endTime: '10:30' },
      };

      // A: 09:00-09:30 busy, B: 09:30-10:00 busy, A+B 両方 busy はいない
      const memberA: BusySlot[] = [
        { start: d('2024-01-15T00:00:00Z'), end: d('2024-01-15T00:30:00Z') }, // JST 09:00-09:30
      ];
      const memberB: BusySlot[] = [
        { start: d('2024-01-15T00:30:00Z'), end: d('2024-01-15T01:00:00Z') }, // JST 09:30-10:00
      ];

      const slots = calculateAvailability(
        [memberA, memberB],
        { start: d('2024-01-15T00:00:00Z'), end: d('2024-01-16T00:00:00Z') },
        30,
        { weeklyAvailability: mondayOnlyConfig, minBookingNoticeMinutes: 0 },
        'any_available'
      );

      // 全員同時に busy な時間帯がないので、全スロットが生成される
      expect(slots.length).toBeGreaterThan(0);
    });
  });

  describe('timeRestriction', () => {
    it('制限外の曜日にはスロットが生成されない', () => {
      // 月曜のみの範囲、制限が火〜金 [2,3,4,5] → 月曜は制限外なので 0 件
      const mondayOnlyConfig = {
        ...allDisabled,
        '1': { enabled: true, startTime: '09:00', endTime: '18:00' }, // 月のみ有効
      };

      const start = d('2024-01-15T00:00:00Z'); // JST 月曜 09:00
      const end = d('2024-01-16T00:00:00Z');   // JST 火曜 09:00

      const slots = calculateAvailability(
        [],
        { start, end },
        30,
        { weeklyAvailability: mondayOnlyConfig, minBookingNoticeMinutes: 0 },
        'all_required',
        { days: [2, 3, 4, 5], start_time: '09:00', end_time: '18:00' } // 火〜金のみ（月を含まない）
      );

      // 月曜は制限 days に含まれないのでスロットが生成されない
      expect(slots.length).toBe(0);
    });

    it('時間制限との交差が正しく適用される', () => {
      // 月曜 09:00-18:00 有効、制限 13:00-17:00
      const mondayOnlyConfig = {
        ...allDisabled,
        '1': { enabled: true, startTime: '09:00', endTime: '18:00' },
      };

      const slots = calculateAvailability(
        [],
        { start: d('2024-01-15T00:00:00Z'), end: d('2024-01-16T00:00:00Z') },
        30,
        { weeklyAvailability: mondayOnlyConfig, minBookingNoticeMinutes: 0 },
        'all_required',
        { days: [1], start_time: '13:00', end_time: '17:00' } // 月 13:00-17:00
      );

      // JST 13:00 = UTC 04:00, JST 17:00 = UTC 08:00
      expect(slots.length).toBeGreaterThan(0);
      slots.forEach((slot) => {
        expect(slot.start.getTime()).toBeGreaterThanOrEqual(d('2024-01-15T04:00:00Z').getTime());
        expect(slot.end.getTime()).toBeLessThanOrEqual(d('2024-01-15T08:00:00Z').getTime());
      });
    });
  });
});
