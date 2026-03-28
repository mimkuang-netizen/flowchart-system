"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Plus, Pencil, Trash2, Receipt, ChevronLeft, ChevronRight, ClipboardPaste } from "lucide-react"

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
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState("")
  const [pastePreview, setPastePreview] = useState([])
  const [pasteMsg, setPasteMsg] = useState("")
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

  // 貼上表格解析
  const parsePaste = (text) => {
    const lines = text.trim().split("\n").filter(l => l.trim())
    const rows = []
    for (const line of lines) {
      const cols = line.split("\t")
      if (cols.length < 5) continue
      const companyName = cols[0]?.trim()
      if (!companyName || companyName === "開立公司名稱" || companyName === "Tr") continue
      const type = cols[1]?.trim() || "進貨"
      if (type !== "進貨" && type !== "出貨") continue
      const period = cols[2]?.trim() || ""
      const dateRaw = cols[3]?.trim() || ""
      // 處理日期格式 yyyy/m/d 或 yyyy-mm-dd
      let invoiceDate = ""
      if (dateRaw && dateRaw !== "yyyy/m/d") {
        const d = dateRaw.replace(/\//g, "-")
        const parts = d.split("-")
        if (parts.length === 3) {
          invoiceDate = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`
        }
      }
      const pretax = Number(String(cols[4] || "0").replace(/,/g, "")) || 0
      const tax = Number(String(cols[5] || "0").replace(/,/g, "")) || 0
      const total = Number(String(cols[6] || "0").replace(/,/g, "")) || 0
      if (pretax === 0 && tax === 0 && total === 0) continue
      rows.push({ company_name: companyName, type, invoice_period: period, invoice_date: invoiceDate || null, pretax_amount: pretax, tax, total_amount: total })
    }
    return rows
  }

  const handlePastePreview = () => {
    const rows = parsePaste(pasteText)
    setPastePreview(rows)
    setPasteMsg(rows.length > 0 ? `解析到 ${rows.length} 筆資料` : "未找到有效資料，請確認格式")
  }

  const handlePasteImport = async () => {
    if (pastePreview.length === 0) return
    setPasteMsg("匯入中...")
    let ok = 0, fail = 0
    for (const row of pastePreview) {
      const res = await fetch("/api/invoice-statistics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row) })
      if (res.ok) ok++; else fail++
    }
    setPasteMsg(`匯入完成：成功 ${ok} 筆${fail > 0 ? `，失敗 ${fail} 筆` : ""}`)
    setPastePreview([])
    setPasteText("")
    fetchData()
    setTimeout(() => { setShowPaste(false); setPasteMsg("") }, 2000)
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
          <div className="flex items-center gap-3">
            <button onClick={() => { setShowPaste(true); setPasteText(""); setPastePreview([]); setPasteMsg("") }}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white text-lg font-semibold rounded-xl hover:bg-amber-600">
              <ClipboardPaste size={18} /> 貼上匯入
            </button>
            <button onClick={openNew}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white text-lg font-semibold rounded-xl hover:bg-indigo-600">
              <Plus size={20} /> 新增發票
            </button>
          </div>
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

      {/* 貼上匯入 */}
      {showPaste && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-2">貼上表格資料匯入</h3>
            <p className="text-sm text-gray-400 mb-4">
              從 Google Sheets 複製表格（包含：公司名稱、進貨/出貨、發票月份、發票日期、未稅金額、稅金、含稅總額），直接貼上到下方
            </p>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder={"炎洲\t進貨\t1-2月\t2026/1/2\t1920\t96\t2016\n高菖\t進貨\t1-2月\t2026/1/14\t5625\t281\t5906"}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base font-mono focus:outline-none focus:border-amber-400 mb-3"
            />
            <button onClick={handlePastePreview}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-semibold mb-3">
              解析資料
            </button>

            {pasteMsg && <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mb-3">{pasteMsg}</p>}

            {pastePreview.length > 0 && (
              <>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-50">
                      <tr>
                        {["公司名稱", "類型", "月份", "日期", "未稅", "稅金", "含稅"].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 border-b">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pastePreview.map((r, i) => (
                        <tr key={i} className="border-b hover:bg-amber-50/30">
                          <td className="px-3 py-2 font-semibold">{r.company_name}</td>
                          <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${TYPE_COLORS[r.type]}`}>{r.type}</span></td>
                          <td className="px-3 py-2 text-gray-500">{r.invoice_period}</td>
                          <td className="px-3 py-2 text-gray-500">{r.invoice_date || "—"}</td>
                          <td className="px-3 py-2 text-right">${Number(r.pretax_amount).toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-gray-500">${Number(r.tax).toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-semibold">${Number(r.total_amount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={handlePasteImport}
                  className="px-5 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 font-semibold">
                  確認匯入 {pastePreview.length} 筆
                </button>
              </>
            )}

            <div className="flex justify-end mt-4">
              <button onClick={() => setShowPaste(false)} className="px-4 py-2 border rounded-xl hover:bg-gray-100">關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
