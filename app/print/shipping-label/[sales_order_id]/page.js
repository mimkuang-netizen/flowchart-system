"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"

// 固定欄位（hardcode）
// 注意：發送站「安平」已預印在紙上，不再列印
const SENDER = {
  name: "冠毅",
  phone: "06-384-1619",
  note: ["到貨前請提早一小時", "電話聯繫！"],
}

// 預設欄位座標（mm）— 依翔駿託運單實際版型校正
// 紙張：217 × 102 mm（橫向）
const DEFAULT_POSITIONS = {
  // 第一列填寫區（寄件人 / 收貨人 / 收貨電話）
  senderName: { x: 27, y: 33 },        // 寄件人（左移 3mm）
  receiverName: { x: 85, y: 33 },      // 收貨人
  receiverPhone: { x: 150, y: 33 },    // (收貨)電話（左移 15mm）
  // 第二列填寫區（寄件電話 / 地址）
  senderPhone: { x: 27, y: 43 },       // (寄件)電話（左移 3mm）
  receiverAddress: { x: 85, y: 43 },   // 地址
  // 下方備註區
  note: { x: 16, y: 68 },              // 備註（左移 8mm）
}

const LS_X = "hjiun_label_offset_x"
const LS_Y = "hjiun_label_offset_y"
const LS_CALIBRATED = "hjiun_label_calibrated"

export default function ShippingLabelPrint() {
  const { sales_order_id } = useParams()
  const [order, setOrder] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [showCalibration, setShowCalibration] = useState(false)

  // 載入校正值
  useEffect(() => {
    if (typeof window === "undefined") return
    const x = Number(localStorage.getItem(LS_X)) || 0
    const y = Number(localStorage.getItem(LS_Y)) || 0
    const calibrated = localStorage.getItem(LS_CALIBRATED) === "true"
    setOffsetX(x)
    setOffsetY(y)
    setShowCalibration(!calibrated)
  }, [])

  // 載入資料
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await fetch(`/api/sales/${sales_order_id}`)
        if (!res.ok) {
          setError("找不到此銷貨單")
          setLoading(false)
          return
        }
        const data = await res.json()
        setOrder(data)

        // 依 customer_name 找對應客戶
        if (data.customer_name) {
          const cRes = await fetch(`/api/customers?q=${encodeURIComponent(data.customer_name)}`)
          if (cRes.ok) {
            const list = await cRes.json()
            const match = (Array.isArray(list) ? list : []).find(c => c.short_name === data.customer_name)
              || (Array.isArray(list) ? list[0] : null)
            setCustomer(match || null)
          }
        }
      } catch (e) {
        setError("載入失敗：" + e.message)
      }
      setLoading(false)
    }
    if (sales_order_id) fetchAll()
  }, [sales_order_id])

  // 計算實際欄位（優先用銷貨單的 ship_to_*，沒填才 fallback 客戶主檔）
  const receiverName = order?.ship_to_name || customer?.full_name || customer?.short_name || order?.customer_name || ""
  const receiverPhone = order?.ship_to_phone || customer?.phone || customer?.mobile || ""
  const receiverAddress = order?.ship_to_address || (customer
    ? [customer.delivery_zip, customer.delivery_city, customer.delivery_district, customer.delivery_address]
        .filter(Boolean).join("")
    : "")

  const canPrint = !!receiverName

  // 自動列印（資料載入完 + 已校正過）
  useEffect(() => {
    if (loading || error || !canPrint) return
    if (!showCalibration) {
      // 延遲一下讓畫面渲染完
      const t = setTimeout(() => window.print(), 400)
      return () => clearTimeout(t)
    }
  }, [loading, error, canPrint, showCalibration])

  // 缺欄位警告
  useEffect(() => {
    if (loading || error) return
    if (!receiverAddress) console.warn("⚠️ 託運單缺少送貨地址，請手寫補上")
    if (!receiverPhone) console.warn("⚠️ 託運單缺少聯絡電話，請手寫補上")
  }, [loading, error, receiverAddress, receiverPhone])

  const saveOffset = useCallback((x, y) => {
    setOffsetX(x); setOffsetY(y)
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_X, String(x))
      localStorage.setItem(LS_Y, String(y))
    }
  }, [])

  const confirmCalibration = () => {
    if (typeof window !== "undefined") localStorage.setItem(LS_CALIBRATED, "true")
    setShowCalibration(false)
    setTimeout(() => window.print(), 200)
  }

  const resetCalibration = () => {
    saveOffset(0, 0)
    if (typeof window !== "undefined") localStorage.removeItem(LS_CALIBRATED)
    setShowCalibration(true)
  }

  if (loading) return <div style={{ padding: 40, fontSize: 18 }}>載入中...</div>
  if (error) return <div style={{ padding: 40, fontSize: 18, color: "red" }}>{error}</div>
  if (!canPrint) return (
    <div style={{ padding: 40, fontSize: 18, color: "red" }}>
      ❌ 無法列印：公司名稱與客戶名稱都為空，請先補齊資料。
    </div>
  )

  // 套用 offset 的座標
  const pos = (key) => ({
    left: `${DEFAULT_POSITIONS[key].x + offsetX}mm`,
    top: `${DEFAULT_POSITIONS[key].y + offsetY}mm`,
  })

  return (
    <>
      {/* 列印用 CSS */}
      <style jsx global>{`
        @page {
          size: 217mm 102mm;
          margin: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #fff;
        }
        @media print {
          .no-print { display: none !important; }
          .label-page {
            page-break-after: always;
            page-break-inside: avoid;
          }
        }
        @media screen {
          body { background: #e5e7eb; }
          .label-page {
            margin: 20px auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            background: #fffef0;
            position: relative;
          }
        }
      `}</style>

      {/* 校正面板 */}
      {showCalibration && (
        <div className="no-print" style={{
          position: "fixed", top: 0, left: 0, right: 0,
          background: "#fff7ed", borderBottom: "2px solid #fb923c",
          padding: "16px 24px", zIndex: 100, fontSize: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>🔧 第一次列印校正</p>
              <p style={{ margin: "4px 0 0", color: "#666" }}>
                試印一張後，用按鈕微調 X/Y 位置（0.5mm 精度），對好後按「儲存並列印」
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>X 軸（左右）：{offsetX.toFixed(1)}mm</span>
              <button onClick={() => saveOffset(offsetX - 0.5, offsetY)} style={btnStyle}>← 左 0.5</button>
              <button onClick={() => saveOffset(offsetX + 0.5, offsetY)} style={btnStyle}>右 0.5 →</button>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>Y 軸（上下）：{offsetY.toFixed(1)}mm</span>
              <button onClick={() => saveOffset(offsetX, offsetY - 0.5)} style={btnStyle}>↑ 上 0.5</button>
              <button onClick={() => saveOffset(offsetX, offsetY + 0.5)} style={btnStyle}>下 0.5 ↓</button>
            </div>

            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button onClick={() => window.print()} style={{ ...btnStyle, background: "#6b7280", color: "#fff" }}>試印</button>
              <button onClick={confirmCalibration} style={{ ...btnStyle, background: "#16a34a", color: "#fff", fontWeight: 700 }}>✅ 儲存並列印</button>
              <button onClick={() => saveOffset(0, 0)} style={btnStyle}>重置位置</button>
            </div>
          </div>
          <p style={{ margin: "8px 0 0", color: "#92400e", fontSize: 12 }}>
            📋 列印對話框設定：紙張選 <b>自訂 217×102mm</b>／邊界 <b>0</b>／<b>無頁首頁尾</b>／縮放 <b>100%</b>／方向 <b>橫向</b>
          </p>
        </div>
      )}

      {/* 已校正過 — 顯示頂部小提示 */}
      {!showCalibration && (
        <div className="no-print" style={{
          position: "fixed", top: 0, left: 0, right: 0,
          background: "#f0f9ff", borderBottom: "1px solid #93c5fd",
          padding: "10px 24px", zIndex: 100, fontSize: 13,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <span>📦 列印託運單 — 已套用校正（X:{offsetX.toFixed(1)}mm, Y:{offsetY.toFixed(1)}mm）</span>
          <button onClick={() => window.print()} style={btnStyle}>🖨️ 再次列印</button>
          <button onClick={resetCalibration} style={btnStyle}>🔧 重新校正</button>
          <span style={{ color: "#666", marginLeft: "auto" }}>
            列印對話框：紙張 <b>217×102mm</b>／邊界 <b>0</b>／<b>無頁首頁尾</b>／<b>橫向</b>
          </span>
        </div>
      )}

      {/* 託運單列印區
          欄位實際尺寸（依預印版型）：
          - 寄件人欄高度 20mm（寄件人 + 寄件電話 共用）
          - 收貨人欄高度 20mm（收貨人 + 地址 共用）
          - 備註框 50mm × 30mm
      */}
      <div className="label-page" style={{
        width: "217mm", height: "102mm",
        position: "relative", overflow: "hidden",
        fontFamily: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", monospace',
      }}>
        {/* 收貨人（收貨欄上半，欄寬 120mm，但需扣掉右側電話欄空間） */}
        <div style={{ position: "absolute", ...pos("receiverName"), fontSize: "16pt", fontWeight: 700, maxWidth: "75mm", maxHeight: "9mm", overflow: "hidden", whiteSpace: "nowrap" }}>
          {receiverName}
        </div>

        {/* 收貨地址（收貨欄下半，使用完整 120mm 欄寬） */}
        <div style={{ position: "absolute", ...pos("receiverAddress"), fontSize: "16pt", fontWeight: 700, maxWidth: "115mm", maxHeight: "10mm", overflow: "hidden", lineHeight: 1.0, whiteSpace: "nowrap" }}>
          {receiverAddress || "（地址空白，請手寫）"}
        </div>

        {/* 收貨電話（獨立小框） */}
        <div style={{ position: "absolute", ...pos("receiverPhone"), fontSize: "17pt", fontWeight: 700, maxWidth: "35mm", whiteSpace: "nowrap" }}>
          {receiverPhone || "（電話空白）"}
        </div>

        {/* 寄件人（寄件欄上半，高度 ~10mm） */}
        <div style={{ position: "absolute", ...pos("senderName"), fontSize: "20pt", fontWeight: 700, maxWidth: "50mm", maxHeight: "9mm", overflow: "hidden", whiteSpace: "nowrap" }}>
          {SENDER.name}
        </div>

        {/* 寄件電話（寄件欄下半，高度 ~10mm） */}
        <div style={{ position: "absolute", ...pos("senderPhone"), fontSize: "17pt", fontWeight: 700, maxWidth: "50mm", whiteSpace: "nowrap" }}>
          {SENDER.phone}
        </div>

        {/* 備註 — 兩行，50mm × 30mm */}
        <div style={{ position: "absolute", ...pos("note"), fontSize: "14pt", fontWeight: 700, color: "#b91c1c", lineHeight: 1.3, maxWidth: "48mm", maxHeight: "28mm", overflow: "hidden" }}>
          {SENDER.note.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      </div>
    </>
  )
}

const btnStyle = {
  padding: "6px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
}
