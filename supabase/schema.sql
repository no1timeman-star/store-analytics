-- ============================================================================
-- 年度門市業績與商品結構分析系統 — Supabase 資料表結構
--
-- 使用方式：
-- 1. 到 https://supabase.com 建立一個新專案
-- 2. 進入專案的 SQL Editor
-- 3. 貼上這整份檔案，按「Run」執行一次即可
-- ============================================================================

-- 業績紀錄主表
create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  year integer not null check (year >= 2000 and year <= 2100),
  month integer not null check (month >= 1 and month <= 12),
  store_id text not null check (
    store_id in ('taipei', 'banqiao', 'taoyuan', 'zhongyuan', 'taichung', 'kaohsiung')
  ),
  suit_rental numeric not null default 0 check (suit_rental >= 0),
  suit_rental_visits integer not null default 0 check (suit_rental_visits >= 0),
  product_suit numeric not null default 0 check (product_suit >= 0),
  product_casual numeric not null default 0 check (product_casual >= 0),
  product_shoes numeric not null default 0 check (product_shoes >= 0),
  product_women numeric not null default 0 check (product_women >= 0),
  product_visits integer not null default 0 check (product_visits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 同一年、同一月、同一門市只能有一筆紀錄，避免重複輸入
  unique (year, month, store_id)
);

comment on table public.records is '各門市每月業績原始紀錄（西裝租借 + 商品購買四子項目，以及各自的服務人次，用於計算客單價）';
comment on column public.records.suit_rental_visits is '西裝租借服務人次（同一人若重複租借，每次都計一筆，非不重複客人數）';
comment on column public.records.product_visits is '商品購買服務人次（同一人若重複購買，每次都計一筆，非不重複客人數）';

-- updated_at 自動更新
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_records_updated_at on public.records;
create trigger trg_records_updated_at
  before update on public.records
  for each row
  execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security：只有「已登入」的使用者才能讀取與修改資料
-- 公開的 anon key 雖然會被打包進前端程式碼，但沒有登入就完全無法存取資料表
-- ----------------------------------------------------------------------------
alter table public.records enable row level security;

drop policy if exists "Authenticated users can read records" on public.records;
create policy "Authenticated users can read records"
  on public.records for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert records" on public.records;
create policy "Authenticated users can insert records"
  on public.records for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update records" on public.records;
create policy "Authenticated users can update records"
  on public.records for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete records" on public.records;
create policy "Authenticated users can delete records"
  on public.records for delete
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- 開啟 Realtime：多裝置同時開啟頁面時，資料異動會自動同步推送
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.records;
