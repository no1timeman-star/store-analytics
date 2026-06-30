import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import {
  Plus, Pencil, Trash2, TrendingUp, PieChart as PieIcon, BarChart3,
  LayoutDashboard, Table2, Inbox, AlertCircle, X, Check, RotateCcw,
  LogOut, Wifi, WifiOff, Loader2,
} from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { useSupabaseRecords } from "./hooks/useSupabaseRecords";
import LoginScreen from "./components/LoginScreen";

/* ----------------------------------------------------------------------- */
/* 常數設定                                                                  */
/* ----------------------------------------------------------------------- */

const STORES = [
  { id: "taipei",    name: "台北",  color: "#1C2333" },
  { id: "banqiao",   name: "板橋",  color: "#C9A961" },
  { id: "taoyuan",   name: "桃園",  color: "#5B8C7B" },
  { id: "zhongyuan", name: "中原",  color: "#B3463F" },
  { id: "taichung",  name: "台中",  color: "#4A6FA5" },
  { id: "kaohsiung", name: "高雄",  color: "#9B6B9E" },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const PRODUCT_CATS = [
  { key: "productSuit",   label: "西裝類", color: "#1C2333" },
  { key: "productCasual", label: "休閒類", color: "#C9A961" },
  { key: "productShoes",  label: "鞋子類", color: "#5B8C7B" },
  { key: "productWomen",  label: "女裝類", color: "#B3463F" },
];

const STRUCT_COLORS = { rental: "#C9A961", product: "#1C2333" };

/* ----------------------------------------------------------------------- */
/* 工具函式                                                                  */
/* ----------------------------------------------------------------------- */

const numberFmt = (n) => new Intl.NumberFormat("zh-TW").format(Math.round(n || 0));
const currencyFmt = (n) =>
  new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(
    Math.round(n || 0)
  );
const compactFmt = (n) => {
  if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(1)}萬`;
  return numberFmt(n);
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const storeOf = (id) => STORES.find((s) => s.id === id);

const blankAmounts = () => ({
  suitRental: "",
  suitRentalVisits: "",
  productSuit: "",
  productCasual: "",
  productShoes: "",
  productWomen: "",
  productVisits: "",
  rentCost: "",
  laborCost: "",
});

const emptyForm = (year) => ({
  id: null,
  year,
  month: 1,
  storeId: STORES[0].id,
  ...blankAmounts(),
});

function deriveTotals(rec) {
  const suitRental = Number(rec.suitRental) || 0;
  const suitRentalVisits = Number(rec.suitRentalVisits) || 0;
  const productSuit = Number(rec.productSuit) || 0;
  const productCasual = Number(rec.productCasual) || 0;
  const productShoes = Number(rec.productShoes) || 0;
  const productWomen = Number(rec.productWomen) || 0;
  const productVisits = Number(rec.productVisits) || 0;
  const rentCost = Number(rec.rentCost) || 0;
  const laborCost = Number(rec.laborCost) || 0;
  const productTotal = productSuit + productCasual + productShoes + productWomen;
  const grandTotal = suitRental + productTotal;
  const totalCost = rentCost + laborCost;
  const hasCostData = rentCost > 0 || laborCost > 0;
  const netProfit = hasCostData ? grandTotal - totalCost : null;
  const profitMargin = hasCostData && grandTotal > 0 ? (netProfit / grandTotal) * 100 : null;
  return {
    suitRental,
    suitRentalVisits,
    productSuit,
    productCasual,
    productShoes,
    productWomen,
    productVisits,
    productTotal,
    grandTotal,
    rentCost,
    laborCost,
    totalCost,
    hasCostData,
    netProfit,
    profitMargin,
    suitRentalAvgValue: suitRentalVisits > 0 ? suitRental / suitRentalVisits : null,
    productAvgValue: productVisits > 0 ? productTotal / productVisits : null,
  };
}

/* ----------------------------------------------------------------------- */
/* 小元件                                                                    */
/* ----------------------------------------------------------------------- */

// 簽名元素：呼應「西裝丈量」主題的刻度分隔線
function TickRule() {
  const ticks = Array.from({ length: 36 });
  return (
    <div className="ssa-tickrule" aria-hidden="true">
      {ticks.map((_, i) => (
        <span key={i} style={{ height: i % 6 === 0 ? 10 : i % 2 === 0 ? 7 : 4 }} />
      ))}
    </div>
  );
}

function SectionTitle({ icon, eyebrow, title, action }) {
  return (
    <div className="ssa-section-head">
      <div>
        {eyebrow && <div className="ssa-eyebrow">{eyebrow}</div>}
        <h2>
          {icon}
          {title}
        </h2>
        <TickRule />
      </div>
      {action}
    </div>
  );
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className="ssa-kpi">
      <div className="ssa-kpi-label">{label}</div>
      <div className="ssa-kpi-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub && <div className="ssa-kpi-sub">{sub}</div>}
    </div>
  );
}

function EmptyState({ text, hint }) {
  return (
    <div className="ssa-empty">
      <Inbox size={28} strokeWidth={1.5} />
      <p>{text}</p>
      {hint && <span>{hint}</span>}
    </div>
  );
}

/* 折線圖自訂 Tooltip：只列出當月有資料的門市，並依總額排序 */
function LineTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const rows = payload
    .filter((p) => p.value !== null && p.value !== undefined)
    .sort((a, b) => b.value - a.value);
  if (!rows.length) return null;
  return (
    <div className="ssa-tooltip">
      <div className="ssa-tooltip-title">{label}</div>
      {rows.map((r) => (
        <div className="ssa-tooltip-row" key={r.name}>
          <span className="ssa-tooltip-dot" style={{ background: r.color }} />
          <span className="ssa-tooltip-name">{r.name}</span>
          <span className="ssa-tooltip-val">{currencyFmt(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

function SimpleTooltip({ active, payload, totalForPercent }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  const pct = totalForPercent ? ((p.value / totalForPercent) * 100).toFixed(1) : null;
  return (
    <div className="ssa-tooltip">
      <div className="ssa-tooltip-row">
        <span className="ssa-tooltip-dot" style={{ background: p.payload.color || p.fill }} />
        <span className="ssa-tooltip-name">{p.name || p.payload.label}</span>
        <span className="ssa-tooltip-val">
          {currencyFmt(p.value)}
          {pct && <em> ・ {pct}%</em>}
        </span>
      </div>
    </div>
  );
}

/* 損益比較圖專用 Tooltip：業績／成本／淨利同時列出，淨利為 null 時顯示「尚無成本資料」 */
function StoreProfitTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="ssa-tooltip">
      <div className="ssa-tooltip-title">{label}</div>
      <div className="ssa-tooltip-row">
        <span className="ssa-tooltip-dot" style={{ background: "#C9A961" }} />
        <span className="ssa-tooltip-name">業績</span>
        <span className="ssa-tooltip-val">{currencyFmt(row.業績)}</span>
      </div>
      {row.hasCost && (
        <div className="ssa-tooltip-row">
          <span className="ssa-tooltip-dot" style={{ background: "#9CA3B8" }} />
          <span className="ssa-tooltip-name">成本</span>
          <span className="ssa-tooltip-val">{currencyFmt(row.成本)}</span>
        </div>
      )}
      <div className="ssa-tooltip-row">
        <span
          className="ssa-tooltip-dot"
          style={{ background: row.淨利 === null ? "#E8E3D8" : row.淨利 >= 0 ? "#3D7A5C" : "#B3463F" }}
        />
        <span className="ssa-tooltip-name">淨利</span>
        <span className="ssa-tooltip-val">{row.淨利 !== null ? currencyFmt(row.淨利) : "尚無成本資料"}</span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* 主程式                                                                    */
/* ----------------------------------------------------------------------- */

/* ----------------------------------------------------------------------- */
/* 儀表板主體（登入後才會渲染）                                              */
/* ----------------------------------------------------------------------- */

function Dashboard({ onSignOut }) {
  const thisYear = new Date().getFullYear();

  const { records, loading: recordsLoading, error: recordsError, upsertRecord, deleteRecord } =
    useSupabaseRecords(true);
  const [form, setForm] = useState(emptyForm(thisYear));
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState(null); // { type: 'warn'|'success'|'error', text }
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard | table
  const [dashYear, setDashYear] = useState(thisYear);
  const [dashStore, setDashStore] = useState("all");
  const [filterStore, setFilterStore] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3600);
    return () => clearTimeout(t);
  }, [notice]);

  const years = useMemo(() => {
    const set = new Set(records.map((r) => r.year));
    set.add(thisYear);
    return Array.from(set).sort((a, b) => b - a);
  }, [records, thisYear]);

  const totalsForForm = deriveTotals(form);

  /* ------------------------------- 表單操作 ------------------------------ */

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm(dashYear || thisYear));
    setEditingId(null);
  }

  function loadIntoForm(rec) {
    setForm({
      id: rec.id,
      year: rec.year,
      month: rec.month,
      storeId: rec.storeId,
      suitRental: String(rec.suitRental ?? ""),
      suitRentalVisits: String(rec.suitRentalVisits ?? ""),
      productSuit: String(rec.productSuit ?? ""),
      productCasual: String(rec.productCasual ?? ""),
      productShoes: String(rec.productShoes ?? ""),
      productWomen: String(rec.productWomen ?? ""),
      productVisits: String(rec.productVisits ?? ""),
      rentCost: String(rec.rentCost ?? ""),
      laborCost: String(rec.laborCost ?? ""),
    });
    setEditingId(rec.id);
    setNotice(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // 先用目前已載入的資料做即時檢查，省去一次往返；資料庫的 unique 限制是最後一道防線
    const duplicate = records.find(
      (r) => r.year === form.year && r.month === form.month && r.storeId === form.storeId && r.id !== editingId
    );
    if (duplicate && !editingId) {
      loadIntoForm(duplicate);
      setNotice({
        type: "warn",
        text: `${duplicate.year} 年 ${duplicate.month} 月「${storeOf(duplicate.storeId).name}」已有紀錄，已為您載入該筆資料以供修改。`,
      });
      return;
    }

    const totals = deriveTotals(form);
    const payload = {
      year: Number(form.year),
      month: Number(form.month),
      storeId: form.storeId,
      ...totals,
    };

    setSubmitting(true);
    const { error, isDuplicate, existing } = await upsertRecord(payload, editingId);
    setSubmitting(false);

    if (isDuplicate && existing) {
      loadIntoForm(existing);
      setNotice({
        type: "warn",
        text: `${existing.year} 年 ${existing.month} 月「${storeOf(existing.storeId).name}」已有紀錄，已為您載入該筆資料以供修改。`,
      });
      return;
    }

    if (error) {
      setNotice({ type: "error", text: `儲存失敗：${error}` });
      return;
    }

    setNotice({
      type: "success",
      text: editingId
        ? `已更新 ${payload.year} 年 ${payload.month} 月「${storeOf(payload.storeId).name}」的業績紀錄。`
        : `已新增 ${payload.year} 年 ${payload.month} 月「${storeOf(payload.storeId).name}」的業績紀錄。`,
    });
    resetForm();
  }

  async function handleDelete(id) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    const { error } = await deleteRecord(id);
    setConfirmDeleteId(null);
    if (error) {
      setNotice({ type: "error", text: `刪除失敗：${error}` });
      return;
    }
    if (editingId === id) resetForm();
    setNotice({ type: "success", text: "已刪除該筆紀錄。" });
  }

  /* ------------------------------ 儀表板運算 ----------------------------- */

  const yearRecords = useMemo(() => records.filter((r) => r.year === dashYear), [records, dashYear]);

  const lineData = useMemo(() => {
    return MONTHS.map((m) => {
      const row = { monthLabel: `${m}月` };
      STORES.forEach((s) => {
        const rec = yearRecords.find((r) => r.month === m && r.storeId === s.id);
        row[s.name] = rec ? rec.grandTotal : null;
      });
      return row;
    });
  }, [yearRecords]);

  const structureScope = useMemo(
    () => (dashStore === "all" ? yearRecords : yearRecords.filter((r) => r.storeId === dashStore)),
    [yearRecords, dashStore]
  );

  const structureData = useMemo(() => {
    const rental = structureScope.reduce((s, r) => s + r.suitRental, 0);
    const product = structureScope.reduce((s, r) => s + r.productTotal, 0);
    return [
      { name: "西裝租借", value: rental, color: STRUCT_COLORS.rental },
      { name: "商品購買", value: product, color: STRUCT_COLORS.product },
    ];
  }, [structureScope]);

  const structureTotal = structureData.reduce((s, d) => s + d.value, 0);

  const productCatData = useMemo(() => {
    return PRODUCT_CATS.map((c) => ({
      label: c.label,
      color: c.color,
      value: structureScope.reduce((s, r) => s + (r[c.key] || 0), 0),
    }));
  }, [structureScope]);

  const productCatTotal = productCatData.reduce((s, d) => s + d.value, 0);

  // 客單價趨勢：依目前選定的門市篩選範圍，逐月計算「租借客單價」與「購物客單價」
  const avgValueTrendData = useMemo(() => {
    return MONTHS.map((m) => {
      const monthRecs = structureScope.filter((r) => r.month === m);
      const rentalAmount = monthRecs.reduce((s, r) => s + r.suitRental, 0);
      const rentalVisits = monthRecs.reduce((s, r) => s + r.suitRentalVisits, 0);
      const productAmount = monthRecs.reduce((s, r) => s + r.productTotal, 0);
      const productVisits = monthRecs.reduce((s, r) => s + r.productVisits, 0);
      return {
        monthLabel: `${m}月`,
        租借客單價: rentalVisits > 0 ? Math.round(rentalAmount / rentalVisits) : null,
        購物客單價: productVisits > 0 ? Math.round(productAmount / productVisits) : null,
      };
    });
  }, [structureScope]);

  const hasVisitData = useMemo(
    () => yearRecords.some((r) => r.suitRentalVisits > 0 || r.productVisits > 0),
    [yearRecords]
  );

  const hasCostData = useMemo(() => yearRecords.some((r) => r.hasCostData), [yearRecords]);

  // 淨利趨勢：依目前選定的門市篩選範圍，逐月計算業績、成本、淨利，並累加成「年度累積淨利」
  // 只填寫部分月份的成本也沒關係，沒填的月份淨利會是 null（圖上斷線），不會被誤判成「淨利是 0」
  const profitTrendData = useMemo(() => {
    let cumulative = 0;
    let cumulativeStarted = false;
    return MONTHS.map((m) => {
      const monthRecs = structureScope.filter((r) => r.month === m);
      const revenue = monthRecs.reduce((s, r) => s + r.grandTotal, 0);
      const recordsWithCost = monthRecs.filter((r) => r.hasCostData);
      const hasCost = recordsWithCost.length > 0;
      const cost = recordsWithCost.reduce((s, r) => s + r.totalCost, 0);
      const monthRevenueWithCost = recordsWithCost.reduce((s, r) => s + r.grandTotal, 0);
      const netProfit = hasCost ? monthRevenueWithCost - cost : null;

      if (netProfit !== null) {
        cumulative += netProfit;
        cumulativeStarted = true;
      }

      return {
        monthLabel: `${m}月`,
        業績: revenue,
        淨利: netProfit,
        累積淨利: cumulativeStarted ? cumulative : null,
      };
    });
  }, [structureScope]);

  // 各門市的年度損益比較：用來對照「業績最高」是否等於「淨利最高」
  const storeProfitData = useMemo(() => {
    return STORES.map((s) => {
      const storeRecs = yearRecords.filter((r) => r.storeId === s.id);
      const revenue = storeRecs.reduce((sum, r) => sum + r.grandTotal, 0);
      const cost = storeRecs.reduce((sum, r) => sum + r.totalCost, 0);
      const recordsWithCost = storeRecs.filter((r) => r.hasCostData);
      const hasCost = recordsWithCost.length > 0;
      return {
        name: s.name,
        color: s.color,
        業績: revenue,
        成本: hasCost ? cost : 0,
        淨利: hasCost ? revenue - cost : null,
        hasCost,
      };
    });
  }, [yearRecords]);

  const kpis = useMemo(() => {
    const grand = yearRecords.reduce((s, r) => s + r.grandTotal, 0);
    const rental = yearRecords.reduce((s, r) => s + r.suitRental, 0);
    const product = yearRecords.reduce((s, r) => s + r.productTotal, 0);
    const byStore = STORES.map((s) => ({
      ...s,
      total: yearRecords.filter((r) => r.storeId === s.id).reduce((sum, r) => sum + r.grandTotal, 0),
    })).sort((a, b) => b.total - a.total);
    const monthsWithData = new Set(yearRecords.map((r) => r.month)).size;
    const totalRentalVisits = yearRecords.reduce((s, r) => s + r.suitRentalVisits, 0);
    const totalProductVisits = yearRecords.reduce((s, r) => s + r.productVisits, 0);

    const recordsWithCost = yearRecords.filter((r) => r.hasCostData);
    const totalCost = recordsWithCost.reduce((s, r) => s + r.totalCost, 0);
    const grandWithCost = recordsWithCost.reduce((s, r) => s + r.grandTotal, 0);
    const netProfit = recordsWithCost.length > 0 ? grandWithCost - totalCost : null;
    const profitMargin = netProfit !== null && grandWithCost > 0 ? (netProfit / grandWithCost) * 100 : null;
    const bestByProfit = [...storeProfitData]
      .filter((s) => s.hasCost)
      .sort((a, b) => b.淨利 - a.淨利)[0];

    return {
      grand,
      rentalPct: grand ? ((rental / grand) * 100).toFixed(1) : "0.0",
      productPct: grand ? ((product / grand) * 100).toFixed(1) : "0.0",
      best: byStore[0],
      avgMonthly: monthsWithData ? grand / monthsWithData : 0,
      rentalAvgValue: totalRentalVisits > 0 ? rental / totalRentalVisits : null,
      productAvgValue: totalProductVisits > 0 ? product / totalProductVisits : null,
      netProfit,
      profitMargin,
      bestByProfit,
    };
  }, [yearRecords, storeProfitData]);

  /* -------------------------------- 表格資料 ------------------------------ */

  const tableRows = useMemo(() => {
    return records
      .filter((r) => (filterStore === "all" ? true : r.storeId === filterStore))
      .filter((r) => (filterMonth === "all" ? true : r.month === Number(filterMonth)))
      .sort((a, b) => b.year - a.year || a.month - b.month || storeOf(a.storeId).name.localeCompare(storeOf(b.storeId).name));
  }, [records, filterStore, filterMonth]);

  const hasAnyData = records.length > 0;

  /* --------------------------------- 畫面 -------------------------------- */

  return (
    <div className="ssa-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@500;700&family=Noto+Sans+TC:wght@400;500;600;700&display=swap');

        .ssa-root {
          --ink: #1C2333;
          --paper: #FAF8F4;
          --surface: #FFFFFF;
          --line: #E8E3D8;
          --slate: #5B6478;
          --gold: #C9A961;
          --gold-deep: #A9854A;
          --success: #3D7A5C;
          --danger: #B3463F;
          --radius: 10px;
          font-family: 'Noto Sans TC', 'Noto Sans', sans-serif;
          background: var(--paper);
          color: var(--ink);
          min-height: 100vh;
          display: flex;
          width: 100%;
        }
        .ssa-root * { box-sizing: border-box; }
        .ssa-root h1, .ssa-root h2, .ssa-root h3 {
          font-family: 'Noto Serif TC', serif;
          margin: 0;
          letter-spacing: 0.01em;
        }
        .ssa-root button {
          font-family: inherit;
          cursor: pointer;
        }
        .ssa-root input, .ssa-root select {
          font-family: inherit;
        }
        .ssa-root :focus-visible {
          outline: 2px solid var(--gold-deep);
          outline-offset: 2px;
        }

        .ssa-spin { animation: ssa-spin 0.9s linear infinite; }
        @keyframes ssa-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        /* ---- 刻度簽名線 ---- */
        .ssa-tickrule {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          margin-top: 8px;
          margin-bottom: 2px;
        }
        .ssa-tickrule span {
          width: 1.5px;
          background: var(--gold);
          opacity: 0.55;
          display: block;
        }

        /* ---- 版面 ---- */
        .ssa-sidebar {
          width: 380px;
          flex-shrink: 0;
          background: var(--ink);
          color: #F2EFE6;
          padding: 28px 26px 40px;
          min-height: 100vh;
          position: sticky;
          top: 0;
          align-self: flex-start;
          max-height: 100vh;
          overflow-y: auto;
        }
        .ssa-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }
        .ssa-brand-mark {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: linear-gradient(155deg, var(--gold), var(--gold-deep));
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink);
          font-weight: 700;
          font-family: 'Noto Serif TC', serif;
          flex-shrink: 0;
        }
        .ssa-brand h1 {
          font-size: 17px;
          color: #FAF8F4;
          line-height: 1.3;
        }
        .ssa-brand-sub {
          font-size: 11.5px;
          color: #9CA3B8;
          letter-spacing: 0.06em;
          margin-top: 2px;
        }
        .ssa-sidebar .ssa-tickrule span { background: var(--gold); opacity: 0.4; }

        .ssa-main {
          flex: 1;
          min-width: 0;
          padding: 28px 36px 60px;
        }

        /* ---- 區塊標頭 ---- */
        .ssa-section-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .ssa-eyebrow {
          font-size: 11px;
          letter-spacing: 0.14em;
          color: var(--gold-deep);
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .ssa-section-head h2 {
          font-size: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--ink);
        }

        /* ---- 表單 ---- */
        .ssa-form-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: var(--radius);
          padding: 18px 18px 20px;
          margin-top: 22px;
        }
        .ssa-form-card.editing {
          border-color: var(--gold);
          background: rgba(201,169,97,0.08);
        }
        .ssa-edit-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(201,169,97,0.16);
          border: 1px solid rgba(201,169,97,0.4);
          color: #F4E8C8;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12.5px;
          margin-bottom: 14px;
        }
        .ssa-edit-banner button {
          background: none;
          border: none;
          color: #F4E8C8;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
        }
        .ssa-field {
          margin-bottom: 14px;
        }
        .ssa-field label {
          display: block;
          font-size: 12.5px;
          color: #C7CCDB;
          margin-bottom: 6px;
          font-weight: 500;
        }
        .ssa-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .ssa-root select, .ssa-root input[type="number"] {
          width: 100%;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.16);
          color: #FAF8F4;
          border-radius: 7px;
          padding: 9px 10px;
          font-size: 13.5px;
        }
        .ssa-root select option { color: #1C2333; }
        .ssa-root input[type="number"]::placeholder { color: #7E8499; }
        .ssa-root input[type="number"]::-webkit-outer-spin-button,
        .ssa-root input[type="number"]::-webkit-inner-spin-button { opacity: 0.5; }

        .ssa-avg-hint {
          font-size: 12px;
          color: #C7CCDB;
          margin: -8px 0 14px;
          padding-left: 2px;
        }
        .ssa-avg-hint b { color: var(--gold); font-weight: 700; }
        .ssa-subgroup {
          border: 1px dashed rgba(255,255,255,0.18);
          border-radius: 8px;
          padding: 12px 12px 4px;
          margin-bottom: 14px;
        }
        .ssa-subgroup.cost {
          border-style: solid;
          border-color: rgba(91,140,123,0.35);
          background: rgba(91,140,123,0.06);
        }
        .ssa-subgroup-title {
          font-size: 12px;
          color: #C7CCDB;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
        }
        .ssa-subgroup-title b { color: var(--gold); font-weight: 600; }
        .ssa-subgrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .ssa-subgrid .ssa-field { margin-bottom: 10px; }
        .ssa-subgrid label { font-size: 11.5px; }
        .ssa-cost-hint {
          font-size: 11px;
          color: #9CA3B8;
          line-height: 1.5;
          padding: 0 0 10px;
        }

        .ssa-total-box {
          background: rgba(255,255,255,0.06);
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .ssa-total-box span:first-child { font-size: 13px; color: #C7CCDB; }
        .ssa-total-box strong { font-size: 18px; color: var(--gold); font-family: 'Noto Serif TC', serif; }
        .ssa-total-box.profit span:first-child { display: flex; flex-direction: column; gap: 2px; }
        .ssa-total-box.profit em { font-style: normal; font-size: 11px; color: #9CA3B8; }
        .ssa-total-box.profit.positive { background: rgba(61,122,92,0.14); border: 1px solid rgba(61,122,92,0.35); }
        .ssa-total-box.profit.positive strong { color: #6FB892; }
        .ssa-total-box.profit.negative { background: rgba(179,70,63,0.14); border: 1px solid rgba(179,70,63,0.35); }
        .ssa-total-box.profit.negative strong { color: #E08E85; }

        .ssa-submit {
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
          transition: filter 0.15s ease;
        }
        .ssa-submit:hover { filter: brightness(1.06); }
        .ssa-reset {
          width: 100%;
          background: transparent;
          color: #C7CCDB;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 8px;
          padding: 9px 0;
          font-size: 12.5px;
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .ssa-notice {
          margin-top: 16px;
          font-size: 12.5px;
          line-height: 1.5;
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          gap: 8px;
        }
        .ssa-notice.success { background: rgba(61,122,92,0.18); color: #BFE6D2; border: 1px solid rgba(61,122,92,0.4); }
        .ssa-notice.warn { background: rgba(201,169,97,0.16); color: #F4E8C8; border: 1px solid rgba(201,169,97,0.4); }
        .ssa-notice.error { background: rgba(179,70,63,0.18); color: #F3CFC9; border: 1px solid rgba(179,70,63,0.4); }
        .ssa-submit:disabled { opacity: 0.6; cursor: default; filter: none; }

        /* ---- 主內容頂部 ---- */
        .ssa-topbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
          flex-wrap: wrap;
        }
        .ssa-topbar h1 {
          font-size: 23px;
          color: var(--ink);
        }
        .ssa-topbar-sub {
          color: var(--slate);
          font-size: 13px;
          margin-top: 4px;
        }
        .ssa-conn-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 99px;
          margin-left: 10px;
        }
        .ssa-conn-pill.online { background: rgba(61,122,92,0.12); color: var(--success); }
        .ssa-conn-pill.offline { background: rgba(179,70,63,0.12); color: var(--danger); }
        .ssa-signout {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #fff;
          border: 1px solid var(--line);
          color: var(--slate);
          border-radius: 9px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 600;
        }
        .ssa-signout:hover { background: #F4F1EA; color: var(--ink); }
        .ssa-tabs {
          display: flex;
          gap: 6px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 9px;
          padding: 4px;
        }
        .ssa-tab {
          border: none;
          background: transparent;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--slate);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ssa-tab.active {
          background: var(--ink);
          color: #fff;
        }

        /* ---- KPI ---- */
        .ssa-kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 28px;
        }
        .ssa-kpi {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 16px 18px;
        }
        .ssa-kpi-label {
          font-size: 12px;
          color: var(--slate);
          margin-bottom: 8px;
          font-weight: 500;
        }
        .ssa-kpi-value {
          font-size: 21px;
          font-family: 'Noto Serif TC', serif;
          font-weight: 700;
          color: var(--ink);
        }
        .ssa-kpi-sub {
          font-size: 11.5px;
          color: var(--slate);
          margin-top: 4px;
        }

        /* ---- 篩選列 ---- */
        .ssa-filters {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .ssa-filters select {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 7px;
          padding: 7px 10px;
          font-size: 13px;
          color: var(--ink);
        }
        .ssa-filters label {
          font-size: 12px;
          color: var(--slate);
          margin-right: -4px;
        }

        /* ---- 卡片 / 圖表容器 ---- */
        .ssa-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 22px 22px 10px;
          margin-bottom: 24px;
        }
        .ssa-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .ssa-donut-wrap { position: relative; }
        .ssa-donut-center {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          pointer-events: none;
        }
        .ssa-donut-center .lbl { font-size: 11px; color: var(--slate); margin-bottom: 2px; }
        .ssa-donut-center .val { font-size: 16px; font-weight: 700; font-family: 'Noto Serif TC', serif; color: var(--ink); }

        /* ---- 工具提示 ---- */
        .ssa-tooltip {
          background: var(--ink);
          color: #fff;
          border-radius: 8px;
          padding: 10px 13px;
          font-size: 12.5px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.18);
          min-width: 150px;
        }
        .ssa-tooltip-title {
          font-weight: 700;
          margin-bottom: 6px;
          font-family: 'Noto Serif TC', serif;
          border-bottom: 1px solid rgba(255,255,255,0.15);
          padding-bottom: 5px;
        }
        .ssa-tooltip-row {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 2px 0;
        }
        .ssa-tooltip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .ssa-tooltip-name { flex: 1; color: #D7DAE5; }
        .ssa-tooltip-val { font-weight: 700; }
        .ssa-tooltip-val em { color: var(--gold); font-style: normal; font-weight: 500; margin-left: 2px; }

        /* ---- 表格 ---- */
        .ssa-table-wrap {
          overflow-x: auto;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          background: var(--surface);
        }
        table.ssa-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1680px;
          font-size: 13px;
        }
        table.ssa-table th {
          text-align: right;
          font-size: 11.5px;
          color: var(--slate);
          font-weight: 600;
          padding: 12px 14px;
          border-bottom: 1px solid var(--line);
          white-space: nowrap;
          background: #FBFAF6;
        }
        table.ssa-table th:first-child,
        table.ssa-table th:nth-child(2),
        table.ssa-table th:nth-child(3) { text-align: left; }
        table.ssa-table td {
          text-align: right;
          padding: 11px 14px;
          border-bottom: 1px solid var(--line);
          white-space: nowrap;
          color: var(--ink);
        }
        table.ssa-table td:first-child,
        table.ssa-table td:nth-child(2),
        table.ssa-table td:nth-child(3) { text-align: left; }
        table.ssa-table tbody tr:hover { background: #FBF9F2; }
        table.ssa-table tbody tr:last-child td { border-bottom: none; }
        .ssa-store-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
        }
        .ssa-store-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .ssa-grand { font-weight: 700; color: var(--ink); }
        .ssa-profit-pos { color: var(--success); font-weight: 700; }
        .ssa-profit-neg { color: var(--danger); font-weight: 700; }
        .ssa-actions { display: flex; gap: 6px; justify-content: flex-end; }
        .ssa-icon-btn {
          border: 1px solid var(--line);
          background: #fff;
          border-radius: 6px;
          padding: 6px 8px;
          display: flex;
          align-items: center;
          color: var(--slate);
        }
        .ssa-icon-btn:hover { background: #F4F1EA; color: var(--ink); }
        .ssa-icon-btn.danger { color: var(--danger); border-color: rgba(179,70,63,0.3); }
        .ssa-icon-btn.danger.confirm { background: var(--danger); color: #fff; }
        .ssa-icon-btn.danger.confirm:hover { background: #9c3c36; }

        .ssa-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 50px 20px 56px;
          color: var(--slate);
          text-align: center;
          gap: 8px;
        }
        .ssa-empty p { font-size: 14px; font-weight: 600; color: var(--ink); margin: 4px 0 0; }
        .ssa-empty span { font-size: 12.5px; max-width: 280px; }

        .ssa-legend-row {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          padding: 4px 0 16px;
          font-size: 12.5px;
          color: var(--slate);
        }
        .ssa-legend-row .item { display: flex; align-items: center; gap: 6px; }
        .ssa-legend-row .dot { width: 9px; height: 9px; border-radius: 50%; }

        @media (max-width: 1080px) {
          .ssa-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .ssa-grid-2 { grid-template-columns: 1fr; }
        }
        @media (max-width: 880px) {
          .ssa-root { flex-direction: column; }
          .ssa-sidebar { width: 100%; position: relative; min-height: auto; max-height: none; }
          .ssa-main { padding: 24px 16px 48px; }
        }
      `}</style>

      {/* ----------------------------- 側邊欄：輸入表單 ---------------------------- */}
      <aside className="ssa-sidebar">
        <div className="ssa-brand">
          <div className="ssa-brand-mark">門</div>
          <div>
            <h1>年度門市業績分析系統</h1>
            <div className="ssa-brand-sub">ANNUAL STORE PERFORMANCE</div>
          </div>
        </div>
        <TickRule />

        <form ref={formRef} className={`ssa-form-card ${editingId ? "editing" : ""}`} onSubmit={handleSubmit}>
          {editingId && (
            <div className="ssa-edit-banner">
              <span>
                正在編輯：{form.year} 年 {form.month} 月・{storeOf(form.storeId).name}
              </span>
              <button type="button" onClick={resetForm}>
                <X size={13} /> 取消
              </button>
            </div>
          )}

          <div className="ssa-row">
            <div className="ssa-field">
              <label htmlFor="ssa-year">年度</label>
              <select id="ssa-year" value={form.year} onChange={(e) => updateField("year", Number(e.target.value))}>
                {Array.from(new Set([...years, thisYear])).sort((a, b) => b - a).map((y) => (
                  <option key={y} value={y}>{y} 年</option>
                ))}
                <option value={thisYear + 1}>{thisYear + 1} 年</option>
              </select>
            </div>
            <div className="ssa-field">
              <label htmlFor="ssa-month">月份</label>
              <select id="ssa-month" value={form.month} onChange={(e) => updateField("month", Number(e.target.value))}>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m} 月</option>
                ))}
              </select>
            </div>
          </div>

          <div className="ssa-field">
            <label htmlFor="ssa-store">門市</label>
            <select id="ssa-store" value={form.storeId} onChange={(e) => updateField("storeId", e.target.value)}>
              {STORES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="ssa-row">
            <div className="ssa-field">
              <label htmlFor="ssa-rental">西裝租借業績（元）</label>
              <input
                id="ssa-rental"
                type="number"
                min="0"
                step="100"
                placeholder="0"
                value={form.suitRental}
                onChange={(e) => updateField("suitRental", e.target.value)}
              />
            </div>
            <div className="ssa-field">
              <label htmlFor="ssa-rental-visits">租借人次</label>
              <input
                id="ssa-rental-visits"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={form.suitRentalVisits}
                onChange={(e) => updateField("suitRentalVisits", e.target.value)}
              />
            </div>
          </div>
          {totalsForForm.suitRentalAvgValue !== null && (
            <div className="ssa-avg-hint">
              租借客單價 ≈ <b>{currencyFmt(totalsForForm.suitRentalAvgValue)}</b> / 人次
            </div>
          )}

          <div className="ssa-subgroup">
            <div className="ssa-subgroup-title">
              <span>商品購買業績 — 子項目</span>
              <b>小計 {numberFmt(totalsForForm.productTotal)}</b>
            </div>
            <div className="ssa-subgrid">
              {PRODUCT_CATS.map((c) => (
                <div className="ssa-field" key={c.key}>
                  <label htmlFor={`ssa-${c.key}`}>{c.label}</label>
                  <input
                    id={`ssa-${c.key}`}
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={form[c.key]}
                    onChange={(e) => updateField(c.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="ssa-field" style={{ marginTop: 2 }}>
              <label htmlFor="ssa-product-visits">商品購買人次（全部子項目合計）</label>
              <input
                id="ssa-product-visits"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={form.productVisits}
                onChange={(e) => updateField("productVisits", e.target.value)}
              />
            </div>
            {totalsForForm.productAvgValue !== null && (
              <div className="ssa-avg-hint">
                購物客單價 ≈ <b>{currencyFmt(totalsForForm.productAvgValue)}</b> / 人次
              </div>
            )}
          </div>

          <div className="ssa-subgroup cost">
            <div className="ssa-subgroup-title">
              <span>當月固定成本</span>
              <b>小計 {numberFmt(totalsForForm.totalCost)}</b>
            </div>
            <div className="ssa-subgrid">
              <div className="ssa-field">
                <label htmlFor="ssa-rent-cost">店租成本（元）</label>
                <input
                  id="ssa-rent-cost"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={form.rentCost}
                  onChange={(e) => updateField("rentCost", e.target.value)}
                />
              </div>
              <div className="ssa-field">
                <label htmlFor="ssa-labor-cost">人事成本（元）</label>
                <input
                  id="ssa-labor-cost"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={form.laborCost}
                  onChange={(e) => updateField("laborCost", e.target.value)}
                />
              </div>
            </div>
            <div className="ssa-cost-hint">
              不填寫的話，這個月的淨利／淨利率不會被計算（避免被誤判成「成本是 0」）
            </div>
          </div>

          <div className="ssa-total-box">
            <span>總業績（租借＋購買）</span>
            <strong>{currencyFmt(totalsForForm.grandTotal)}</strong>
          </div>

          {totalsForForm.hasCostData && (
            <div className={`ssa-total-box profit ${totalsForForm.netProfit >= 0 ? "positive" : "negative"}`}>
              <span>
                淨利（業績－成本）
                {totalsForForm.profitMargin !== null && (
                  <em> ・ 淨利率 {totalsForForm.profitMargin.toFixed(1)}%</em>
                )}
              </span>
              <strong>{currencyFmt(totalsForForm.netProfit)}</strong>
            </div>
          )}

          <button type="submit" className="ssa-submit" disabled={submitting}>
            {submitting ? (
              <Loader2 size={16} className="ssa-spin" />
            ) : editingId ? (
              <Check size={16} />
            ) : (
              <Plus size={16} />
            )}
            {submitting ? "儲存中…" : editingId ? "儲存修改" : "新增這筆紀錄"}
          </button>
          {editingId && (
            <button type="button" className="ssa-reset" onClick={resetForm}>
              <RotateCcw size={13} /> 清空並新增另一筆
            </button>
          )}

          {notice && (
            <div className={`ssa-notice ${notice.type}`}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{notice.text}</span>
            </div>
          )}
        </form>
      </aside>

      {/* -------------------------------- 主內容區 -------------------------------- */}
      <main className="ssa-main">
        <div className="ssa-topbar">
          <div>
            <h1>業績與商品結構總覽</h1>
            <div className="ssa-topbar-sub">
              已收錄 {records.length} 筆原始紀錄，涵蓋 {STORES.length} 間門市
              <span className={`ssa-conn-pill ${recordsError ? "offline" : "online"}`}>
                {recordsError ? <WifiOff size={11} /> : <Wifi size={11} />}
                {recordsError ? "連線中斷" : "已同步雲端"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="ssa-tabs">
              <button
                className={`ssa-tab ${activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => setActiveTab("dashboard")}
              >
                <LayoutDashboard size={15} /> 儀表板總覽
              </button>
              <button
                className={`ssa-tab ${activeTab === "table" ? "active" : ""}`}
                onClick={() => setActiveTab("table")}
              >
                <Table2 size={15} /> 原始資料總表
              </button>
            </div>
            <button className="ssa-signout" onClick={onSignOut} title="登出">
              <LogOut size={14} /> 登出
            </button>
          </div>
        </div>

        {recordsError && (
          <div className="ssa-card" style={{ borderColor: "rgba(179,70,63,0.4)" }}>
            <div className="ssa-notice error" style={{ margin: 0 }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>無法連線到資料庫：{recordsError}。請確認網路連線，或稍後重新整理頁面再試一次。</span>
            </div>
          </div>
        )}

        {recordsLoading && !hasAnyData && !recordsError && (
          <div className="ssa-card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--slate)", padding: "10px 0" }}>
              <Loader2 size={16} className="ssa-spin" /> 正在從雲端載入業績資料…
            </div>
          </div>
        )}

        {activeTab === "dashboard" && (
          <>
            {!hasAnyData ? (
              <div className="ssa-card">
                <EmptyState
                  text="尚未有任何業績紀錄"
                  hint="從左側表單新增第一筆門市業績，圖表會立即在這裡呈現。"
                />
              </div>
            ) : (
              <>
                <div className="ssa-filters" style={{ marginBottom: 18 }}>
                  <label htmlFor="ssa-dash-year">年度</label>
                  <select id="ssa-dash-year" value={dashYear} onChange={(e) => setDashYear(Number(e.target.value))}>
                    {years.map((y) => (
                      <option key={y} value={y}>{y} 年</option>
                    ))}
                  </select>
                  <label htmlFor="ssa-dash-store" style={{ marginLeft: 8 }}>
                    結構圖門市篩選
                  </label>
                  <select id="ssa-dash-store" value={dashStore} onChange={(e) => setDashStore(e.target.value)}>
                    <option value="all">全部門市（合計）</option>
                    {STORES.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="ssa-kpi-grid">
                  <KpiCard label={`${dashYear} 年度總業績`} value={currencyFmt(kpis.grand)} />
                  <KpiCard
                    label="平均月業績"
                    value={currencyFmt(kpis.avgMonthly)}
                    sub="以已有紀錄之月份計算"
                  />
                  <KpiCard
                    label="西裝租借 ／ 商品購買佔比"
                    value={`${kpis.rentalPct}% ／ ${kpis.productPct}%`}
                  />
                  <KpiCard
                    label="年度業績最佳門市"
                    value={kpis.best && kpis.best.total > 0 ? kpis.best.name : "—"}
                    sub={
                      kpis.best && kpis.best.total > 0
                        ? kpis.bestByProfit && kpis.bestByProfit.name !== kpis.best.name
                          ? `業績第一，但淨利第一是「${kpis.bestByProfit.name}」`
                          : currencyFmt(kpis.best.total)
                        : "尚無資料"
                    }
                    accent="#C9A961"
                  />
                  <KpiCard
                    label="年度租借客單價"
                    value={kpis.rentalAvgValue !== null ? currencyFmt(kpis.rentalAvgValue) : "尚無人次資料"}
                    sub="租借總額 ÷ 租借人次"
                  />
                  <KpiCard
                    label="年度購物客單價"
                    value={kpis.productAvgValue !== null ? currencyFmt(kpis.productAvgValue) : "尚無人次資料"}
                    sub="購物總額 ÷ 購物人次"
                  />
                  <KpiCard
                    label="年度淨利（業績－成本）"
                    value={kpis.netProfit !== null ? currencyFmt(kpis.netProfit) : "尚無成本資料"}
                    sub={kpis.netProfit !== null ? "已扣除店租與人事成本" : "請在表單填寫店租／人事成本"}
                    accent={kpis.netProfit !== null ? (kpis.netProfit >= 0 ? "#3D7A5C" : "#B3463F") : undefined}
                  />
                  <KpiCard
                    label="年度淨利率"
                    value={kpis.profitMargin !== null ? `${kpis.profitMargin.toFixed(1)}%` : "尚無成本資料"}
                    sub="淨利 ÷ 總業績"
                    accent={kpis.profitMargin !== null ? (kpis.profitMargin >= 0 ? "#3D7A5C" : "#B3463F") : undefined}
                  />
                  <KpiCard
                    label="年度淨利最佳門市"
                    value={kpis.bestByProfit ? kpis.bestByProfit.name : "尚無成本資料"}
                    sub={kpis.bestByProfit ? currencyFmt(kpis.bestByProfit.淨利) : "請在表單填寫各店成本"}
                    accent="#3D7A5C"
                  />
                </div>

                <div className="ssa-card">
                  <SectionTitle
                    icon={<TrendingUp size={17} color="#C9A961" />}
                    eyebrow="MONTHLY TREND"
                    title="年度業績趨勢圖（各門市比較）"
                  />
                  <ResponsiveContainer width="100%" height={360}>
                    <LineChart data={lineData} margin={{ top: 6, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#E8E3D8" vertical={false} />
                      <XAxis
                        dataKey="monthLabel"
                        tick={{ fill: "#5B6478", fontSize: 12 }}
                        axisLine={{ stroke: "#E8E3D8" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#5B6478", fontSize: 12 }}
                        tickFormatter={(v) => compactFmt(v)}
                        axisLine={false}
                        tickLine={false}
                        width={56}
                      />
                      <Tooltip content={<LineTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12.5, paddingTop: 14 }} iconType="circle" />
                      {STORES.map((s) => (
                        <Line
                          key={s.id}
                          type="monotone"
                          dataKey={s.name}
                          name={s.name}
                          stroke={s.color}
                          strokeWidth={2.25}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                          connectNulls={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="ssa-card">
                  <SectionTitle
                    icon={<TrendingUp size={17} color="#C9A961" />}
                    eyebrow="AVERAGE SPEND PER VISIT"
                    title="客單價趨勢（租借 vs 購物）"
                  />
                  {!hasVisitData ? (
                    <EmptyState
                      text="此篩選範圍尚無人次資料"
                      hint="在左側表單填寫「租借人次」與「商品購買人次」後，這裡會自動算出客單價趨勢。"
                    />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={avgValueTrendData} margin={{ top: 6, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#E8E3D8" vertical={false} />
                        <XAxis
                          dataKey="monthLabel"
                          tick={{ fill: "#5B6478", fontSize: 12 }}
                          axisLine={{ stroke: "#E8E3D8" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#5B6478", fontSize: 12 }}
                          tickFormatter={(v) => compactFmt(v)}
                          axisLine={false}
                          tickLine={false}
                          width={56}
                        />
                        <Tooltip content={<LineTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12.5, paddingTop: 14 }} iconType="circle" />
                        <Line
                          type="monotone"
                          dataKey="租借客單價"
                          stroke={STRUCT_COLORS.rental}
                          strokeWidth={2.25}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                          connectNulls={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="購物客單價"
                          stroke={STRUCT_COLORS.product}
                          strokeWidth={2.25}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  <div className="ssa-topbar-sub" style={{ marginTop: -4, marginBottom: 14 }}>
                    {dashStore === "all" ? "目前顯示全部門市合計" : `目前顯示「${storeOf(dashStore).name}」單店資料`}
                    ，可透過上方「結構圖門市篩選」切換範圍
                  </div>
                </div>

                <div className="ssa-grid-2">
                  <div className="ssa-card">
                    <SectionTitle
                      icon={<PieIcon size={17} color="#C9A961" />}
                      eyebrow="REVENUE MIX"
                      title="整體業績結構佔比"
                    />
                    {structureTotal === 0 ? (
                      <EmptyState text="此篩選範圍尚無資料" />
                    ) : (
                      <>
                        <div className="ssa-donut-wrap">
                          <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                              <Pie
                                data={structureData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={72}
                                outerRadius={108}
                                paddingAngle={2}
                                cornerRadius={4}
                                stroke="none"
                              >
                                {structureData.map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip content={<SimpleTooltip totalForPercent={structureTotal} />} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="ssa-donut-center">
                            <div className="lbl">業績合計</div>
                            <div className="val">{compactFmt(structureTotal)}</div>
                          </div>
                        </div>
                        <div className="ssa-legend-row">
                          {structureData.map((d) => (
                            <span className="item" key={d.name}>
                              <span className="dot" style={{ background: d.color }} />
                              {d.name}・{((d.value / structureTotal) * 100).toFixed(1)}%（{currencyFmt(d.value)}）
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="ssa-card">
                    <SectionTitle
                      icon={<BarChart3 size={17} color="#C9A961" />}
                      eyebrow="PRODUCT BREAKDOWN"
                      title="商品購買細項佔比"
                    />
                    {productCatTotal === 0 ? (
                      <EmptyState text="此篩選範圍尚無資料" />
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart
                            data={productCatData}
                            layout="vertical"
                            margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
                          >
                            <CartesianGrid stroke="#E8E3D8" horizontal={false} />
                            <XAxis
                              type="number"
                              tickFormatter={(v) => compactFmt(v)}
                              tick={{ fill: "#5B6478", fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="label"
                              tick={{ fill: "#1C2333", fontSize: 13 }}
                              axisLine={false}
                              tickLine={false}
                              width={64}
                            />
                            <Tooltip content={<SimpleTooltip totalForPercent={productCatTotal} />} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={34}>
                              {productCatData.map((entry) => (
                                <Cell key={entry.label} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="ssa-legend-row">
                          {productCatData.map((d) => (
                            <span className="item" key={d.label}>
                              <span className="dot" style={{ background: d.color }} />
                              {d.label}・{((d.value / productCatTotal) * 100).toFixed(1)}%
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="ssa-card">
                  <SectionTitle
                    icon={<TrendingUp size={17} color="#3D7A5C" />}
                    eyebrow="PROFIT TREND"
                    title="淨利趨勢（逐月 vs 年度累積）"
                  />
                  {!hasCostData ? (
                    <EmptyState
                      text="尚未填寫任何月份的成本資料"
                      hint="在左側表單填寫「店租成本」與「人事成本」後，這裡會自動畫出淨利隨時間變化的趨勢。"
                    />
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={profitTrendData} margin={{ top: 6, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke="#E8E3D8" vertical={false} />
                          <XAxis
                            dataKey="monthLabel"
                            tick={{ fill: "#5B6478", fontSize: 12 }}
                            axisLine={{ stroke: "#E8E3D8" }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: "#5B6478", fontSize: 12 }}
                            tickFormatter={(v) => compactFmt(v)}
                            axisLine={false}
                            tickLine={false}
                            width={56}
                          />
                          <Tooltip content={<LineTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 12.5, paddingTop: 14 }} iconType="circle" />
                          <Line
                            type="monotone"
                            dataKey="淨利"
                            stroke="#3D7A5C"
                            strokeWidth={2.25}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            connectNulls={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="累積淨利"
                            stroke="#C9A961"
                            strokeWidth={2}
                            strokeDasharray="5 4"
                            dot={false}
                            activeDot={{ r: 5 }}
                            connectNulls={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      <div className="ssa-topbar-sub" style={{ marginTop: -4, marginBottom: 14 }}>
                        實線「淨利」是當月損益，虛線「累積淨利」是年初至今的加總，沒填成本的月份會自動斷線而非視為 0
                        ・{dashStore === "all" ? "目前顯示全部門市合計" : `目前顯示「${storeOf(dashStore).name}」單店資料`}
                      </div>
                    </>
                  )}
                </div>

                <div className="ssa-card">
                  <SectionTitle
                    icon={<BarChart3 size={17} color="#3D7A5C" />}
                    eyebrow="STORE PROFIT COMPARISON"
                    title="各門市年度損益比較"
                  />
                  {!hasCostData ? (
                    <EmptyState
                      text="尚未填寫任何門市的成本資料"
                      hint="在左側表單填寫「店租成本」與「人事成本」後，這裡會自動算出各店的真實淨利，而不只是業績排名。"
                    />
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={storeProfitData} margin={{ top: 6, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke="#E8E3D8" vertical={false} />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: "#5B6478", fontSize: 12 }}
                            axisLine={{ stroke: "#E8E3D8" }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: "#5B6478", fontSize: 12 }}
                            tickFormatter={(v) => compactFmt(v)}
                            axisLine={false}
                            tickLine={false}
                            width={56}
                          />
                          <Tooltip content={<StoreProfitTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 12.5, paddingTop: 14 }} iconType="circle" />
                          <Bar dataKey="業績" fill="#C9A961" radius={[4, 4, 0, 0]} maxBarSize={42} />
                          <Bar dataKey="成本" fill="#9CA3B8" radius={[4, 4, 0, 0]} maxBarSize={42} />
                          <Bar dataKey="淨利" radius={[4, 4, 0, 0]} maxBarSize={42}>
                            {storeProfitData.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={entry.淨利 === null ? "#E8E3D8" : entry.淨利 >= 0 ? "#3D7A5C" : "#B3463F"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="ssa-topbar-sub" style={{ marginTop: -4, marginBottom: 4 }}>
                        灰色「淨利」長條代表該門市尚未填寫成本資料，暫無法計算
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "table" && (
          <div>
            <div className="ssa-section-head">
              <div>
                <div className="ssa-eyebrow">RAW RECORDS</div>
                <h2><Table2 size={17} color="#C9A961" /> 原始資料總表</h2>
                <TickRule />
              </div>
              <div className="ssa-filters">
                <label htmlFor="ssa-f-store">門市</label>
                <select id="ssa-f-store" value={filterStore} onChange={(e) => setFilterStore(e.target.value)}>
                  <option value="all">全部門市</option>
                  {STORES.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <label htmlFor="ssa-f-month">月份</label>
                <select id="ssa-f-month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                  <option value="all">全部月份</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m} 月</option>
                  ))}
                </select>
              </div>
            </div>

            {tableRows.length === 0 ? (
              <div className="ssa-card">
                <EmptyState
                  text={hasAnyData ? "篩選範圍內沒有符合的紀錄" : "尚未有任何業績紀錄"}
                  hint={hasAnyData ? "請調整門市或月份篩選條件。" : "從左側表單新增第一筆門市業績吧。"}
                />
              </div>
            ) : (
              <div className="ssa-table-wrap">
                <table className="ssa-table">
                  <thead>
                    <tr>
                      <th>年度</th>
                      <th>月份</th>
                      <th>門市</th>
                      <th>西裝租借</th>
                      <th>租借人次</th>
                      <th>租借客單價</th>
                      <th>西裝類</th>
                      <th>休閒類</th>
                      <th>鞋子類</th>
                      <th>女裝類</th>
                      <th>商品購買合計</th>
                      <th>購買人次</th>
                      <th>購買客單價</th>
                      <th>總業績</th>
                      <th>店租成本</th>
                      <th>人事成本</th>
                      <th>淨利</th>
                      <th>淨利率</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((r) => {
                      const s = storeOf(r.storeId);
                      return (
                        <tr key={r.id}>
                          <td>{r.year}</td>
                          <td>{r.month} 月</td>
                          <td>
                            <span className="ssa-store-chip">
                              <span className="ssa-store-dot" style={{ background: s.color }} />
                              {s.name}
                            </span>
                          </td>
                          <td>{numberFmt(r.suitRental)}</td>
                          <td>{r.suitRentalVisits > 0 ? `${numberFmt(r.suitRentalVisits)} 人次` : "—"}</td>
                          <td>{r.suitRentalAvgValue !== null ? currencyFmt(r.suitRentalAvgValue) : "—"}</td>
                          <td>{numberFmt(r.productSuit)}</td>
                          <td>{numberFmt(r.productCasual)}</td>
                          <td>{numberFmt(r.productShoes)}</td>
                          <td>{numberFmt(r.productWomen)}</td>
                          <td>{numberFmt(r.productTotal)}</td>
                          <td>{r.productVisits > 0 ? `${numberFmt(r.productVisits)} 人次` : "—"}</td>
                          <td>{r.productAvgValue !== null ? currencyFmt(r.productAvgValue) : "—"}</td>
                          <td className="ssa-grand">{currencyFmt(r.grandTotal)}</td>
                          <td>{r.rentCost > 0 ? numberFmt(r.rentCost) : "—"}</td>
                          <td>{r.laborCost > 0 ? numberFmt(r.laborCost) : "—"}</td>
                          <td className={r.netProfit !== null ? (r.netProfit >= 0 ? "ssa-profit-pos" : "ssa-profit-neg") : ""}>
                            {r.netProfit !== null ? currencyFmt(r.netProfit) : "—"}
                          </td>
                          <td className={r.profitMargin !== null ? (r.profitMargin >= 0 ? "ssa-profit-pos" : "ssa-profit-neg") : ""}>
                            {r.profitMargin !== null ? `${r.profitMargin.toFixed(1)}%` : "—"}
                          </td>
                          <td>
                            <div className="ssa-actions">
                              <button className="ssa-icon-btn" title="編輯" onClick={() => loadIntoForm(r)}>
                                <Pencil size={14} />
                              </button>
                              <button
                                className={`ssa-icon-btn danger ${confirmDeleteId === r.id ? "confirm" : ""}`}
                                title={confirmDeleteId === r.id ? "再次點擊以確認刪除" : "刪除"}
                                onClick={() => handleDelete(r.id)}
                                onBlur={() => setConfirmDeleteId(null)}
                              >
                                {confirmDeleteId === r.id ? <Check size={14} /> : <Trash2 size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* 頂層進入點：負責登入狀態判斷                                              */
/* ----------------------------------------------------------------------- */

export default function App() {
  const { session, loading, signIn, signOut, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAF8F4",
          color: "#5B6478",
          fontFamily: "'Noto Sans TC', sans-serif",
          gap: 10,
        }}
      >
        <Loader2 size={18} className="ssa-spin" /> 正在確認登入狀態…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onSignIn={signIn} />;
  }

  return <Dashboard onSignOut={signOut} session={session} />;
}
