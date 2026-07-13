-- 020: anon / authenticated からテーブル権限を剥奪（多層防御）
--
-- 016 で全テーブル RLS 有効化済みなので anon/authenticated は既に行アクセス不可だが、
-- Supabase 既定で付与される広範な GRANT（SELECT/INSERT/UPDATE/DELETE/TRUNCATE）も
-- 剥奪して PostgREST から触れる余地を無くす。アプリは service_role のみで DB に
-- アクセスするため影響なし。将来 anon 経由の機能を足す場合は個別に GRANT + ポリシー付与。

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM authenticated;
