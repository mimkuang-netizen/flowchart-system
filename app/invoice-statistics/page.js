"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Plus, Pencil, Trash2, Receipt, ChevronLeft, ChevronRight } from "lucide-react"

const TYPE_COLORS = {
  "進貨": "bg-red-100 text-red-700",
  "出貨": "bg-green-100 text-green-700",
}

const PERIODS = ["1-2月", "3-4月", "5-6月", "7-8月", "9-10月", "11-12月"]

export default function InvoiceStatisticsPage() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterPeriod, setFilterPeriod] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState(null)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState("invoice_date")
  const [sortDir, setSortDir] = useState("desc")
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ company_name: "", type: "進貨", invoice_period: "1-2月", invoice_date: "", pretax_amount: "", tax: "", total_amount: "", notes: "" })
  const PAGE_SIZE = 20

  const SortTh = ({ field, children, className = "" }) => (
    <th className={`px-4 py-3 text-left text-base font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none ${className}`}
      onClick={() => { if (sortKey === field) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(field); setSortDir("asc") } }}>
      <span className="flex items-center gap-1">{children} {sortKey === field ? (sortDir === "asc" ? "↑" : "↓") : ""}</span>
    </th>
  )

  const sorted = [...items].sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey]
    if (va == null) va = ""; if (vb == null) vb = ""
    if (typeof va === "string") va = va.toLowerCase()
    if (typeof vb === "string") vb = vb.toLowerCase()
    if (va < vb) return sortDir === "asc" ? -1 : 1
    if (va > vb) return sortDir === "asc" ? 1 : -1
    return 0
  })

  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (filterType) params.set("type", filterType)
    if (filterPeriod) params.set("period", filterPeriod)
    const res = await fetch(`/api/invoice-statistics?${params}`)
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { setPage(1); fetchData() }, [q, filterType, filterPeriod])

  const handleDelete = async () => {
    await fetch(`/api/invoice-statistics/${deleteId}`, { method: "DELETE" })
    setDeleteId(null)
    fetchData()
  }

  const openNew = () => {
    setEditItem(null)
    setForm({ company_name: "", type: "進貨", invoice_period: "1-2月", invoice_date: "", pretax_amount: "", tax: "", total_amount: "", notes: "" })
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      company_name: item.company_name || "",
      type: item.type || "進貨",
      invoice_period: item.invoice_period || "",
      invoice_date: item.invoice_date || "",
      pretax_amount: item.pretax_amount || "",
      tax: item.tax || "",
      total_amount: item.total_amount || "",
      notes: item.notes || "",
    })
    setShowForm(true)
  }

  const handlePretaxChange = (val) => {
    const pretax = Number(val) || 0
    const tax = Math.round(pretax * 0.05)
    setForm(f => ({ ...f, pretax_amount: val, tax: tax.toString(), total_amount: (pretax + tax).toString() }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      pretax_amount: Number(form.pretax_amount) || 0,
      tax: Number(form.tax) || 0,
      total_amount: Number(form.total_amount) || 0,
    }
    if (editItem) {
      await fetch(`/api/invoice-statistics/${editItem.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    } else {
      await fetch("/api/invoice-statistics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    }
    setShowForm(false)
    fetchData()
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("zh-TW") : "—"
  const formatMoney = (n) => n != null ? `$${Number(n).toLocaleString()}` : "—"

  // 統計
  const purchaseTotal = items.filter(i => i.type === "進貨").reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const salesTotal = items.filter(i => i.type === "出貨").reduce((s, i) => s + Number(i.total_amount || 0), 0)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">進出貨發票統計</h1>
              <p className="text-base text-gray-400">商品與財務端 / 發票統計明細</p>
            </div>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white text-lg font-semibold rounded-xl hover:bg-indigo-600">
            <Plus size={20} /> 新增發票
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* 統計卡 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-400">總進貨金額（含稅）</p>
            <p className="text-2xl font-bold text-red-600">{formatMoney(purchaseTotal)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-400">總出貨金額（含稅）</p>
            <p className="text-2xl font-bold text-green-600">{formatMoney(salesTotal)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-400">筆數</p>
            <p className="text-2xl font-bold text-gray-700">{items.length} 筆</p>
          </div>
        </div>

        {/* 搜尋列 */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋公司名稱..."
              className="w-full pl-10 pr-4 py-2.5 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-indigo-400 bg-white" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-4 py-2.5 text-lg border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-indigo-400">
            <option value="">全部類型</option>
            <option value="進貨">進貨</option>
            <option value="出貨">出貨</option>
          </select>
          <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}
            className="px-4 py-2.5 text-lg border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-indigo-400">
            <option value="">全部期間</option>
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* 表格 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-base">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <SortTh field="company_name">公司名稱</SortTh>
                <SortTh field="type">進/出貨</SortTh>
                <SortTh field="invoice_period">發票月份</SortTh>
                <SortTh field="invoice_date">發票日期</SortTh>
                <SortTh field="pretax_amount" className="text-right">未稅金額</SortTh>
                <SortTh field="tax" className="text-right">稅金</SortTh>
                <SortTh field="total_amount" className="text-right">含稅總額</SortTh>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">載入中...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">尚無資料</td></tr>
              ) : paged.map(item => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-indigo-50/30">
                  <td className="px-4 py-3 font-semibold">{item.company_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${TYPE_COLORS[item.type] || "bg-gray-100"}`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.invoice_period}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(item.invoice_date)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(item.pretax_amount)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatMoney(item.tax)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMoney(item.total_amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-indigo-600"><Pencil size={16} /></button>
                      <button onClick={() => setDeleteId(item.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <span className="text-sm text-gray-400">共 {sorted.length} 筆，第 {page}/{totalPages} 頁</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-2 rounded-lg border disabled:opacity-30 hover:bg-gray-100"><ChevronLeft size={18} /></button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="p-2 rounded-lg border disabled:opacity-30 hover:bg-gray-100"><ChevronRight size={18} /></button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 刪除確認 */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold mb-3">確認刪除</h3>
            <p className="text-gray-500 mb-5">確定要刪除這筆發票記錄嗎？此操作無法復原。</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border rounded-xl hover:bg-gray-100">取消</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600">刪除</button>
            </div>
          </div>
        </div>
      )}

      {/* 新增/編輯表單 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editItem ? "編輯發票" : "新增發票"}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">開立公司名稱</label>
                <input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  required className="w-full px-4 py-2.5 border rounded-xl text-lg focus:outline-none focus:border-indigo-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">進貨/出貨</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-4 py-2.5 border rounded-xl text-lg focus:outline-none focus:border-indigo-400">
                    <option value="進貨">進貨</option>
                    <option value="出貨">出貨</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">發票月份</label>
                  <select value={form.invoice_period} onChange={e => setForm(f => ({ ...f, invoice_period: e.target.value }))}
                    className="w-full px-4 py-2.5 border rounded-xl text-lg focus:outline-none focus:border-indigo-400">
                    {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">發票日期</label>
                <input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))}
                  className="w-full px-4 py-2.5 border rounded-xl text-lg focus:outline-none focus:border-indigo-400" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">未稅金額</label>
                  <input type="number" value={form.pretax_amount} onChange={e => handlePretaxChange(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl text-lg focus:outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">稅金 (5%)</label>
                  <input type="number" value={form.tax} onChange={e => {
                    const tax = Number(e.target.value) || 0
                    setForm(f => ({ ...f, tax: e.target.value, total_amount: (Number(f.pretax_amount) + tax).toString() }))
                  }}
                    className="w-full px-4 py-2.5 border rounded-xl text-lg focus:outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">含稅總額</label>
                  <input type="number" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))}
                    className="w-full px-4 py-2.5 border rounded-xl text-lg focus:outline-none focus:border-indigo-400 bg-gray-50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">備註</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-2.5 border rounded-xl text-lg focus:outline-none focus:border-indigo-400" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border rounded-xl hover:bg-gray-100">取消</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 font-semibold">
                  {editItem ? "儲存" : "新增"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
