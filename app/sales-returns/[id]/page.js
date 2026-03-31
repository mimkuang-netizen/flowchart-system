"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { RotateCcw, ChevronLeft, Save, Plus, Trash2, Search, X } from "lucide-react"

const STATUS_OPTS = [
  { value: "draft", label: "草稿" },
  { value: "confirmed", label: "已確認" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
]
const TAX_TYPES = [
  { value: "taxed", label: "含稅（外加5%）" },
  { value: "included", label: "含稅（內含5%）" },
  { value: "tax_free", label: "免稅" },
]

const EMPTY_ITEM = { product_code: "", product_name: "", unit: "", quantity: 1, unit_price: 0, discount: 100, amount: 0, remark: "" }

function ProductPickerModal({ open, onClose, onPick, products }) {
  const [search, setSearch] = useState("")
  const inputRef = useRef(null)
  useEffect(() => { if (open) { setSearch(""); setTimeout(() => inputRef.current?.focus(), 100) } }, [open])
  if (!open) return null
  const filtered = products.filter(p => {
    const s = search.toLowerCase()
    return p.name?.toLowerCase().includes(s) || p.code?.toLowerCase().includes(s)
  }).slice(0, 50)
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl mx-4">
        <div className="flex items-center gap-3 p-4 border-b">
          <Search size={20} className="text-gray-400" />
          <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋品號或品名..."
            className="flex-1 text-lg outline-none" />
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-base">
            <thead className="bg-gray-50 sticky top-0"><tr>
              {["品號", "品名", "單位", "零售價", "標準進價"].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">查無符合商品</td></tr>
              : filtered.map(p => (
                <tr key={p.id} onClick={() => onPick(p)} className="hover:bg-red-50 cursor-pointer border-b border-gray-100">
                  <td className="px-3 py-2 font-mono text-sm">{p.code}</td>
                  <td className="px-3 py-2 font-semibold">{p.name}</td>
                  <td className="px-3 py-2 text-gray-500">{p.unit}</td>
                  <td className="px-3 py-2 text-red-600 font-semibold">${Number(p.retail_price || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-gray-500">${Number(p.cost_price || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-center text-sm text-gray-400 py-2">顯示 {filtered.length} 筆商品，共 {products.length} 筆</div>
        </div>
      </div>
    </div>
  )
}

export default function SalesReturnForm() {
  const { id } = useParams()
  const router = useRouter()
  const isNew = id === "new"

  const today = new Date().toISOString().slice(0, 10)
  const genNo = () => "RT" + new Date().toISOString().replace(/[-T:\.Z]/g, "").slice(0, 14)

  const [form, setForm] = useState({
    return_no: genNo(), customer_name: "", return_date: today,
    original_order_no: "", reason: "", status: "draft", tax_type: "taxed",
    subtotal: 0, tax_amount: 0, total: 0, notes: "",
  })
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState("")
  const [customerQ, setCustomerQ] = useState("")
  const [showCustomerList, setShowCustomerList] = useState(false)
  const [pickerIdx, setPickerIdx] = useState(-1)
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  useEffect(() => {
    fetch("/api/customers").then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : []))
    fetch("/api/products?limit=500").then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : []))
    if (!isNew) {
      fetch(`/api/sales-returns/${id}`)
        .then(r => r.json())
        .then(data => {
          const { sales_return_items, ...header } = data
          setForm(header)
          setItems(sales_return_items?.length > 0 ? sales_return_items.sort((a, b) => a.sort_order - b.sort_order) : [{ ...EMPTY_ITEM }])
          if (header.customer_name) {
            fetch(`/api/customers?q=${encodeURIComponent(header.customer_name)}`)
              .then(r => r.json())
              .then(custs => {
                const match = custs.find(c => c.short_name === header.customer_name) || custs[0]
                if (match) setSelectedCustomer(match)
              }).catch(() => {})
          }
          setLoading(false)
        })
        .catch(() => { setError("找不到此退回單"); setLoading(false) })
    }
  }, [id, isNew])

  const calcTotals = useCallback((itemList, taxType) => {
    const subtotal = itemList.reduce((s, it) => s + (Number(it.amount) || 0), 0)
    let tax = 0
    if (taxType === "taxed") tax = Math.round(subtotal * 0.05)
    const total = taxType === "included" ? subtotal : subtotal + tax
    return { subtotal, tax_amount: tax, total }
  }, [])

  const updateItem = (index, field, value) => {
    setItems(prev => {
      const updated = prev.map((item, i) => {
        if (i !== index) return item
        const n = { ...item, [field]: value }
        const qty = Number(n.quantity) || 0; const price = Number(n.unit_price) || 0; const disc = Number(n.discount) || 100
        n.amount = Math.round(qty * price * (disc / 100) * 100) / 100
        return n
      })
      setForm(f => ({ ...f, ...calcTotals(updated, f.tax_type) }))
      return updated
    })
  }

  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }])
  const removeItem = (i) => setItems(prev => { const u = prev.filter((_, idx) => idx !== i); setForm(f => ({ ...f, ...calcTotals(u, f.tax_type) })); return u })

  const pickCustomer = (c) => { setForm(f => ({ ...f, customer_name: c.short_name })); setSelectedCustomer(c); setShowCustomerList(false) }
  const pickProduct = (product, index) => {
    setItems(prev => {
      const updated = prev.map((item, i) => {
        if (i !== index) return item
        const qty = Number(item.quantity) || 1; const price = Number(product.retail_price) || 0; const disc = Number(item.discount) || 100
        return { ...item, product_code: product.code, product_name: product.name, unit: product.unit || "", unit_price: price, amount: Math.round(qty * price * (disc / 100) * 100) / 100 }
      })
      setForm(f => ({ ...f, ...calcTotals(updated, f.tax_type) }))
      return updated
    })
    setPickerIdx(-1)
  }

  const filteredCustomers = customers.filter(c => {
    const s = (customerQ || form.customer_name || "").toLowerCase()
    return c.short_name?.toLowerCase().includes(s) || c.code?.toLowerCase().includes(s) || c.full_name?.toLowerCase().includes(s)
  }).slice(0, 10)

  const handleSave = async () => {
    if (!form.return_no || !form.customer_name) { setError("請填寫退回單號和客戶名稱"); return }
    const validItems = items.filter(it => it.product_code || it.product_name)
    const payload = { ...form, items: validItems }
    delete payload.sales_return_items

    const res = await fetch(isNew ? "/api/sales-returns" : `/api/sales-returns/${id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.ok) router.push("/sales-returns")
    else {
      const d = await res.json()
      setError(d.error || "儲存失敗")
    }
  }

  const inputCls = "w-full px-4 py-2.5 text-lg border border-gray-200 rounded-xl focus:outline-none focus:border-red-400 bg-white"

  if (loading) return <div className="flex items-center justify-center min-h-screen text-xl text-gray-400">載入中...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/sales-returns" className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={22} className="text-gray-500" /></Link>
            <RotateCcw className="w-9 h-9 text-white bg-red-500 rounded-xl p-1.5" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">{isNew ? "新增銷貨退回單" : "編輯銷貨退回單"}</h1>
              <p className="text-sm text-gray-400">客戶端 / 銷貨退回作業</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/sales-returns" className="px-5 py-2.5 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50">取消</Link>
            <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white text-lg font-semibold rounded-xl hover:bg-red-600">
              <Save size={18} /> 儲存
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-lg px-5 py-3 rounded-xl">{error}</div>}

        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">基本資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1"><span className="text-red-500 mr-1">*</span>退回單號</label>
              <input value={form.return_no} onChange={e => setForm(f => ({ ...f, return_no: e.target.value }))} className={inputCls} />
            </div>
            <div className="relative">
              <label className="block text-base font-semibold text-gray-600 mb-1"><span className="text-red-500 mr-1">*</span>客戶名稱</label>
              <input value={form.customer_name}
                onChange={e => { setForm(f => ({ ...f, customer_name: e.target.value })); setCustomerQ(e.target.value); setShowCustomerList(true) }}
                onFocus={() => setShowCustomerList(true)} placeholder="輸入客戶名稱或代號" className={inputCls} />
              {showCustomerList && filteredCustomers.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button key={c.id} type="button" onClick={() => pickCustomer(c)}
                      className="w-full px-4 py-2.5 text-left text-base hover:bg-red-50 flex gap-3">
                      <span className="font-mono text-gray-400 text-sm">{c.code}</span>
                      <span className="font-semibold">{c.short_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">退回日期</label>
              <input type="date" value={form.return_date} onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">原銷貨單號</label>
              <input value={form.original_order_no || ""} onChange={e => setForm(f => ({ ...f, original_order_no: e.target.value }))} placeholder="對應的銷貨單號" className={inputCls} />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">狀態</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={`${inputCls} bg-white`}>
                {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">稅別</label>
              <select value={form.tax_type} onChange={e => { const t = e.target.value; setForm(f => ({ ...f, tax_type: t, ...calcTotals(items, t) })) }} className={`${inputCls} bg-white`}>
                {TAX_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-base font-semibold text-gray-600 mb-1">退回原因</label>
            <input value={form.reason || ""} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="例：商品瑕疵、規格不符..." className={inputCls} />
          </div>
          {selectedCustomer && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-base font-semibold text-gray-600 mb-1">公司名稱</label>
                <div className="px-4 py-2.5 bg-gray-50 text-lg rounded-xl border border-gray-200 text-gray-700">{selectedCustomer.full_name || "—"}</div>
              </div>
              <div>
                <label className="block text-base font-semibold text-gray-600 mb-1">聯絡電話</label>
                <div className="px-4 py-2.5 bg-gray-50 text-lg rounded-xl border border-gray-200 text-gray-700">{selectedCustomer.phone || selectedCustomer.mobile || "—"}</div>
              </div>
            </div>
          )}
        </section>

        {/* 商品明細 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-700">退回商品明細</h2>
            <button onClick={addItem} className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 text-base font-semibold rounded-lg hover:bg-red-100">
              <Plus size={16} /> 新增行
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead><tr className="bg-gray-50 text-gray-500">
                {["#", "品號", "品名", "單位", "數量", "單價", "折扣%", "金額", "備註", ""].map(h => (
                  <th key={h} className="px-2 py-2 text-left text-sm font-semibold">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-2 py-2 text-gray-400 w-8">{i + 1}</td>
                    <td className="px-2 py-2 w-24">
                      <input value={item.product_code} readOnly onClick={() => setPickerIdx(i)} placeholder="選擇"
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 cursor-pointer" />
                    </td>
                    <td className="px-2 py-2 w-48">
                      <input value={item.product_name} onChange={e => updateItem(i, "product_name", e.target.value)} placeholder="品名"
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg" />
                    </td>
                    <td className="px-2 py-2 w-14 text-center text-gray-500">{item.unit || "-"}</td>
                    <td className="px-2 py-2 w-16"><input type="number" value={item.quantity} onChange={e => updateItem(i, "quantity", e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-center" /></td>
                    <td className="px-2 py-2 w-24"><input type="number" value={item.unit_price} onChange={e => updateItem(i, "unit_price", e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-right" /></td>
                    <td className="px-2 py-2 w-16"><input type="number" value={item.discount} onChange={e => updateItem(i, "discount", e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-center" /></td>
                    <td className="px-2 py-2 w-24 text-right font-semibold">${Number(item.amount || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 w-24"><input value={item.remark || ""} onChange={e => updateItem(i, "remark", e.target.value)} placeholder="備註"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg" /></td>
                    <td className="px-2 py-2 w-8">
                      <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1 text-base">
              <div className="flex justify-between"><span className="text-gray-500">合計金額</span><span>${form.subtotal?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">稅　額</span><span>${form.tax_amount?.toLocaleString()}</span></div>
              <div className="flex justify-between font-bold text-xl border-t border-gray-200 pt-2">
                <span>總金額</span><span className="text-red-600">${form.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 備註 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-4">備註</h2>
          <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3} className={inputCls} placeholder="備註事項..." />
        </section>
      </main>

      <ProductPickerModal open={pickerIdx >= 0} onClose={() => setPickerIdx(-1)}
        onPick={(p) => pickProduct(p, pickerIdx)} products={products} />
    </div>
  )
}
