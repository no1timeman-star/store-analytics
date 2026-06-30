import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

// 將資料庫的 snake_case 欄位轉成前端使用的 camelCase 欄位
function fromRow(row) {
  const productSuit = Number(row.product_suit) || 0;
  const productCasual = Number(row.product_casual) || 0;
  const productShoes = Number(row.product_shoes) || 0;
  const productWomen = Number(row.product_women) || 0;
  const suitRental = Number(row.suit_rental) || 0;
  const suitRentalVisits = Number(row.suit_rental_visits) || 0;
  const productVisits = Number(row.product_visits) || 0;
  const productTotal = productSuit + productCasual + productShoes + productWomen;
  return {
    id: row.id,
    year: row.year,
    month: row.month,
    storeId: row.store_id,
    suitRental,
    suitRentalVisits,
    productSuit,
    productCasual,
    productShoes,
    productWomen,
    productVisits,
    productTotal,
    grandTotal: suitRental + productTotal,
    // 客單價：人次為 0 時代表沒有資料可算，回傳 null 而不是 0，避免圖表誤判成「真的是 0 元」
    suitRentalAvgValue: suitRentalVisits > 0 ? suitRental / suitRentalVisits : null,
    productAvgValue: productVisits > 0 ? productTotal / productVisits : null,
  };
}

function toRow(record) {
  return {
    year: record.year,
    month: record.month,
    store_id: record.storeId,
    suit_rental: record.suitRental,
    suit_rental_visits: record.suitRentalVisits,
    product_suit: record.productSuit,
    product_casual: record.productCasual,
    product_shoes: record.productShoes,
    product_women: record.productWomen,
    product_visits: record.productVisits,
  };
}

// 取代原本的 useLocalStorageState：改成從 Supabase 讀寫，並透過 Realtime 多裝置同步
export function useSupabaseRecords(isAuthenticated) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("records")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setRecords(data.map(fromRow));
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setRecords([]);
      return;
    }

    fetchRecords();

    // Realtime：其他裝置或分店新增/修改/刪除資料時，自動更新畫面
    const channel = supabase
      .channel("records-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "records" }, () => {
        fetchRecords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, fetchRecords]);

  // 新增或更新一筆紀錄。回傳 { error, isDuplicate, existing }
  async function upsertRecord(record, editingId) {
    if (editingId) {
      const { error: updateError } = await supabase.from("records").update(toRow(record)).eq("id", editingId);
      if (updateError) return { error: updateError.message };
      return { error: null };
    }

    const { error: insertError } = await supabase.from("records").insert(toRow(record));

    if (insertError) {
      // 23505 = unique_violation，代表同年同月同門市已有紀錄
      if (insertError.code === "23505") {
        const existing = records.find(
          (r) => r.year === record.year && r.month === record.month && r.storeId === record.storeId
        );
        return { error: null, isDuplicate: true, existing };
      }
      return { error: insertError.message };
    }
    return { error: null };
  }

  async function deleteRecord(id) {
    const { error: deleteError } = await supabase.from("records").delete().eq("id", id);
    return { error: deleteError ? deleteError.message : null };
  }

  return { records, loading, error, upsertRecord, deleteRecord, refetch: fetchRecords };
}
