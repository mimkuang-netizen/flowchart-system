"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Plus, Pencil, Trash2, PackageCheck, ChevronLeft, CheckSquare } from "lucide-react"

const STATUS_OPTS = [
  { value: "draft", label: "草稿", cls: "bg-gray-100 text-gray-600" },
  { value: "confirmed", label: "已確認", cls: "bg-blue-100 text-blue-700" },
  { value: "completed", label: "已完成", cls: "bg-green-100 text-green-700" },
]

export default function ReceivingList() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState("")
  const [dateFilter, setDateFilter] = useState("thisMonth")
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState(null)
  const [sortKey, setSortKey] = useState("created_at")
  const [sortDir, setSortDir] = useState("desc")
  const [selected, setSelected] = useState(new Set())
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

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
    if (!range || !item.receipt_date) return true
    const d = new Date(item.receipt_date)
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
    const res = await fetch(`/api/receiving${q ? `?q=${q}` : ""}`)
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [q])

  const handleDelete = async () => {
    await fetch(`/api/receiving/${deleteId}`, { method: "DELETE" })
    setDeleteId(null); fetchData()
  }

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    if (selected.size === sorted.length) setSelected(new Set())
    else setSelected(new Set(sorted.map(r => r.id)))
  }

  const handleBatchUpdateStatus = async (newStatus) => {
    if (selected.size === 0) return
    setUpdatingStatus(true)
    setShowStatusMenu(false)
    const ids = Array.from(selected)
    // 逐筆 PATCH（API 設計是單筆）；用 Promise.all 平行
    const results = await Promise.allSettled(ids.map(id =>
      fetch(`/api/receiving/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // 不帶 items → API 不會動明細 (見 PUT route)
        body: JSON.stringify({ status: newStatus }),
      })
    ))
    const fail = results.filter(r => r.status === "rejected" || (r.value && !r.value.ok)).length
    setUpdatingStatus(false)
    setSelected(new Set())
    if (fail > 0) alert(`${ids.length - fail}/${ids.length} 筆已更新；${fail} 筆失敗`)
    fetchData()
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString("zh-TW") : "—"

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
              <PackageCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">進貨單</h1>
              <p className="text-base text-gray-400">廠商端 / 進貨作業</p>
            </div>
          </div>
          <Link href="/receiving/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700">
            <Plus size={20} /> 新增進貨單
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋單號、廠商名稱..."
              className="w-full pl-10 pr-4 py-2.5 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-green-500 bg-white" />
          </div>
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="px-4 py-2.5 text-lg border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-green-400">
            <option value="">全部時間</option>
            <option value="thisMonth">當月</option>
            <option value="lastMonth">上個月</option>
            <option value="thisYear">今年</option>
            <option value="lastYear">去年</option>
          </select>
        </div>

        {/* 批次操作列 */}
        {selected.size > 0 && (
          <div className="relative flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
            <span className="text-green-700 font-semibold">已選 {selected.size} 筆</span>
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              disabled={updatingStatus}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold disabled:opacity-50"
            >
              <CheckSquare size={14} /> {updatingStatus ? "更新中..." : "批次更新狀態"}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              清除選取
            </button>
            {showStatusMenu && (
              <div className="absolute left-40 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 p-2 min-w-[160px]">
                <p className="text-sm text-gray-500 px-3 py-1 font-medium">改為：</p>
                {STATUS_OPTS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleBatchUpdateStatus(opt.value)}
                    disabled={updatingStatus}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-2"
                  >
                    <span className={`px-2 py-0.5 rounded-full text-xs ${opt.cls}`}>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? <div className="py-20 text-center text-xl text-gray-400">載入中...</div>
          : items.length === 0 ? <div className="py-20 text-center text-xl text-gray-400">尚無進貨單資料</div>
          : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={sorted.length > 0 && selected.size === sorted.length}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-green-500"
                    />
                  </th>
                  <SortTh field="receipt_no">進貨單號</SortTh>
                  <SortTh field="vendor_name">廠商名稱</SortTh>
                  <SortTh field="receipt_date">進貨日期</SortTh>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">對應採購單號</th>
                  <SortTh field="status">狀態</SortTh>
                  <SortTh field="total">總金額</SortTh>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(item => {
                  const statusOpt = STATUS_OPTS.find(s => s.value === item.status) || STATUS_OPTS[0]
                  return (
                  <tr key={item.id} className={`hover:bg-green-50 ${selected.has(item.id) ? 'bg-green-50/50' : ''}`}>
                    <td className="px-3 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleOne(item.id)}
                        className="w-4 h-4 accent-green-500"
                      />
                    </td>
                    <td className="px-5 py-4 text-lg font-mono font-semibold text-green-700">
                      <Link href={`/receiving/${item.id}`} className="hover:underline">{item.receipt_no}</Link>
                    </td>
                    <td className="px-5 py-4 text-lg">{item.vendor_name}</td>
                    <td className="px-5 py-4 text-base text-gray-500">{fmt(item.receipt_date)}</td>
                    <td className="px-5 py-4 text-base text-gray-500">{item.po_no || "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${statusOpt.cls}`}>
                        {statusOpt.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-lg font-semibold">${Number(item.total || 0).toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <Link href={`/receiving/${item.id}`} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Pencil size={18} /></Link>
                        <button onClick={() => setDeleteId(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-base text-gray-400">共 {items.length} 筆</p>
      </main>
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold mb-3">確認刪除</h3>
            <p className="text-lg text-gray-600 mb-6">確定要刪除此進貨單？此操作無法復原。</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-5 py-2.5 border-2 border-gray-200 text-lg rounded-xl">取消</button>
              <button onClick={handleDelete} className="px-5 py-2.5 bg-red-500 text-white text-lg font-semibold rounded-xl hover:bg-red-600">確認刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
