"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, SlidersHorizontal, ChevronLeft, Trash2, Search, Package, X } from "lucide-react"

const ADJUST_TYPES = ["盤盈", "盤虧", "入庫", "出庫"]

export default function StockAdjustList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState(null)
  const [showModal, setShowModal] = useState(false)

  // Modal form state
  const [products, setProducts] = useState([])
  const [productSearch, setProductSearch] = useState("")
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [adjustType, setAdjustType] = useState("盤盈")
  const [quantity, setQuantity] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch("/api/stock-adjust")
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const fetchProducts = async () => {
    const res = await fetch("/api/products?limit=500")
    const data = await res.json()
    setProducts(Array.isArray(data) ? data : [])
  }

  useEffect(() => { fetchData() }, [])

  const handleDelete = async () => {
    await fetch(`/api/stock-adjust/${deleteId}`, { method: "DELETE" })
    setDeleteId(null)
    fetchData()
  }

  const openModal = () => {
    fetchProducts()
    setSelectedProduct(null)
    setProductSearch("")
    setAdjustType("盤盈")
    setQuantity("")
    setNotes("")
    setShowModal(true)
  }

  const filteredProducts = products.filter(p =>
    !productSearch ||
    (p.code || "").toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.name || "").toLowerCase().includes(productSearch.toLowerCase())
  )

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
    fetchData()
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString("zh-TW") : "—"

  const typeStyle = (type) => {
    switch (type) {
      case "盤盈": return "bg-green-100 text-green-700"
      case "盤虧": return "bg-red-100 text-red-700"
      case "入庫": return "bg-blue-100 text-blue-700"
      case "出庫": return "bg-amber-100 text-amber-700"
      default: return "bg-gray-100 text-gray-600"
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600">
              <ChevronLeft size={24} />
            </Link>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <SlidersHorizontal className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">庫存調整</h1>
              <p className="text-base text-gray-400">商品與財務端 / 庫存管理</p>
            </div>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700"
          >
            <Plus size={20} /> 新增調整
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-xl text-gray-400">載入中...</div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-xl text-gray-400">尚無庫存調整記錄</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["調整單號", "調整日期", "品號", "品名", "調整類型", "調整數量", "調整前庫存", "調整後庫存", "備註", "操作"].map(h => (
                      <th key={h} className="px-5 py-4 text-left text-base font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-blue-50/30">
                      <td className="px-5 py-4 text-lg font-mono font-semibold text-blue-700">{item.adjust_no || item.adj_no || "—"}</td>
                      <td className="px-5 py-4 text-base text-gray-500">{fmt(item.adjust_date || item.adj_date || item.created_at)}</td>
                      <td className="px-5 py-4 text-base font-mono text-gray-500">{item.product_code || "—"}</td>
                      <td className="px-5 py-4 text-base">{item.product_name || "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${typeStyle(item.adjust_type)}`}>
                          {item.adjust_type || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-lg font-bold text-gray-800">{item.quantity ?? "—"}</td>
                      <td className="px-5 py-4 text-base text-gray-500">{item.before_qty ?? "—"}</td>
                      <td className="px-5 py-4 text-base text-gray-700 font-semibold">{item.after_qty ?? "—"}</td>
                      <td className="px-5 py-4 text-base text-gray-500">{item.notes || "—"}</td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="text-base text-gray-400">共 {items.length} 筆</p>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold mb-3">確認刪除</h3>
            <p className="text-lg text-gray-600 mb-6">確定要刪除此調整記錄？庫存數量不會自動回復。</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-5 py-2.5 border-2 border-gray-200 text-lg rounded-xl">取消</button>
              <button onClick={handleDelete} className="px-5 py-2.5 bg-red-500 text-white text-lg font-semibold rounded-xl hover:bg-red-600">確認刪除</button>
            </div>
          </div>
        </div>
      )}

      {/* New Adjustment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">新增庫存調整</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {/* Product Picker */}
            <div className="mb-5">
              <label className="block text-base font-semibold text-gray-700 mb-2">選擇商品</label>
              {selectedProduct ? (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <Package size={20} className="text-blue-600 shrink-0" />
                  <div className="flex-1">
                    <span className="font-mono text-sm text-blue-600">{selectedProduct.code}</span>
                    <span className="ml-2 text-base font-semibold">{selectedProduct.name}</span>
                    <span className="ml-2 text-sm text-gray-500">庫存: {Number(selectedProduct.stock_qty || 0)}</span>
                  </div>
                  <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="搜尋品號或品名..."
                      className="w-full pl-10 pr-4 py-2.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl">
                    {filteredProducts.length === 0 ? (
                      <div className="py-4 text-center text-gray-400 text-sm">無符合商品</div>
                    ) : (
                      filteredProducts.slice(0, 50).map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedProduct(p); setProductSearch("") }}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-b-0"
                        >
                          <span className="font-mono text-sm text-gray-500">{p.code}</span>
                          <span className="ml-2 text-base">{p.name}</span>
                          <span className="ml-2 text-sm text-gray-400">庫存: {Number(p.stock_qty || 0)}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
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
            {selectedProduct && quantity && Number(quantity) > 0 && (
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
                disabled={!selectedProduct || !quantity || Number(quantity) <= 0 || saving}
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
