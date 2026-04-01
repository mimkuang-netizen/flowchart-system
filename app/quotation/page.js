"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Plus, Pencil, Trash2, FileText, ChevronLeft, Printer, Download, Link2, Check } from "lucide-react"
import { exportToExcel } from "@/lib/exportExcel"

const STATUS_MAP = {
  draft:    { label: "草稿",   color: "bg-gray-100 text-gray-600" },
  sent:     { label: "已送出", color: "bg-blue-100 text-blue-700" },
  accepted: { label: "已接受", color: "bg-green-100 text-green-700" },
  rejected: { label: "已拒絕", color: "bg-red-100 text-red-700" },
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, color: "bg-gray-100 text-gray-600" }
  return <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${s.color}`}>{s.label}</span>
}

export default function QuotationList() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [dateFilter, setDateFilter] = useState("thisMonth")
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState(null)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState("created_at")
  const [sortDir, setSortDir] = useState("desc")
  const [copiedId, setCopiedId] = useState(null)
  const PAGE_SIZE = 20

  const handleCopyLink = (itemId) => {
    const url = `${window.location.origin}/quotation/${itemId}/print`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(itemId)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const SortTh = ({ field, children, className = "" }) => (
    <th className={`px-5 py-4 text-left text-base font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none ${className}`}
      onClick={() => { if (sortKey === field) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(field); setSortDir("asc") } }}>
      <span className="flex items-center gap-1">{children} {sortKey === field ? (sortDir === "asc" ? "↑" : "↓") : ""}</span>
    </th>
  )

  const getDateRange = (filter) => {
    const now = new Date()
    const y = now.getFullYear(), m = now.getMonth()
    switch (filter) {
      case "thisMonth": return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) }
      case "lastMonth": return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) }
      case "thisYear": return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) }
      case "lastYear": return { start: new Date(y - 1, 0, 1), end: new Date(y - 1, 11, 31) }
      default: return null
    }
  }

  const dateFiltered = dateFilter ? items.filter(item => {
    const range = getDateRange(dateFilter)
    if (!range || !item.quote_date) return true
    const d = new Date(item.quote_date)
    return d >= range.start && d <= range.end
  }) : items

  const sorted = [...dateFiltered].sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey]
    if (va == null) va = ""; if (vb == null) vb = ""
    if (typeof va === "string") va = va.toLowerCase()
    if (typeof vb === "string") vb = vb.toLowerCase()
    if (va < vb) return sortDir === "asc" ? -1 : 1
    if (va > vb) return sortDir === "asc" ? 1 : -1
    return 0
  })

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (status) params.set("status", status)
    const res = await fetch(`/api/quotation?${params}`)
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { setPage(1); fetchData() }, [q, status])

  const handleDelete = async () => {
    await fetch(`/api/quotation/${deleteId}`, { method: "DELETE" })
    setDeleteId(null)
    fetchData()
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("zh-TW") : "—"
  const formatMoney = (n) => n != null ? `$${Number(n).toLocaleString()}` : "—"

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">報價單</h1>
              <p className="text-base text-gray-400">客戶端 / 報價作業</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportToExcel(items, [
                { header: "報價單號", key: "quote_no" },
                { header: "客戶名稱", key: "customer_name" },
                { header: "報價日期", key: "quote_date", format: "date" },
                { header: "有效日期", key: "valid_until", format: "date" },
                { header: "狀態", key: "status" },
                { header: "總金額", key: "total", format: "money" },
              ], "報價單")}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 text-base font-semibold rounded-xl hover:bg-gray-50"
            >
              <Download size={18} /> 匯出 Excel
            </button>
            <Link
              href="/quotation/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-lg font-semibold rounded-xl hover:bg-orange-600 transition-colors"
            >
              <Plus size={20} />
              新增報價單
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* 搜尋 */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="搜尋單號、客戶名稱..."
              className="w-full pl-10 pr-4 py-2.5 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400 bg-white"
            />
          </div>
          <select
            value={status} onChange={e => setStatus(e.target.value)}
            className="px-4 py-2.5 text-lg border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-orange-400"
          >
            <option value="">全部狀態</option>
            {Object.entries(STATUS_MAP).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <select value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1) }}
            className="px-4 py-2.5 text-lg border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-orange-400">
            <option value="">全部時間</option>
            <option value="thisMonth">當月</option>
            <option value="lastMonth">上個月</option>
            <option value="thisYear">今年</option>
            <option value="lastYear">去年</option>
          </select>
        </div>

        {/* 列表 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-xl text-gray-400">載入中...</div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-xl text-gray-400">尚無報價單資料</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <SortTh field="quote_no">報價單號</SortTh>
                  <SortTh field="customer_name">客戶名稱</SortTh>
                  <SortTh field="quote_date">報價日期</SortTh>
                  <SortTh field="valid_until">有效日期</SortTh>
                  <SortTh field="status">狀態</SortTh>
                  <SortTh field="total">總金額</SortTh>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(item => (
                  <tr key={item.id} className="hover:bg-orange-50 transition-colors">
                    <td className="px-5 py-4 text-lg font-mono font-semibold text-orange-600">{item.quote_no}</td>
                    <td className="px-5 py-4 text-lg">{item.customer_name}</td>
                    <td className="px-5 py-4 text-base text-gray-500">{formatDate(item.quote_date)}</td>
                    <td className="px-5 py-4 text-base text-gray-500">{formatDate(item.valid_until)}</td>
                    <td className="px-5 py-4"><StatusBadge status={item.status} /></td>
                    <td className="px-5 py-4 text-lg font-semibold text-gray-700">{formatMoney(item.total)}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <Link href={`/quotation/${item.id}/print`} target="_blank" className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="列印">
                          <Printer size={18} />
                        </Link>
                        <Link href={`/quotation/${item.id}/print?action=download`} target="_blank" className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors" title="下載 PDF">
                          <Download size={18} />
                        </Link>
                        <button onClick={() => handleCopyLink(item.id)} className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="複製分享連結">
                          {copiedId === item.id ? <Check size={18} className="text-green-500" /> : <Link2 size={18} />}
                        </button>
                        <Link href={`/quotation/${item.id}`} className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="編輯">
                          <Pencil size={18} />
                        </Link>
                        <button onClick={() => setDeleteId(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="刪除">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {Math.ceil(items.length / PAGE_SIZE) > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50">第一頁</button>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50">上一頁</button>
            <span className="px-3 py-1.5 text-sm">{page} / {Math.ceil(items.length / PAGE_SIZE)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page === Math.ceil(items.length / PAGE_SIZE)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50">下一頁</button>
            <button onClick={() => setPage(Math.ceil(items.length / PAGE_SIZE))} disabled={page === Math.ceil(items.length / PAGE_SIZE)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50">最後一頁</button>
          </div>
        )}
        <p className="text-base text-gray-400">共 {items.length} 筆</p>
      </main>

      {/* 刪除確認 */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-3">確認刪除</h3>
            <p className="text-lg text-gray-600 mb-6">確定要刪除此報價單嗎？此操作無法復原。</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-5 py-2.5 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50">取消</button>
              <button onClick={handleDelete} className="px-5 py-2.5 bg-red-500 text-white text-lg font-semibold rounded-xl hover:bg-red-600">確認刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
