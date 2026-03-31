"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { History, ChevronLeft, Search } from "lucide-react"

const MODULES = [
  "全部", "報價單", "銷貨單", "銷貨退回", "採購單", "進貨單", "進貨退出",
  "客戶", "廠商", "商品", "庫存", "記帳"
]

const ACTION_BADGE = {
  "新增": "bg-green-100 text-green-700",
  "修改": "bg-blue-100 text-blue-700",
  "刪除": "bg-red-100 text-red-700",
  "轉單": "bg-purple-100 text-purple-700",
  "庫存調整": "bg-yellow-100 text-yellow-700",
}

const PER_PAGE = 20

function formatTime(ts) {
  if (!ts) return ""
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [module, setModule] = useState("全部")
  const [page, setPage] = useState(1)

  const fetchLogs = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (module && module !== "全部") params.set("module", module)
    const res = await fetch(`/api/audit-logs?${params.toString()}`)
    const data = await res.json()
    setLogs(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [module])

  useEffect(() => {
    setPage(1)
  }, [q, module])

  const filtered = logs.filter((log) => {
    if (!q) return true
    const lower = q.toLowerCase()
    return (
      (log.description || "").toLowerCase().includes(lower) ||
      (log.module || "").toLowerCase().includes(lower) ||
      (log.record_no || "").toLowerCase().includes(lower)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600">
              <ChevronLeft size={24} />
            </Link>
            <div className="w-10 h-10 bg-slate-600 rounded-xl flex items-center justify-center">
              <History className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">操作日誌</h1>
              <p className="text-sm text-gray-500">系統操作記錄查詢</p>
            </div>
          </div>
          <div className="text-sm text-gray-400">共 {filtered.length} 筆記錄</div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        {/* Search & Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜尋說明、模組、單號..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <select
            value={module}
            onChange={(e) => setModule(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {MODULES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors"
          >
            查詢
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-20 text-gray-400">載入中...</div>
          ) : paged.length === 0 ? (
            <div className="text-center py-20 text-gray-400">暫無記錄</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">時間</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">操作</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">模組</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">單號</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">說明</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatTime(log.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_BADGE[log.action] || "bg-gray-100 text-gray-600"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{log.module}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono">{log.record_no || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{log.description || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              上一頁
            </button>
            <span className="text-sm text-gray-500">第 {page} / {totalPages} 頁</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              下一頁
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
