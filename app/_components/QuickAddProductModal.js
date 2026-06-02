"use client"
import { useState, useEffect } from "react"

/**
 * 快速新增商品 modal — 4 個交易單據 (報價/銷貨/進貨/採購) 共用
 *
 * Props:
 *   open: boolean
 *   defaultName: string  — 預設品名（從 search 帶進來）
 *   accentColor: 'green'|'orange'|'blue'  — 視主題挑色 (受影響: 按鈕、邊框)
 *   onClose(): void
 *   onCreated(product): void  — 新增成功後回拋商品物件
 */
export default function QuickAddProductModal({ open, defaultName = "", accentColor = "green", onClose, onCreated }) {
  const [data, setData] = useState({ code: "", name: "", unit: "片", cost_price: 0, retail_price: 0, category: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setData({ code: "", name: defaultName || "", unit: "片", cost_price: 0, retail_price: 0, category: "" })
      setError("")
    }
  }, [open, defaultName])

  const submit = async () => {
    if (!data.code.trim()) { setError("請填寫品號"); return }
    if (!data.name.trim()) { setError("請填寫品名"); return }
    setSaving(true); setError("")
    try {
      const payload = {
        code: data.code.trim(),
        name: data.name.trim(),
        unit: data.unit || null,
        cost_price: Number(data.cost_price) || 0,
        retail_price: Number(data.retail_price) || 0,
        category: data.category || null,
        active: true,
      }
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "新增失敗")
      onCreated(result)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const btnColors = {
    green: "bg-green-600 hover:bg-green-700",
    orange: "bg-orange-500 hover:bg-orange-600",
    blue: "bg-blue-600 hover:bg-blue-700",
  }[accentColor] || "bg-green-600 hover:bg-green-700"

  const focusColor = {
    green: "focus:border-green-500",
    orange: "focus:border-orange-400",
    blue: "focus:border-blue-500",
  }[accentColor] || "focus:border-green-500"

  const inputCls = `w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none ${focusColor}`

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-gray-800 mb-4">快速新增商品</h3>
        {error && <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-base rounded-xl">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="block text-base font-semibold text-gray-600 mb-1"><span className="text-red-500 mr-1">*</span>品號</label>
            <input value={data.code} onChange={e => setData(d => ({ ...d, code: e.target.value }))} className={inputCls} placeholder="例：MA01" autoFocus />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-600 mb-1"><span className="text-red-500 mr-1">*</span>品名</label>
            <input value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">單位</label>
              <input value={data.unit} onChange={e => setData(d => ({ ...d, unit: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">進價</label>
              <input type="number" step="0.01" value={data.cost_price} onChange={e => setData(d => ({ ...d, cost_price: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">零售價</label>
              <input type="number" step="0.01" value={data.retail_price} onChange={e => setData(d => ({ ...d, retail_price: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <p className="text-sm text-gray-400 pt-1">商品分類、庫存等其他資料之後到「商品資料」頁面補</p>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-5 py-2.5 border-2 border-gray-200 text-base rounded-xl hover:bg-gray-50">取消</button>
          <button onClick={submit} disabled={saving}
            className={`px-5 py-2.5 text-white text-base font-semibold rounded-xl disabled:opacity-50 ${btnColors}`}>
            {saving ? "新增中..." : "新增並選取"}
          </button>
        </div>
      </div>
    </div>
  )
}
