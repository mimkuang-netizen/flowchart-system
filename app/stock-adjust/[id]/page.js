"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Save, SlidersHorizontal, Plus, Trash2, Search } from "lucide-react"

const EMPTY_ITEM = { product_id: null, product_code: "", product_name: "", unit: "", before_qty: 0, adj_qty: 0, after_qty: 0, reason: "" }

function genNo() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`
  return `SA${ymd}${String(Math.floor(Math.random() * 900) + 100)}`
}

export default function StockAdjustForm() {
  const router = useRouter()
  const { id } = useParams()
  const isNew = id === "new"
  const today = new Date().toISOString().split("T")[0]

  const [form, setForm] = useState({ adj_no: genNo(), adj_date: today, adj_type: "adjust", notes: "" })
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [products, setProducts] = useState([])
  const [productSearch, setProductSearch] = useState("")
  const [showProductPicker, setShowProductPicker] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/products?limit=500").then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : []))
  }, [])

  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const next = { ...item, [field]: value }
      if (field === "adj_qty" || field === "before_qty") {
        next.after_qty = Number(next.before_qty) + Number(next.adj_qty)
      }
      return next
    }))
  }

  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }])
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i))

  const pickProduct = (product, index) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const before = Number(product.stock_qty || 0)
      return { ...item, product_id: product.id, product_code: product.code, product_name: product.name, unit: product.unit || "", before_qty: before, after_qty: before + Number(item.adj_qty) }
    }))
    setShowProductPicker(null)
  }

  const handleSave = async () => {
    const validItems = items.filter(it => it.product_name.trim())
    if (validItems.length === 0) { setError("請至少選擇一項商品"); return }
    setError(""); setSaving(true)
    const payload = { ...form, items: validItems }
    const res = await fetch("/api/stock-adjust", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const data = await res.json(); setSaving(false)
    if (!res.ok) { setError(data.error || "儲存失敗"); return }
    router.push("/stock-adjust")
  }

  const filteredProducts = products.filter(p => p.name?.includes(productSearch) || p.code?.includes(productSearch)).slice(0, 10)
  const inputCls = "w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/stock-adjust" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center"><SlidersHorizontal className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">新增庫存調整</h1>
              <p className="text-base text-gray-400">商品與財務端 / 庫存管理</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/stock-adjust" className="px-5 py-2.5 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50">取消</Link>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
              <Save size={18} />{saving ? "儲存中..." : "確認調整"}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-lg px-5 py-3 rounded-xl">{error}</div>}
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-5 py-3 rounded-xl text-base">
          ⚠️ 儲存後將直接更新商品庫存數量，請確認調整數量正確後再儲存。
        </div>
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">基本資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div><label className="block text-base font-semibold text-gray-600 mb-1">調整單號</label>
              <input value={form.adj_no} onChange={e => setForm(f => ({ ...f, adj_no: e.target.value }))} className={inputCls} /></div>
            <div><label className="block text-base font-semibold text-gray-600 mb-1">調整日期</label>
              <input type="date" value={form.adj_date} onChange={e => setForm(f => ({ ...f, adj_date: e.target.value }))} className={inputCls} /></div>
            <div><label className="block text-base font-semibold text-gray-600 mb-1">調整類型</label>
              <select value={form.adj_type} onChange={e => setForm(f => ({ ...f, adj_type: e.target.value }))} className={`${inputCls} bg-white`}>
                <option value="adjust">人工調整</option>
                <option value="stocktake">盤點調整</option>
              </select></div>
            <div className="md:col-span-3"><label className="block text-base font-semibold text-gray-600 mb-1">備註</label>
              <input value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} /></div>
          </div>
        </section>
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-700">調整明細</h2>
            <button onClick={addItem} className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 text-base font-semibold rounded-lg hover:bg-blue-100"><Plus size={16} /> 新增行</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead><tr className="bg-gray-50 text-gray-500">
                {["#", "品號", "品名", "單位", "調整前庫存", "調整數量(+/-)", "調整後庫存", "原因", ""].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2 w-32">
                      <div className="relative">
                        <input value={item.product_code} onChange={e => updateItem(idx, "product_code", e.target.value)}
                          onFocus={() => { setShowProductPicker(idx); setProductSearch(item.product_code) }}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" placeholder="品號" />
                        {showProductPicker === idx && (
                          <div className="absolute z-20 left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg">
                            <div className="p-2 border-b"><div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                              <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg" placeholder="搜尋商品..." autoFocus />
                            </div></div>
                            <div className="max-h-40 overflow-y-auto">
                              {filteredProducts.map(p => (
                                <button key={p.id} type="button" onClick={() => pickProduct(p, idx)}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex gap-2">
                                  <span className="font-mono text-gray-400 w-20">{p.code}</span>
                                  <span className="flex-1">{p.name}</span>
                                  <span className="text-blue-600 font-semibold">庫存:{p.stock_qty}</span>
                                </button>
                              ))}
                            </div>
                            <button onClick={() => setShowProductPicker(null)} className="w-full p-2 text-sm text-gray-400 border-t">關閉</button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 min-w-36"><input value={item.product_name} onChange={e => updateItem(idx, "product_name", e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg" placeholder="品名" /></td>
                    <td className="px-3 py-2 w-14"><input value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg" /></td>
                    <td className="px-3 py-2 w-24"><input type="number" value={item.before_qty} onChange={e => updateItem(idx, "before_qty", e.target.value)} className="w-full px-2 py-1.5 text-right border border-gray-200 rounded-lg bg-gray-50" /></td>
                    <td className="px-3 py-2 w-28">
                      <input type="number" value={item.adj_qty} onChange={e => updateItem(idx, "adj_qty", e.target.value)}
                        className={`w-full px-2 py-1.5 text-right border rounded-lg font-bold ${Number(item.adj_qty) > 0 ? "border-green-400 text-green-700 bg-green-50" : Number(item.adj_qty) < 0 ? "border-red-400 text-red-700 bg-red-50" : "border-gray-200"}`} />
                    </td>
                    <td className="px-3 py-2 w-24 text-right font-bold text-blue-700">{item.after_qty}</td>
                    <td className="px-3 py-2"><input value={item.reason || ""} onChange={e => updateItem(idx, "reason", e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg" placeholder="原因" /></td>
                    <td className="px-3 py-2"><button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="flex justify-end gap-3 pb-8">
          <Link href="/stock-adjust" className="px-8 py-3 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50">取消</Link>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
            <Save size={18} />{saving ? "儲存中..." : "確認調整"}
          </button>
        </div>
      </main>
      {showProductPicker !== null && <div className="fixed inset-0 z-10" onClick={() => setShowProductPicker(null)} />}
    </div>
  )
}
