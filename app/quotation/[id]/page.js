"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Save, FileText, Plus, Trash2, Search } from "lucide-react"

const TAX_TYPES = [
  { value: "taxed", label: "含稅（外加5%）" },
  { value: "included", label: "含稅（內含）" },
  { value: "tax_free", label: "免稅" },
]

const STATUS_OPTS = [
  { value: "draft", label: "草稿" },
  { value: "sent", label: "已送出" },
  { value: "accepted", label: "已接受" },
  { value: "rejected", label: "已拒絕" },
]

const EMPTY_ITEM = { product_code: "", product_name: "", unit: "", quantity: 1, unit_price: 0, discount: 100, amount: 0, notes: "" }

function genNo() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`
  const seq = String(Math.floor(Math.random() * 900) + 100)
  return `QT${ymd}${seq}`
}

export default function QuotationForm() {
  const router = useRouter()
  const { id } = useParams()
  const isNew = id === "new"

  const today = new Date().toISOString().split("T")[0]

  const [form, setForm] = useState({
    quote_no: genNo(), customer_name: "", quote_date: today, valid_until: "",
    status: "draft", tax_type: "taxed", subtotal: 0, tax_amount: 0, total: 0, notes: ""
  })
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [customerQ, setCustomerQ] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [showCustomerList, setShowCustomerList] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(null) // index
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/customers").then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : []))
    fetch("/api/products?limit=500").then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : []))
    if (!isNew) {
      fetch(`/api/quotation/${id}`)
        .then(r => r.json())
        .then(data => {
          const { quotation_items, ...header } = data
          setForm(header)
          setItems(quotation_items && quotation_items.length > 0
            ? quotation_items.sort((a, b) => a.sort_order - b.sort_order)
            : [{ ...EMPTY_ITEM }])
          setLoading(false)
        })
        .catch(() => { setError("找不到此報價單"); setLoading(false) })
    }
  }, [id, isNew])

  const calcTotals = useCallback((itemList, taxType) => {
    const subtotal = itemList.reduce((s, item) => s + (Number(item.amount) || 0), 0)
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
        if (field === "quantity" || field === "unit_price" || field === "discount") {
          next.amount = Math.round(Number(next.quantity) * Number(next.unit_price) * (Number(next.discount) / 100) * 100) / 100
        }
        return next
      })
      const totals = calcTotals(updated, form.tax_type)
      setForm(f => ({ ...f, ...totals }))
      return updated
    })
  }

  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }])
  const removeItem = (i) => {
    setItems(prev => {
      const updated = prev.filter((_, idx) => idx !== i)
      const totals = calcTotals(updated, form.tax_type)
      setForm(f => ({ ...f, ...totals }))
      return updated
    })
  }

  const pickCustomer = (c) => {
    setForm(f => ({ ...f, customer_name: c.short_name, customer_id: c.id }))
    setCustomerQ("")
    setShowCustomerList(false)
  }

  const pickProduct = (product, index) => {
    setItems(prev => {
      const updated = prev.map((item, i) => {
        if (i !== index) return item
        const qty = Number(item.quantity) || 1
        const price = Number(product.retail_price) || 0
        const disc = Number(item.discount) || 100
        return {
          ...item,
          product_id: product.id,
          product_code: product.code,
          product_name: product.name,
          unit: product.unit || "",
          unit_price: price,
          amount: Math.round(qty * price * (disc / 100) * 100) / 100,
        }
      })
      const totals = calcTotals(updated, form.tax_type)
      setForm(f => ({ ...f, ...totals }))
      return updated
    })
    setShowProductPicker(null)
    setProductSearch("")
  }

  const handleTaxChange = (taxType) => {
    const totals = calcTotals(items, taxType)
    setForm(f => ({ ...f, tax_type: taxType, ...totals }))
  }

  const handleSave = async () => {
    if (!form.customer_name.trim()) { setError("請填寫客戶名稱"); return }
    if (!form.quote_no.trim()) { setError("請填寫報價單號"); return }
    const validItems = items.filter(it => it.product_name.trim())
    if (validItems.length === 0) { setError("請至少新增一項商品"); return }
    setError(""); setSaving(true)

    const payload = { ...form, items: validItems }
    delete payload.quotation_items

    const res = await fetch(
      isNew ? "/api/quotation" : `/api/quotation/${id}`,
      { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    )
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || "儲存失敗"); return }
    router.push("/quotation")
  }

  const filteredCustomers = customers.filter(c =>
    c.short_name?.includes(customerQ) || c.code?.includes(customerQ)
  ).slice(0, 8)

  const filteredProducts = products.filter(p =>
    p.name?.includes(productSearch) || p.code?.includes(productSearch)
  ).slice(0, 10)

  const inputCls = "w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400"

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center text-xl text-gray-400">載入中...</div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/quotation" className="text-gray-400 hover:text-gray-600">
              <ChevronLeft size={24} />
            </Link>
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{isNew ? "新增報價單" : "編輯報價單"}</h1>
              <p className="text-base text-gray-400">客戶端 / 報價作業</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/quotation" className="px-5 py-2.5 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50">取消</Link>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white text-lg font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50">
              <Save size={18} />
              {saving ? "儲存中..." : "儲存"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-lg px-5 py-3 rounded-xl">{error}</div>}

        {/* 表頭資訊 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">基本資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1"><span className="text-red-500 mr-1">*</span>報價單號</label>
              <input value={form.quote_no} onChange={e => setForm(f => ({ ...f, quote_no: e.target.value }))} className={inputCls} />
            </div>

            <div className="relative">
              <label className="block text-base font-semibold text-gray-600 mb-1"><span className="text-red-500 mr-1">*</span>客戶名稱</label>
              <div className="relative">
                <input
                  value={form.customer_name}
                  onChange={e => { setForm(f => ({ ...f, customer_name: e.target.value })); setCustomerQ(e.target.value); setShowCustomerList(true) }}
                  onFocus={() => setShowCustomerList(true)}
                  placeholder="輸入客戶名稱或代號搜尋"
                  className={inputCls}
                />
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
            </div>

            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">報價日期</label>
              <input type="date" value={form.quote_date} onChange={e => setForm(f => ({ ...f, quote_date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">有效日期</label>
              <input type="date" value={form.valid_until || ""} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">狀態</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400 bg-white">
                {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-600 mb-1">稅別</label>
              <select value={form.tax_type} onChange={e => handleTaxChange(e.target.value)}
                className="w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400 bg-white">
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
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left w-32">品號</th>
                  <th className="px-3 py-2 text-left min-w-40">品名</th>
                  <th className="px-3 py-2 text-left w-16">單位</th>
                  <th className="px-3 py-2 text-right w-24">數量</th>
                  <th className="px-3 py-2 text-right w-28">單價</th>
                  <th className="px-3 py-2 text-right w-20">折扣%</th>
                  <th className="px-3 py-2 text-right w-28">金額</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-orange-50/30">
                    <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <div className="relative">
                        <input
                          value={item.product_code}
                          onChange={e => updateItem(idx, "product_code", e.target.value)}
                          onFocus={() => { setShowProductPicker(idx); setProductSearch(item.product_code) }}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
                          placeholder="品號"
                        />
                        {showProductPicker === idx && (
                          <div className="absolute z-20 left-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg">
                            <div className="p-2 border-b">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                  value={productSearch}
                                  onChange={e => setProductSearch(e.target.value)}
                                  className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none"
                                  placeholder="搜尋品號或品名..."
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {filteredProducts.map(p => (
                                <button key={p.id} type="button" onClick={() => pickProduct(p, idx)}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 flex gap-2">
                                  <span className="font-mono text-gray-400 w-20 shrink-0">{p.code}</span>
                                  <span className="font-medium flex-1">{p.name}</span>
                                  <span className="text-gray-400">{p.unit}</span>
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
                    <td className="px-3 py-2">
                      <input value={item.product_name} onChange={e => updateItem(idx, "product_name", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400" placeholder="品名" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min={0} value={item.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)}
                        className="w-full px-2 py-1.5 text-right border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min={0} value={item.unit_price} onChange={e => updateItem(idx, "unit_price", e.target.value)}
                        className="w-full px-2 py-1.5 text-right border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min={0} max={100} value={item.discount} onChange={e => updateItem(idx, "discount", e.target.value)}
                        className="w-full px-2 py-1.5 text-right border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400" />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-700">
                      ${Number(item.amount).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 合計 */}
          <div className="mt-5 flex justify-end">
            <div className="w-64 space-y-2 text-base">
              <div className="flex justify-between text-gray-500">
                <span>小計</span>
                <span>${Number(form.subtotal).toLocaleString()}</span>
              </div>
              {form.tax_type !== "tax_free" && (
                <div className="flex justify-between text-gray-500">
                  <span>{form.tax_type === "included" ? "內含稅額" : "營業稅 5%"}</span>
                  <span>${Number(form.tax_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-gray-800 pt-2 border-t border-gray-200">
                <span>總計</span>
                <span className="text-orange-600">${Number(form.total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 備註 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-4 pb-3 border-b border-gray-100">備註</h2>
          <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
            className="w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400 resize-none" />
        </section>

        <div className="flex justify-end gap-3 pb-8">
          <Link href="/quotation" className="px-8 py-3 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50">取消</Link>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-orange-500 text-white text-lg font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50">
            <Save size={18} />
            {saving ? "儲存中..." : "儲存"}
          </button>
        </div>
      </main>

      {/* 點擊空白關閉下拉 */}
      {(showCustomerList || showProductPicker !== null) && (
        <div className="fixed inset-0 z-10" onClick={() => { setShowCustomerList(false); setShowProductPicker(null) }} />
      )}
    </div>
  )
}
