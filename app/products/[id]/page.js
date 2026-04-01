"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Save, Package, Plus, Trash2, X } from "lucide-react"

const UNITS = ["張", "才", "箱", "個", "尺", "瓶", "組", "卷", "片", "包", "隻", "KG", "公分", "次", "趟", "只"]
const CATEGORIES = ["加工零件","鏡子原料","紙器包裝","畫框材料","貨車保養零件","其他服務","經銷品項","健鑫代工","一般明鏡","廠房設備","除霧材料(白板&防霧片)","畫框鏡","變壓器","燈光鏡","除霧鏡","鋁框鏡","衛浴配件","不鏽鋼框鏡","【合新機】機械零件","營業器具","PVC發泡板材"]

const EMPTY = {
  code: "", name: "", unit: "", category: "",
  retail_price: 0, discount_price: 0, cost_price: 0,
  safety_stock: 0, stock_qty: 0,
  barcode: "", net_weight: 0, supplier: "", active: true,
  price_history: [],
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-base font-semibold text-gray-600 mb-1">
        {required && <span className="text-red-500 mr-1">*</span>}{label}
      </label>
      {children}
    </div>
  )
}

const inputClass = "w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-blue-400"

function getStatus(record) {
  const today = new Date().toISOString().slice(0, 10)
  if (record.applied) {
    // Check if there's a newer applied record — if so this is expired
    return "已過期"
  }
  if (record.effective_date <= today) {
    return "待更新"
  }
  return "待生效"
}

function getStatusBadge(record, allRecords) {
  const today = new Date().toISOString().slice(0, 10)
  if (record.applied) {
    // If this is the most recent applied record, it's "已生效"; otherwise "已過期"
    const appliedRecords = allRecords.filter(r => r.applied)
    const sortedApplied = appliedRecords.sort((a, b) => b.effective_date.localeCompare(a.effective_date))
    const isLatestApplied = sortedApplied[0] && sortedApplied[0].created_at === record.created_at
    if (isLatestApplied) {
      return <span className="inline-block px-2.5 py-0.5 text-sm font-medium rounded-full bg-green-100 text-green-700">已生效</span>
    }
    return <span className="inline-block px-2.5 py-0.5 text-sm font-medium rounded-full bg-gray-100 text-gray-500">已過期</span>
  }
  if (record.effective_date <= today) {
    return <span className="inline-block px-2.5 py-0.5 text-sm font-medium rounded-full bg-orange-100 text-orange-700">待更新</span>
  }
  return <span className="inline-block px-2.5 py-0.5 text-sm font-medium rounded-full bg-blue-100 text-blue-700">待生效</span>
}

export default function ProductForm() {
  const router = useRouter()
  const { id } = useParams()
  const isNew = id === "new"

  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [newRecord, setNewRecord] = useState({ effective_date: "", new_price: "", note: "" })
  const [priceUpdateBanners, setPriceUpdateBanners] = useState([])

  const applyPendingPriceHistory = useCallback(async (productData) => {
    const today = new Date().toISOString().slice(0, 10)
    let history = []
    try {
      history = typeof productData.price_history === "string"
        ? JSON.parse(productData.price_history)
        : (productData.price_history || [])
    } catch { history = [] }

    const pending = history.filter(r => !r.applied && r.effective_date <= today)
    if (pending.length === 0) return productData

    // Sort by effective_date so we apply in order, last one wins for cost_price
    pending.sort((a, b) => a.effective_date.localeCompare(b.effective_date))

    const banners = []
    let latestPrice = productData.cost_price

    const updatedHistory = history.map(r => {
      if (!r.applied && r.effective_date <= today) {
        banners.push({
          date: r.effective_date,
          price: r.new_price,
          note: r.note,
        })
        latestPrice = r.new_price
        return { ...r, applied: true }
      }
      return r
    })

    setPriceUpdateBanners(banners)

    // Save to API
    const payload = {
      cost_price: latestPrice,
      price_history: JSON.stringify(updatedHistory),
    }
    await fetch(`/api/products/${productData.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    return {
      ...productData,
      cost_price: latestPrice,
      price_history: updatedHistory,
    }
  }, [])

  useEffect(() => {
    if (!isNew) {
      fetch(`/api/products/${id}`)
        .then(r => r.json())
        .then(async data => {
          const updated = await applyPendingPriceHistory(data)
          let ph = updated.price_history || []
          if (typeof ph === "string") { try { ph = JSON.parse(ph) } catch { ph = [] } }
          setForm({ ...EMPTY, ...updated, price_history: ph })
          setLoading(false)
        })
        .catch(() => { setError("找不到此商品"); setLoading(false) })
    }
  }, [id, isNew, applyPendingPriceHistory])

  const set = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }))
  const setNum = f => e => setForm(prev => ({ ...prev, [f]: Number(e.target.value) || 0 }))

  const handleSave = async () => {
    if (!form.code.trim()) { setError("請填寫品號"); return }
    if (!form.name.trim()) { setError("請填寫品名"); return }
    setError(""); setSaving(true)
    const payload = { ...form }
    delete payload.id; delete payload.created_at
    // Serialize price_history as JSON string for storage
    payload.price_history = JSON.stringify(payload.price_history || [])
    const res = await fetch(isNew ? "/api/products" : `/api/products/${id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || "儲存失敗"); return }
    router.push("/products")
  }

  const handleAddRecord = () => {
    if (!newRecord.effective_date || !newRecord.new_price) return
    const record = {
      effective_date: newRecord.effective_date,
      new_price: Number(newRecord.new_price),
      note: newRecord.note || "",
      applied: false,
      created_at: new Date().toISOString(),
    }
    setForm(prev => ({
      ...prev,
      price_history: [...(prev.price_history || []), record],
    }))
    setNewRecord({ effective_date: "", new_price: "", note: "" })
    setShowModal(false)
  }

  const handleDeleteRecord = (index) => {
    setForm(prev => ({
      ...prev,
      price_history: prev.price_history.filter((_, i) => i !== index),
    }))
  }

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center text-xl text-gray-400">載入中...</div>

  const priceHistory = form.price_history || []
  const sortedHistory = [...priceHistory].sort((a, b) => b.effective_date.localeCompare(a.effective_date))

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/products" className="text-gray-400 hover:text-gray-600 transition-colors"><ChevronLeft size={24} /></Link>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{isNew ? "新增商品" : "編輯商品"}</h1>
              <p className="text-base text-gray-400">基本資料 / 商品資料</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/products" className="px-5 py-2.5 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50">取消</Link>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
              <Save size={18} />{saving ? "儲存中..." : "儲存"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-lg px-5 py-3 rounded-xl">{error}</div>}

        {/* Price auto-update banners */}
        {priceUpdateBanners.map((b, i) => (
          <div key={i} className="bg-amber-50 border border-amber-300 text-amber-800 text-lg px-5 py-3 rounded-xl flex items-start gap-2">
            <span className="text-xl mt-0.5">&#9888;&#65039;</span>
            <span>進價已於 {b.date.replace(/-/g, "/")} 自動更新為 ${b.price.toLocaleString()}{b.note ? `（原因：${b.note}）` : ""}</span>
          </div>
        ))}

        {/* 基本資料 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">基本資料</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="品號" required>
              <input value={form.code} onChange={set("code")} className={inputClass} />
            </Field>
            <div className="md:col-span-2">
              <Field label="品名" required>
                <input value={form.name} onChange={set("name")} className={inputClass} />
              </Field>
            </div>
            <Field label="單位">
              <select value={form.unit} onChange={set("unit")} className={inputClass}>
                <option value="">請選擇</option>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="商品分類">
              <select value={form.category} onChange={set("category")} className={inputClass}>
                <option value="">請選擇</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="主供應商">
              <input value={form.supplier || ""} onChange={set("supplier")} className={inputClass} />
            </Field>
            <Field label="條碼編號">
              <input value={form.barcode || ""} onChange={set("barcode")} className={inputClass} />
            </Field>
            <Field label="狀態">
              <select value={form.active ? "true" : "false"}
                onChange={e => setForm(f => ({ ...f, active: e.target.value === "true" }))}
                className={inputClass}>
                <option value="true">啟用</option>
                <option value="false">停用</option>
              </select>
            </Field>
          </div>
        </section>

        {/* 價格設定 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">價格設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="零售價">
              <input type="number" step="0.01" value={form.retail_price} onChange={setNum("retail_price")} className={inputClass} />
            </Field>
            <Field label="優惠價">
              <input type="number" step="0.01" value={form.discount_price} onChange={setNum("discount_price")} className={inputClass} />
            </Field>
            <Field label="標準進價">
              <input type="number" step="0.01" value={form.cost_price} onChange={setNum("cost_price")} className={inputClass} />
            </Field>
          </div>
        </section>

        {/* 庫存設定 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">庫存設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="安全存量">
              <input type="number" step="0.01" value={form.safety_stock} onChange={setNum("safety_stock")} className={inputClass} />
            </Field>
            <Field label="現有庫存量">
              <input type="number" step="0.01" value={form.stock_qty} onChange={setNum("stock_qty")} className={inputClass} />
            </Field>
          </div>
        </section>

        {/* 進價歷史紀錄 */}
        {!isNew && (
          <section className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-700">&#128202; 進價歷史紀錄</h2>
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-base font-semibold rounded-xl hover:bg-green-700 transition-colors">
                <Plus size={16} /> 新增紀錄
              </button>
            </div>

            {sortedHistory.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-lg">尚無進價歷史紀錄</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">生效日期</th>
                      <th className="pb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">調整後進價</th>
                      <th className="pb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">備註</th>
                      <th className="pb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">狀態</th>
                      <th className="pb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedHistory.map((record, idx) => {
                      const originalIndex = priceHistory.indexOf(record)
                      return (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 text-base text-gray-700">{record.effective_date?.replace(/-/g, "/")}</td>
                          <td className="py-3 text-base text-gray-700 font-medium">${Number(record.new_price).toLocaleString()}</td>
                          <td className="py-3 text-base text-gray-500">{record.note || "-"}</td>
                          <td className="py-3">{getStatusBadge(record, priceHistory)}</td>
                          <td className="py-3 text-right">
                            {!record.applied && (
                              <button onClick={() => handleDeleteRecord(originalIndex)}
                                className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50"
                                title="刪除">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <div className="flex justify-end gap-3 pb-8">
          <Link href="/products" className="px-8 py-3 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50">取消</Link>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
            <Save size={18} />{saving ? "儲存中..." : "儲存"}
          </button>
        </div>
      </main>

      {/* Modal: 新增進價紀錄 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-800">新增進價紀錄</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <Field label="生效日期" required>
                <input type="date" value={newRecord.effective_date}
                  onChange={e => setNewRecord(prev => ({ ...prev, effective_date: e.target.value }))}
                  className={inputClass} />
              </Field>
              <Field label="調整後進價" required>
                <input type="number" step="0.01" placeholder="請輸入新進價"
                  value={newRecord.new_price}
                  onChange={e => setNewRecord(prev => ({ ...prev, new_price: e.target.value }))}
                  className={inputClass} />
              </Field>
              <Field label="備註">
                <input type="text" placeholder="例如：廠商漲價通知"
                  value={newRecord.note}
                  onChange={e => setNewRecord(prev => ({ ...prev, note: e.target.value }))}
                  className={inputClass} />
              </Field>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="px-5 py-2.5 border-2 border-gray-200 text-base rounded-xl hover:bg-gray-50">
                取消
              </button>
              <button onClick={handleAddRecord}
                disabled={!newRecord.effective_date || !newRecord.new_price}
                className="px-5 py-2.5 bg-blue-600 text-white text-base font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                確認新增
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
