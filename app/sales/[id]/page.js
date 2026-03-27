"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Save, ShoppingCart, Plus, Trash2, Search, Printer, FileText, ExternalLink, Loader2 } from "lucide-react"

const TAX_TYPES = [
  { value: "taxed", label: "含稅（外加5%）" },
  { value: "included", label: "含稅（內含）" },
  { value: "tax_free", label: "免稅" },
]
const STATUS_OPTS = [
  { value: "draft", label: "草稿" },
  { value: "confirmed", label: "已確認" },
  { value: "shipped", label: "已出貨" },
  { value: "completed", label: "已完成" },
]
const EMPTY_ITEM = { product_code: "", product_name: "", unit: "", quantity: 1, unit_price: 0, discount: 100, amount: 0, notes: "" }

function genNo() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`
  return `SO${ymd}${String(Math.floor(Math.random() * 900) + 100)}`
}

export default function SalesForm() {
  const router = useRouter()
  const { id } = useParams()
  const isNew = id === "new"
  const today = new Date().toISOString().split("T")[0]

  const [form, setForm] = useState({
    order_no: genNo(), customer_name: "", order_date: today, delivery_date: "",
    status: "draft", tax_type: "taxed", subtotal: 0, tax_amount: 0, total: 0, quote_no: "", notes: "",
    invoice_type: "", invoice_no: "", invoice_date: "", invoice_url: "",
  })
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [customerQ, setCustomerQ] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [showCustomerList, setShowCustomerList] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/customers").then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : []))
    fetch("/api/products?limit=500").then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : []))
    if (!isNew) {
      fetch(`/api/sales/${id}`)
        .then(r => r.json())
        .then(data => {
          const { sales_order_items, ...header } = data
          setForm(header)
          setItems(sales_order_items?.length > 0 ? sales_order_items.sort((a, b) => a.sort_order - b.sort_order) : [{ ...EMPTY_ITEM }])
          setLoading(false)
        })
        .catch(() => { setError("找不到此銷貨單"); setLoading(false) })
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
        const next = { ...item, [field]: value }
        if (["quantity", "unit_price", "discount"].includes(field)) {
          next.amount = Math.round(Number(next.quantity) * Number(next.unit_price) * (Number(next.discount) / 100) * 100) / 100
        }
        return next
      })
      setForm(f => ({ ...f, ...calcTotals(updated, f.tax_type) }))
      return updated
    })
  }

  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }])
  const removeItem = (i) => setItems(prev => { const u = prev.filter((_, idx) => idx !== i); setForm(f => ({ ...f, ...calcTotals(u, f.tax_type) })); return u })

  const pickCustomer = (c) => { setForm(f => ({ ...f, customer_name: c.short_name, customer_id: c.id })); setShowCustomerList(false) }
  const pickProduct = (product, index) => {
    setItems(prev => {
      const updated = prev.map((item, i) => {
        if (i !== index) return item
        const qty = Number(item.quantity) || 1; const price = Number(product.retail_price) || 0; const disc = Number(item.discount) || 100
        return { ...item, product_id: product.id, product_code: product.code, product_name: product.name, unit: product.unit || "", unit_price: price, amount: Math.round(qty * price * (disc / 100) * 100) / 100 }
      })
      setForm(f => ({ ...f, ...calcTotals(updated, f.tax_type) }))
      return updated
    })
    setShowProductPicker(null); setProductSearch("")
  }

  const handleSave = async () => {
    if (!form.customer_name.trim()) { setError("請填寫客戶名稱"); return }
    const validItems = items.filter(it => it.product_name.trim())
    if (validItems.length === 0) { setError("請至少新增一項商品"); return }
    setError(""); setSaving(true)
    const payload = { ...form, items: validItems }; delete payload.sales_order_items
    const res = await fetch(isNew ? "/api/sales" : `/api/sales/${id}`,
      { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const data = await res.json(); setSaving(false)
    if (!res.ok) { setError(data.error || "儲存失敗"); return }
    router.push("/sales")
  }

  const filteredCustomers = customers.filter(c => c.short_name?.includes(customerQ) || c.code?.includes(customerQ)).slice(0, 8)
  const filteredProducts = products.filter(p => p.name?.includes(productSearch) || p.code?.includes(productSearch)).slice(0, 10)
  const inputCls = "w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400"

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center text-xl text-gray-400">載入中...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/sales" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{isNew ? "新增銷貨單" : "編輯銷貨單"}</h1>
              <p className="text-base text-gray-400">客戶端 / 銷貨作業</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/sales" className="px-5 py-2.5 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50">取消</Link>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white text-lg font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50">
              <Save size={18} />{saving ? "儲存中..." : "儲存"}
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
              <label className="block text-base font-semibold text-gray-600 mb-1"><span className="text-red-500 mr-1">*</span>銷貨單號</label>
              <input value={form.order_no} onChange={e => setForm(f => ({ ...f, order_no: e.target.value }))} className={inputCls} />
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
                      className="w-full px-4 py-2.5 text-left text-base hover:bg-orange-50 flex gap-3">
                      <span className="font-mono text-gray-400 text-sm">{c.code}</span>
                      <span className="font-semibold">{c.short_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">銷貨日期</label>
              <input type="date" value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">出貨日期</label>
              <input type="date" value={form.delivery_date || ""} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">對應報價單號</label>
              <input value={form.quote_no || ""} onChange={e => setForm(f => ({ ...f, quote_no: e.target.value }))} placeholder="選填" className={inputCls} />
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
        </section>

        {/* 商品明細 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-700">商品明細</h2>
            <button onClick={addItem} className="flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-600 text-base font-semibold rounded-lg hover:bg-orange-100">
              <Plus size={16} /> 新增行
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  {["#", "品號", "品名", "單位", "數量", "單價", "折扣%", "金額", ""].map(h => (
                    <th key={h} className="px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-orange-50/30">
                    <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2 w-32">
                      <div className="relative">
                        <input value={item.product_code}
                          onChange={e => updateItem(idx, "product_code", e.target.value)}
                          onFocus={() => { setShowProductPicker(idx); setProductSearch(item.product_code) }}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400" placeholder="品號" />
                        {showProductPicker === idx && (
                          <div className="absolute z-20 left-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg">
                            <div className="p-2 border-b">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                  className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none" placeholder="搜尋品號或品名..." autoFocus />
                              </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {filteredProducts.map(p => (
                                <button key={p.id} type="button" onClick={() => pickProduct(p, idx)}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 flex gap-2">
                                  <span className="font-mono text-gray-400 w-20 shrink-0">{p.code}</span>
                                  <span className="font-medium flex-1">{p.name}</span>
                                  <span className="text-orange-600 font-semibold">${p.retail_price}</span>
                                </button>
                              ))}
                              {filteredProducts.length === 0 && <p className="px-4 py-3 text-gray-400 text-sm">無符合商品</p>}
                            </div>
                            <button onClick={() => setShowProductPicker(null)} className="w-full p-2 text-sm text-gray-400 hover:bg-gray-50 border-t">關閉</button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 min-w-40">
                      <input value={item.product_name} onChange={e => updateItem(idx, "product_name", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400" placeholder="品名" />
                    </td>
                    <td className="px-3 py-2 w-16">
                      <input value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none" />
                    </td>
                    <td className="px-3 py-2 w-24">
                      <input type="number" min={0} value={item.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)}
                        className="w-full px-2 py-1.5 text-right border border-gray-200 rounded-lg focus:outline-none" />
                    </td>
                    <td className="px-3 py-2 w-28">
                      <input type="number" min={0} value={item.unit_price} onChange={e => updateItem(idx, "unit_price", e.target.value)}
                        className="w-full px-2 py-1.5 text-right border border-gray-200 rounded-lg focus:outline-none" />
                    </td>
                    <td className="px-3 py-2 w-20">
                      <input type="number" min={0} max={100} value={item.discount} onChange={e => updateItem(idx, "discount", e.target.value)}
                        className="w-full px-2 py-1.5 text-right border border-gray-200 rounded-lg focus:outline-none" />
                    </td>
                    <td className="px-3 py-2 w-28 text-right font-semibold">${Number(item.amount).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-end">
            <div className="w-64 space-y-2 text-base">
              <div className="flex justify-between text-gray-500"><span>小計</span><span>${Number(form.subtotal).toLocaleString()}</span></div>
              {form.tax_type !== "tax_free" && <div className="flex justify-between text-gray-500"><span>{form.tax_type === "included" ? "內含稅額" : "營業稅 5%"}</span><span>${Number(form.tax_amount).toLocaleString()}</span></div>}
              <div className="flex justify-between text-xl font-bold text-gray-800 pt-2 border-t border-gray-200">
                <span>總計</span><span className="text-orange-600">${Number(form.total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-4 pb-3 border-b border-gray-100">備註</h2>
          <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
            className="w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400 resize-none" />
        </section>

        {/* 發票資訊 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
            <FileText size={20} className="text-blue-500" /> 發票資訊
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div className="md:col-span-2">
              <label className="block text-base font-semibold text-gray-600 mb-1">電子發票連結</label>
              <div className="flex gap-2">
                <input value={form.invoice_url || ""} onChange={e => setForm(f => ({ ...f, invoice_url: e.target.value }))}
                  placeholder="貼上電子發票連結..." className={inputCls + " flex-1"} />
                <button onClick={async () => {
                  if (!form.invoice_url?.trim()) return
                  setInvoiceLoading(true)
                  try {
                    const res = await fetch(`/api/invoice-lookup?url=${encodeURIComponent(form.invoice_url.trim())}`)
                    const data = await res.json()
                    if (data.invoice_no || data.invoice_date) {
                      setForm(f => ({
                        ...f,
                        invoice_no: data.invoice_no || f.invoice_no,
                        invoice_date: data.invoice_date || f.invoice_date,
                        invoice_type: data.invoice_type || f.invoice_type || "電子發票",
                      }))
                    }
                  } catch {}
                  setInvoiceLoading(false)
                }} disabled={invoiceLoading} className="px-4 py-2 bg-blue-500 text-white text-base font-semibold rounded-xl hover:bg-blue-600 disabled:opacity-50 whitespace-nowrap">
                  {invoiceLoading ? <Loader2 size={18} className="animate-spin" /> : "讀取發票"}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">發票聯式</label>
              <select value={form.invoice_type || ""} onChange={e => setForm(f => ({ ...f, invoice_type: e.target.value }))} className={`${inputCls} bg-white`}>
                <option value="">未開立</option>
                <option value="電子發票">電子發票</option>
                <option value="二聯式">二聯式</option>
                <option value="三聯式">三聯式</option>
                <option value="不開">不開</option>
              </select>
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">發票號碼</label>
              <input value={form.invoice_no || ""} onChange={e => setForm(f => ({ ...f, invoice_no: e.target.value }))} placeholder="例：ZJ86347899" className={inputCls} />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">發票日期</label>
              <input type="date" value={form.invoice_date || ""} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} className={inputCls} />
            </div>
            {form.invoice_url && (
              <div className="flex items-end">
                <a href={form.invoice_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 text-base font-semibold">
                  <ExternalLink size={16} /> 開啟發票連結
                </a>
              </div>
            )}
          </div>
        </section>

        <div className="flex justify-between pb-8">
          {!isNew && (
            <Link href={`/sales/${id}/print`} className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white text-lg font-semibold rounded-xl hover:bg-blue-600">
              <Printer size={18} /> 列印銷貨單
            </Link>
          )}
          <div className="flex gap-3 ml-auto">
            <Link href="/sales" className="px-8 py-3 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50">取消</Link>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-orange-500 text-white text-lg font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50">
              <Save size={18} />{saving ? "儲存中..." : "儲存"}
            </button>
          </div>
        </div>
      </main>
      {(showCustomerList || showProductPicker !== null) && (
        <div className="fixed inset-0 z-10" onClick={() => { setShowCustomerList(false); setShowProductPicker(null) }} />
      )}
    </div>
  )
}
