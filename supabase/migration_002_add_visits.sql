-- ============================================================================
-- 遷移腳本：新增「西裝租借人次」與「商品購買人次」欄位
--
-- 適用對象：你已經執行過一次 schema.sql、資料庫裡已經有 records 表的情況。
-- 這份腳本只會「新增欄位」，不會刪除或修改你既有的任何資料。
--
-- 使用方式：
-- 1. 進入 Supabase 後台 → 你的專案 → SQL Editor
-- 2. 貼上這整份檔案，按「Run」執行一次即可
-- 3. 執行完後，這份檔案的任務就結束了，不需要再執行第二次
--    （但如果不小心重複執行也沒關係，IF NOT EXISTS 會自動跳過已存在的欄位）
-- ============================================================================

alter table public.records
  add column if not exists suit_rental_visits integer not null default 0 check (suit_rental_visits >= 0);

alter table public.records
  add column if not exists product_visits integer not null default 0 check (product_visits >= 0);

comment on column public.records.suit_rental_visits is '西裝租借服務人次（同一人若重複租借，每次都計一筆，非不重複客人數）';
comment on column public.records.product_visits is '商品購買服務人次（同一人若重複購買，每次都計一筆，非不重複客人數）';

-- 既有的舊資料，這兩個欄位會自動補成 0。
-- 如果你想回頭補登過去月份的人次，之後可以直接到「原始資料總表」點編輯，
-- 或在 Supabase 後台的 Table Editor 裡直接修改該筆資料的數值。
