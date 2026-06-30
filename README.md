# 年度門市業績與商品結構分析系統

服飾品牌 6 間門市（台北、板橋、桃園、中原、台中、高雄）的年度業績輸入與視覺化分析工具。
以 React + Recharts 打造，後端資料庫使用 **Supabase**，支援多裝置即時同步，並有帳號登入保護資料安全。

## 功能

- 月份／門市／西裝租借／商品購買（西裝類、休閒類、鞋子類、女裝類）資料輸入，即時自動加總
- 西裝租借與商品購買各自的服務**人次**輸入，自動算出**客單價**
- 店租與人事成本輸入，自動算出**淨利與淨利率**（不只是業績，是真正的損益）
- 年度業績趨勢折線圖（6 間門市比較）
- 客單價趨勢折線圖（租借 vs 購物，可依門市篩選）
- 各門市年度損益比較圖（業績、成本、淨利並列，避免「業績最高≠最賺錢」的誤判）
- 淨利趨勢折線圖（逐月淨利 + 年度累積淨利雙線呈現，可依門市篩選，看出損益是在好轉還是惡化）
- 西裝租借 vs 商品購買結構甜甜圈圖
- 商品購買細項佔比橫向長條圖
- 原始資料總表，可編輯、刪除
- **帳號密碼登入**，只有授權帳號才能存取資料
- **多裝置即時同步**：分店與總部同時開啟頁面，資料異動會自動更新

---

## 第一步：設定 Supabase（資料庫）

### 1. 建立 Supabase 專案

到 [supabase.com](https://supabase.com) 註冊並建立一個新專案（免費方案即可），等待專案初始化完成。

### 2. 建立資料表

**全新專案**：進入專案的 **SQL Editor**，貼上 `supabase/schema.sql` 這個檔案的完整內容，按 **Run** 執行一次。
這會建立 `records` 資料表、防重複的唯一限制、Row Level Security 政策，以及開啟 Realtime 同步。

**已經執行過 `schema.sql` 的舊專案（資料庫裡已經有資料）**：
不要重新執行 `schema.sql`，依序貼上以下兩份遷移腳本到 SQL Editor 執行（如果之前已經跑過 `migration_002_add_visits.sql`，這份可以跳過，直接跑下一份就好）：

1. `supabase/migration_002_add_visits.sql` — 新增「西裝租借人次」與「商品購買人次」
2. `supabase/migration_003_add_costs.sql` — 新增「店租成本」與「人事成本」

這些遷移腳本只會新增欄位，**不會刪除或影響你既有的任何資料**，舊資料的新欄位會自動補成 0，
之後可以到「原始資料總表」點編輯補登回去。

### 3. 建立登入帳號

進入 **Authentication → Users**，點 **Add user** 手動建立一個（或多個）帳號，
直接設定電子郵件與密碼即可，不需要使用者自己註冊（這是內部工具，不開放公開註冊）。

### 4. 取得連線金鑰

進入 **Project Settings → API**，記下這兩個值，下一步會用到：

- **Project URL**（例如 `https://xxxxx.supabase.co`）
- **anon public key**（一長串字串）

> 這個 anon key 設計上就是要放在前端程式碼裡的，本身不是機密。
> 真正的保護來自第 2 步設定的 Row Level Security：沒有登入就無法讀寫資料表。

---

## 第二步：設定環境變數

### 本機開發

複製 `.env.example` 為 `.env.local`，填入剛剛取得的兩個值：

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon key
```

### 部署到 GitHub Pages

進入 GitHub repo 的 **Settings → Secrets and variables → Actions**，
新增兩個 **Repository secrets**：

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | 你的 Project URL |
| `VITE_SUPABASE_ANON_KEY` | 你的 anon public key |

GitHub Actions 在建置時會自動把這兩個值注入到打包後的網站中（已寫在 `.github/workflows/deploy.yml`）。

---

## 第三步：推上 GitHub，自動部署成網站

### 1. 建立 GitHub repo

到 [github.com/new](https://github.com/new) 建立一個新 repo，名稱建議叫 `store-analytics`
（若用別的名稱，記得同步修改 `vite.config.js` 裡的 `base` 路徑）。

### 2. 推送程式碼

```bash
git init
git add .
git commit -m "Initial commit: 年度門市業績與商品結構分析系統"
git branch -M main
git remote add origin https://github.com/<你的帳號>/store-analytics.git
git push -u origin main
```

### 3. 開啟 GitHub Pages

進入 repo 的 **Settings → Pages**，「Build and deployment」的 Source 選擇 **GitHub Actions**。
推送後，**Actions** 分頁會自動執行部署流程，完成後即可在以下網址看到網站：

```
https://<你的帳號>.github.io/store-analytics/
```

打開網站後，用第一步建立的帳號密碼登入即可開始使用。

> 如果你的 repo 名稱不是 `store-analytics`，記得把 `vite.config.js` 裡的
> `base: "/store-analytics/"` 改成 `base: "/你的repo名稱/"`。

---

## 在自己電腦本機執行

需先安裝 [Node.js](https://nodejs.org/)（18 以上版本），並完成上方「設定環境變數 → 本機開發」的步驟。

```bash
git clone https://github.com/<你的帳號>/store-analytics.git
cd store-analytics
npm install
npm run dev
```

打開終端機顯示的網址（通常是 `http://localhost:5173`）即可使用。

## 用 GitHub Codespaces 直接在雲端跑

1. 進入你的 GitHub repo 頁面 → 綠色 **Code** 按鈕 → **Codespaces** 分頁 → **Create codespace on main**
2. 在終端機輸入：

```bash
echo "VITE_SUPABASE_URL=你的URL" >> .env.local
echo "VITE_SUPABASE_ANON_KEY=你的anon key" >> .env.local
npm install
npm run dev -- --host
```

3. 點擊跳出的 port 通知（通常是 5173），選擇「在瀏覽器開啟」即可預覽。

---

## 資料安全說明

- 資料庫已開啟 Row Level Security：**沒有登入的人完全無法讀取或修改任何資料**，即使知道網址與 anon key 也不行。
- 想新增使用者（例如讓店長也能登入輸入資料），到 Supabase 後台的 **Authentication → Users** 新增帳號即可，不需要改程式碼。
- 若要讓不同門市的店長「只能看自己門市」、「不能看其他門市」，可以再進一步調整 `supabase/schema.sql` 裡的 RLS 政策，依使用者身分限制可見範圍——有需要的話我可以再幫你延伸這部分。

