-- 018: ダブルブッキングを DB レベルで防止する
--
-- 予約作成は「Google FreeBusy で空き確認 → INSERT」の楽観的チェックのみで、
-- その間に競合ウィンドウがあり同一枠への同時予約が両方成立し得た（TOCTOU）。
-- 排他制約（EXCLUDE USING gist）で確定予約の時間重複を DB が拒否するようにする。
--
-- モードで担当の持ち方が違うため制約を2本に分ける:
--   - any_available: 担当1人（assigned_member_id）→ 同一担当者の重複を禁止
--   - all_required : 担当列なし（全員参加）→ 同一イベントタイプの重複を禁止
--
-- 注意: 異なるイベントタイプにまたがる同一メンバーの重複（例: all_required と
-- any_available の掛け持ち）は、参加者を行で持たない現データモデルでは完全には
-- 表現できず、この2制約では防ぎきれない。将来 attendee 行を持つ設計にする際に強化する。

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap_per_member
  EXCLUDE USING gist (
    assigned_member_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  ) WHERE (status = 'confirmed' AND assigned_member_id IS NOT NULL);

ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap_all_required
  EXCLUDE USING gist (
    event_type_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  ) WHERE (status = 'confirmed' AND assigned_member_id IS NULL);
