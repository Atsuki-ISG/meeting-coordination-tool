-- ゲスト向けカレンダーイベントのタイトル・説明テンプレート
-- テンプレート変数: {メニュー名}, {予約者名}, {会社名}, {日付}, {時刻}, {メール}, {備考}, {meet_link}

ALTER TABLE event_types
  ADD COLUMN IF NOT EXISTS guest_title_template TEXT DEFAULT '{メニュー名}',
  ADD COLUMN IF NOT EXISTS guest_description_template TEXT DEFAULT '{meet_link}';

COMMENT ON COLUMN event_types.guest_title_template IS 'ゲストのカレンダーに表示されるイベントタイトルのテンプレート';
COMMENT ON COLUMN event_types.guest_description_template IS 'ゲストのカレンダーに表示されるイベント説明のテンプレート';
