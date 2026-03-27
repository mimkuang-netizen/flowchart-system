"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Save, PackageX, Plus, Trash2, Search } from "lucide-react"

const EMPTY_ITEM = { product_code: "", product_name: "", unit: "", quantity: 1, unit_price: 0, amount: 0, notes: "" }

function genNo() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`
  return `PR${ymd}${String(Math.floor(Math.random() * 900) + 100)}`
}

export default function PurchaseReturnForm() {
  const router = useRouter()
  const { id } = useParams()
  const isNew = id === "new"
  const today = new Date().toISOString().split("T")[0]

  const [form, setForm] = useState({ return_no: genNo(), vendor_name: "", return_date: today, original_receipt_no: "", reason: "", status: "draft", tax_type: "taxed", subtotal: 0, tax_amount: 0, total: 0, notes: "" })
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [vendors, setVendors] = useState([])
  const [products, setProducts] = useState([])
  const [vendorQ, setVendorQ] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [showVendorList, setShowVendorList] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/vendors").then(r => r.json()).then(d => setVendors(Array.isArray(d) ? d : []))
    fetch("/api/products?limit=500").then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : []))
    if (!isNew) {
      fetch(`/api/purchase-return/${id}`).then(r => r.json()).then(data => {
        const { purchase_return_items, ...header } = data
        setForm(header)
        setItems(purchase_return_items?.length > 0 ? purchase_return_items.sort((a, b) => a.sort_order - b.sort_order) : [{ ...EMPTY_ITEM }])
        setLoading(false)
      }).catch(() => { setError("找不到此退出單"); setLoading(false) })
    }
  }, [id, isNew])

  const calcTotals = useCallback((itemList, taxType) => {
    const subtotal = itemList.reduce((s, it) => s + (Number(it.amount) || 0), 0)
    const tax = taxType === "taxed" ? Math.round(subtotal * 0.05) : 0
    return { subtotal, tax_amount: tax, total: taxType === "included" ? subtotal : subtotal + tax }
  }, [])

  const updateItem = (index, field, value) => {
    setItems(prev => {
      const updated = prev.map((item, i) => {
        if (i !== index) return item
        const next = { ...item, [field]: value }
        if (["quantity", "unit_price"].includes(field)) next.amount = Math.round(Number(next.quantity) * Number(next.unit_price) * 100) / 100
        return next
      })
      setForm(f => ({ ...f, ...calcTotals(updated, f.tax_type) }))
      return updated
    })
  }

  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }])
  const removeItem = (i) => setItems(prev => { const u = prev.filter((_, idx) => idx !== i); setForm(f => ({ ...f, ...calcTotals(u, f.tax_type) })); return u })
  const pickVendor = (v) => { setForm(f => ({ ...f, vendor_name: v.short_name, vendor_id: v.id })); setShowVendorList(false) }
  const pickProduct = (product, index) => {
    setItems(prev => {
      const updated = prev.map((item, i) => {
        if (i !== index) return item
        const qty = Number(item.quantity) || 1; const price = Number(product.cost_price) || Number(product.retail_price) || 0
        return { ...item, product_id: product.id, product_code: product.code, product_name: product.name, unit: product.unit || "", unit_price: price, amount: qty * price }
      })
      setForm(f => ({ ...f, ...calcTotals(updated, f.tax_type) }))
      return updated
    })
    setShowProductPicker(null)
  }

  const handleSave = async () => {
    if (!form.vendor_name.trim()) { setError("請填寫廠商名稱"); return }
    const validItems = items.filter(it => it.product_name.trim())
    if (validItems.length === 0) { setError("請至少新增一項商品"); return }
    setError(""); setSaving(true)
    const payload = { ...form, items: validItems }; delete payload.purchase_return_items
    const res = await fetch(isNew ? "/api/purchase-return" : `/api/purchase-return/${id}`,
      { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const data = await res.json(); setSaving(false)
    if (!res.ok) { setError(data.error || "儲存失敗"); return }
    router.push("/purchase-return")
  }

  const filteredVendors = vendors.filter(v => v.short_name?.includes(vendorQ) || v.code?.includes(vendorQ)).slice(0, 8)
  const filteredProducts = products.filter(p => p.name?.includes(productSearch) || p.code?.includes(productSearch)).slice(0, 10)
  const inputCls = "w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-green-500"

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center text-xl text-gray-400">載入中...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/purchase-return" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center"><PackageX className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{isNew ? "新增進貨退出單" : "編輯進貨退出單"}</h1>
              <p className="text-base text-gray-400">廠商端 / 退貨作業</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/purchase-return" className="px-5 py-2.5 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50">取消</Link>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50">
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
            <div><label className="block text-base font-semibold text-gray-600 mb-1">退出單號</label>
              <input value={form.return_no} onChange={e => setForm(f => ({ ...f, return_no: e.target.value }))} className={inputCls} /></div>
            <div className="relative"><label className="block text-base font-semibold text-gray-600 mb-1"><span className="text-red-500 mr-1">*</span>廠商名稱</label>
              <input value={form.vendor_name}
                onChange={e => { setForm(f => ({ ...f, vendor_name: e.target.value })); setVendorQ(e.target.value); setShowVendorList(true) }}
                onFocus={() => setShowVendorList(true)} className={inputCls} placeholder="輸入廠商名稱" />
              {showVendorList && filteredVendors.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredVendors.map(v => (
                    <button key={v.id} type="button" onClick={() => pickVendor(v)} className="w-full px-4 py-2.5 text-left text-base hover:bg-green-50 flex gap-3">
                      <span className="font-mono text-gray-400 text-sm">{v.code}</span><span className="font-semibold">{v.short_name}</span>
                    </button>
                  ))}
                </div>
              )}</div>
            <div><label className="block text-base font-semibold text-gray-600 mb-1">退出日期</label>
              <input type="date" value={form.return_date} onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))} className={inputCls} /></div>
            <div><label className="block text-base font-semibold text-gray-600 mb-1">原進貨單號</label>
              <input value={form.original_receipt_no || ""} onChange={e => setForm(f => ({ ...f, original_receipt_no: e.target.value }))} placeholder="選填" className={inputCls} /></div>
            <div className="md:col-span-2"><label className="block text-base font-semibold text-gray-600 mb-1">退出原因</label>
              <input value={form.reason || ""} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className={inputCls} /></div>
          </div>
        </section>
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-700">退出商品明細</h2>
            <button onClick={addItem} className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 text-base font-semibold rounded-lg hover:bg-green-100"><Plus size={16} /> 新增行</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead><tr className="bg-gray-50 text-gray-500">
                {["#", "品號", "品名", "單位", "數量", "單價", "金額", ""].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2 w-32">
                      <div className="relative">
                        <input value={item.product_code} onChange={e => updateItem(idx, "product_code", e.target.value)}
                          onFocus={() => { setShowProductPicker(idx); setProductSearch(item.product_code) }}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500" placeholder="品號" />
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
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 flex gap-2">
                                  <span className="font-mono text-gray-400 w-20">{p.code}</span><span className="flex-1">{p.name}</span>
                                </button>
                              ))}
                            </div>
                            <button onClick={() => setShowProductPicker(null)} className="w-full p-2 text-sm text-gray-400 border-t">關閉</button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2"><input value={item.product_name} onChange={e => updateItem(idx, "product_name", e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg" placeholder="品名" /></td>
                    <td className="px-3 py-2 w-16"><input value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg" /></td>
                    <td className="px-3 py-2 w-24"><input type="number" min={0} value={item.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)} className="w-full px-2 py-1.5 text-right border border-gray-200 rounded-lg" /></td>
                    <td className="px-3 py-2 w-28"><input type="number" min={0} value={item.unit_price} onChange={e => updateItem(idx, "unit_price", e.target.value)} className="w-full px-2 py-1.5 text-right border border-gray-200 rounded-lg" /></td>
                    <td className="px-3 py-2 w-28 text-right font-semibold">${Number(item.amount).toLocaleString()}</td>
                    <td className="px-3 py-2"><button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="w-56 space-y-1.5 text-base">
              <div className="flex justify-between text-gray-500"><span>小計</span><span>${Number(form.subtotal).toLocaleString()}</span></div>
              <div className="flex justify-between text-gray-500"><span>營業稅 5%</span><span>${Number(form.tax_amount).toLocaleString()}</span></div>
              <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-200"><span>總計</span><span className="text-green-700">${Number(form.total).toLocaleString()}</span></div>
            </div>
          </div>
        </section>
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-4 pb-3 border-b border-gray-100">備註</h2>
          <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
            className="w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-green-500 resize-none" />
        </section>
        <div className="flex justify-end gap-3 pb-8">
          <Link href="/purchase-return" className="px-8 py-3 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50">取消</Link>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50">
            <Save size={18} />{saving ? "儲存中..." : "儲存"}
          </button>
        </div>
      </main>
      {(showVendorList || showProductPicker !== null) && <div className="fixed inset-0 z-10" onClick={() => { setShowVendorList(false); setShowProductPicker(null) }} />}
    </div>
  )
}
