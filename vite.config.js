import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 部署到 GitHub Pages 時，網址會是
// https://<你的帳號>.github.io/<repo 名稱>/
// 因此 base 要設成 "/<repo 名稱>/"，否則資源路徑會 404。
// 在本機跑 npm run dev 時不受影響。
export default defineConfig({
  plugins: [react()],
  base: "/store-analytics/",
});
