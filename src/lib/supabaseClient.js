import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // 在開發模式或忘記設定環境變數時，給出清楚的提示而不是讓畫面空白當掉
  console.error(
    "[Supabase] 缺少環境變數 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY。\n" +
      "本機開發請在專案根目錄建立 .env.local（參考 .env.example）；\n" +
      "部署到 GitHub Pages 請在 repo 的 Settings → Secrets and variables → Actions 設定。"
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
