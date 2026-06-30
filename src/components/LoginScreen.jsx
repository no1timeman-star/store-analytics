import React, { useState } from "react";
import { LogIn, AlertCircle } from "lucide-react";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export default function LoginScreen({ onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await onSignIn(email, password);
    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "帳號或密碼不正確，請再確認一次。"
          : signInError.message
      );
    }
    setSubmitting(false);
  }

  return (
    <div className="ssa-login-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@500;700&family=Noto+Sans+TC:wght@400;500;600;700&display=swap');
        .ssa-login-root {
          --ink: #1C2333;
          --paper: #FAF8F4;
          --gold: #C9A961;
          --gold-deep: #A9854A;
          --danger: #B3463F;
          font-family: 'Noto Sans TC', sans-serif;
          min-height: 100vh;
          width: 100%;
          background: var(--paper);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .ssa-login-root * { box-sizing: border-box; }
        .ssa-login-card {
          width: 100%;
          max-width: 380px;
          background: var(--ink);
          color: #F2EFE6;
          border-radius: 14px;
          padding: 34px 30px 30px;
          box-shadow: 0 20px 50px rgba(28,35,51,0.18);
        }
        .ssa-login-mark {
          width: 38px;
          height: 38px;
          border-radius: 9px;
          background: linear-gradient(155deg, var(--gold), var(--gold-deep));
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink);
          font-weight: 700;
          font-family: 'Noto Serif TC', serif;
          margin-bottom: 16px;
        }
        .ssa-login-card h1 {
          font-family: 'Noto Serif TC', serif;
          font-size: 19px;
          margin: 0 0 4px;
          color: #FAF8F4;
        }
        .ssa-login-sub {
          font-size: 12.5px;
          color: #9CA3B8;
          margin-bottom: 26px;
        }
        .ssa-login-tickrule {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          margin: 10px 0 24px;
        }
        .ssa-login-tickrule span {
          width: 1.5px;
          background: var(--gold);
          opacity: 0.45;
          display: block;
        }
        .ssa-login-field { margin-bottom: 16px; }
        .ssa-login-field label {
          display: block;
          font-size: 12.5px;
          color: #C7CCDB;
          margin-bottom: 6px;
          font-weight: 500;
        }
        .ssa-login-field input {
          width: 100%;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.16);
          color: #FAF8F4;
          border-radius: 7px;
          padding: 10px 12px;
          font-size: 13.5px;
          font-family: inherit;
        }
        .ssa-login-field input::placeholder { color: #7E8499; }
        .ssa-login-root :focus-visible { outline: 2px solid var(--gold-deep); outline-offset: 2px; }
        .ssa-login-submit {
          width: 100%;
          background: var(--gold);
          color: var(--ink);
          border: none;
          border-radius: 8px;
          padding: 11px 0;
          font-weight: 700;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          margin-top: 6px;
        }
        .ssa-login-submit:disabled { opacity: 0.6; cursor: default; }
        .ssa-login-error {
          margin-top: 14px;
          font-size: 12.5px;
          line-height: 1.5;
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          gap: 8px;
          background: rgba(179,70,63,0.16);
          color: #F3CFC9;
          border: 1px solid rgba(179,70,63,0.4);
        }
        .ssa-login-config-warning {
          margin-top: 16px;
          font-size: 11.5px;
          line-height: 1.6;
          color: #9CA3B8;
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 14px;
        }
      `}</style>

      <div className="ssa-login-card">
        <div className="ssa-login-mark">門</div>
        <h1>年度門市業績分析系統</h1>
        <div className="ssa-login-sub">請使用授權帳號登入後台</div>
        <div className="ssa-login-tickrule" aria-hidden="true">
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} style={{ height: i % 6 === 0 ? 9 : i % 2 === 0 ? 6 : 4 }} />
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ssa-login-field">
            <label htmlFor="login-email">電子郵件</label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="username"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="ssa-login-field">
            <label htmlFor="login-password">密碼</label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="ssa-login-submit" disabled={submitting}>
            <LogIn size={16} />
            {submitting ? "登入中…" : "登入"}
          </button>
        </form>

        {error && (
          <div className="ssa-login-error">
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {!isSupabaseConfigured && (
          <div className="ssa-login-config-warning">
            尚未偵測到 Supabase 連線設定。請確認已建立 .env.local（本機）或在 GitHub repo 的 Actions
            Secrets 中設定 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY，詳見 README。
          </div>
        )}
      </div>
    </div>
  );
}
