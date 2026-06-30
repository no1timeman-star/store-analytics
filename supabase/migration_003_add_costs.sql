-- ============================================================================
-- 遷移腳本：新增「店租成本」與「人事成本」欄位
--
-- 適用對象：你已經執行過 schema.sql（以及可能已執行過 migration_002_add_visits.sql）、
-- 資料庫裡已經有 records 表的情況。
-- 這份腳本只會「新增欄位」，不會刪除或修改你既有的任何資料。
--
-- 使用方式：
-- 1. 進入 Supabase 後台 → 你的專案 → SQL Editor
-- 2. 貼上這整份檔案，按「Run」執行一次即可
-- 3. 執行完後，這份檔案的任務就結束了，不需要再執行第二次
--    （但如果不小心重複執行也沒關係，IF NOT EXISTS 會自動跳過已存在的欄位）
-- ============================================================================

alter table public.records
  add column if not exists rent_cost numeric not null default 0 check (rent_cost >= 0);

alter table public.records
  add column if not exists labor_cost numeric not null default 0 check (labor_cost >= 0);

comment on column public.records.rent_cost is '當月當店的店租成本（元）';
comment on column public.records.labor_cost is '當月當店的人事成本（元，含薪資、勞健保等人力相關支出）';

-- 既有的舊資料，這兩個欄位會自動補成 0（代表「尚未填寫成本」，不是「成本真的是 0」）。
-- 想補登過去月份的成本，之後可以直接到「原始資料總表」點編輯，
-- 或在 Supabase 後台的 Table Editor 裡直接修改該筆資料的數值。
