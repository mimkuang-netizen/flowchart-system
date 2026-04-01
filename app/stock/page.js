"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Warehouse, ChevronLeft, AlertTriangle, SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react"

const CATEGORIES = [
  "全部","電器","五金","照明","衛浴","廚房","門窗","地板","塗料","管材",
  "電線","工具","安全防護","清潔用品","辦公用品","3C","家具","建材","其他","配件","文具"
]

const ADJUST_TYPES = ["盤盈", "盤虧", "入庫", "出庫"]

export default function StockPage() {
  const [products, setProducts] = useState([])
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("")
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [adjustType, setAdjustType] = useState("盤盈")
  const [quantity, setQuantity] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  // Recent adjustments
  const [recentAdjusts, setRecentAdjusts] = useState([])
  const [showRecent, setShowRecent] = useState(false)
  const [loadingRecent, setLoadingRecent] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch("/api/products?limit=500")
    const data = await res.json()
    setProducts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const fetchRecentAdjusts = async () => {
    setLoadingRecent(true)
    const res = await fetch("/api/stock-adjust")
    const data = await res.json()
    setRecentAdjusts(Array.isArray(data) ? data : [])
    setLoadingRecent(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = products.filter(p => {
    const matchQ = !q || (p.code || "").toLowerCase().includes(q.toLowerCase()) || (p.name || "").toLowerCase().includes(q.toLowerCase())
    const matchCat = !category || p.category === category
    return matchQ && matchCat
  })

  const getStatus = (p) => {
    const qty = Number(p.stock_qty || 0)
    const safety = Number(p.safety_stock || 0)
    if (qty <= 0) return { label: "缺貨", color: "bg-red-100 text-red-700" }
    if (qty <= safety) return { label: "低庫存", color: "bg-amber-100 text-amber-700" }
    return { label: "正常", color: "bg-green-100 text-green-700" }
  }

  const lowCount = products.filter(p => {
    const qty = Number(p.stock_qty || 0)
    const safety = Number(p.safety_stock || 0)
    return qty <= safety
  }).length

  // Modal helpers
  const openAdjustModal = (product) => {
    setSelectedProduct(product)
    setAdjustType("盤盈")
    setQuantity("")
    setNotes("")
    setShowModal(true)
  }

  const computeAfterQty = () => {
    if (!selectedProduct || !quantity) return null
    const before = Number(selectedProduct.stock_qty || 0)
    const qty = Number(quantity)
    if (adjustType === "盤盈" || adjustType === "入庫") return before + qty
    if (adjustType === "盤虧" || adjustType === "出庫") return before - qty
    return before
  }

  const handleSave = async () => {
    if (!selectedProduct || !quantity || Number(quantity) <= 0) return
    setSaving(true)
    const beforeQty = Number(selectedProduct.stock_qty || 0)
    const afterQty = computeAfterQty()

    await fetch("/api/stock-adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: selectedProduct.id,
        product_code: selectedProduct.code,
        product_name: selectedProduct.name,
        adjust_type: adjustType,
        quantity: Number(quantity),
        before_qty: beforeQty,
        after_qty: afterQty,
        notes
      })
    })

    setSaving(false)
    setShowModal(false)
    // Reload stock data
    fetchData()
    // Reload recent adjustments if visible
    if (showRecent) fetchRecentAdjusts()
  }

  const toggleRecent = () => {
    if (!showRecent) fetchRecentAdjusts()
    setShowRecent(!showRecent)
  }

  const typeStyle = (type) => {
    switch (type) {
      case "盤盈": return "bg-green-100 text-green-700"
      case "盤虧": return "bg-red-100 text-red-700"
      case "入庫": return "bg-blue-100 text-blue-700"
      case "出庫": return "bg-amber-100 text-amber-700"
      default: return "bg-gray-100 text-gray-600"
    }
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString("zh-TW") : "—"

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600">
              <ChevronLeft size={24} />
            </Link>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Warehouse className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">庫存管理</h1>
              <p className="text-base text-gray-400">商品與財務端 / 庫存查詢與調整</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {lowCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-5 py-3 rounded-xl">
            <AlertTriangle size={20} className="shrink-0" />
            <span className="text-base font-medium">
              有 <strong>{lowCount}</strong> 項商品庫存低於安全庫存量
            </span>
          </div>
        )}

        {/* Search & Category Filter */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="搜尋品號、品名..."
              className="w-full pl-10 pr-4 py-2.5 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="px-4 py-2.5 text-lg border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-blue-500"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat === "全部" ? "" : cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-xl text-gray-400">載入中...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-xl text-gray-400">無商品資料</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["品號", "品名", "單位", "分類", "庫存量", "安全庫存", "狀態", "操作"].map(h => (
                      <th key={h} className="px-5 py-4 text-left text-base font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p => {
                    const qty = Number(p.stock_qty || 0)
                    const safety = Number(p.safety_stock || 0)
                    const status = getStatus(p)
                    return (
                      <tr key={p.id} className={`hover:bg-blue-50/30 ${qty <= safety ? "bg-amber-50/40" : ""}`}>
                        <td className="px-5 py-4 text-base font-mono text-gray-500">{p.code}</td>
                        <td className="px-5 py-4 text-lg font-semibold">{p.name}</td>
                        <td className="px-5 py-4 text-base text-gray-500">{p.unit || "—"}</td>
                        <td className="px-5 py-4 text-base text-gray-500">{p.category || "—"}</td>
                        <td className={`px-5 py-4 text-xl font-bold ${qty <= 0 ? "text-red-600" : qty <= safety ? "text-amber-600" : "text-blue-700"}`}>
                          {qty}
                        </td>
                        <td className="px-5 py-4 text-base text-gray-500">{safety || "—"}</td>
                        <td className="px-5 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => openAdjustModal(p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <SlidersHorizontal size={14} />
                            調整
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="text-base text-gray-400">共 {filtered.length} 項商品</p>

        {/* Recent Adjustments Toggle */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={toggleRecent}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-blue-600" />
              <span className="text-lg font-semibold text-gray-800">最近調整紀錄</span>
            </div>
            {showRecent ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
          </button>

          {showRecent && (
            <div className="border-t border-gray-100">
              {loadingRecent ? (
                <div className="py-10 text-center text-lg text-gray-400">載入中...</div>
              ) : recentAdjusts.length === 0 ? (
                <div className="py-10 text-center text-lg text-gray-400">尚無調整紀錄</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {["調整單號", "調整日期", "品號", "品名", "調整類型", "數量", "調整前", "調整後", "備註"].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-sm font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {recentAdjusts.slice(0, 20).map(item => (
                        <tr key={item.id} className="hover:bg-blue-50/30">
                          <td className="px-5 py-3 text-base font-mono font-semibold text-blue-700">{item.adjust_no || item.adj_no || "—"}</td>
                          <td className="px-5 py-3 text-sm text-gray-500">{fmt(item.adjust_date || item.adj_date || item.created_at)}</td>
                          <td className="px-5 py-3 text-sm font-mono text-gray-500">{item.product_code || "—"}</td>
                          <td className="px-5 py-3 text-sm">{item.product_name || "—"}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${typeStyle(item.adjust_type)}`}>
                              {item.adjust_type || "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-base font-bold text-gray-800">{item.quantity ?? "—"}</td>
                          <td className="px-5 py-3 text-sm text-gray-500">{item.before_qty ?? "—"}</td>
                          <td className="px-5 py-3 text-sm text-gray-700 font-semibold">{item.after_qty ?? "—"}</td>
                          <td className="px-5 py-3 text-sm text-gray-500">{item.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Adjust Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">庫存調整</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {/* Product Info */}
            <div className="mb-5 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm text-blue-600">{selectedProduct.code}</span>
                <span className="text-lg font-semibold">{selectedProduct.name}</span>
              </div>
              <div className="text-base text-gray-500">
                目前庫存：<span className="font-bold text-gray-800">{Number(selectedProduct.stock_qty || 0)}</span>
                {selectedProduct.unit && <span className="ml-1">{selectedProduct.unit}</span>}
              </div>
            </div>

            {/* Adjust Type */}
            <div className="mb-5">
              <label className="block text-base font-semibold text-gray-700 mb-2">調整類型</label>
              <select
                value={adjustType}
                onChange={e => setAdjustType(e.target.value)}
                className="w-full px-4 py-2.5 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
              >
                {ADJUST_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="mb-5">
              <label className="block text-base font-semibold text-gray-700 mb-2">調整數量</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="輸入數量"
                className="w-full px-4 py-2.5 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Preview */}
            {quantity && Number(quantity) > 0 && (
              <div className="mb-5 p-3 bg-gray-50 rounded-xl text-base">
                <span className="text-gray-500">調整前: </span>
                <span className="font-semibold">{Number(selectedProduct.stock_qty || 0)}</span>
                <span className="mx-2 text-gray-400">&rarr;</span>
                <span className="text-gray-500">調整後: </span>
                <span className="font-bold text-blue-700">{computeAfterQty()}</span>
              </div>
            )}

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-base font-semibold text-gray-700 mb-2">備註</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="調整原因或備註..."
                rows={2}
                className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!quantity || Number(quantity) <= 0 || saving}
                className="px-5 py-2.5 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "儲存中..." : "確認調整"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
