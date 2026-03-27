"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Plus, Pencil, Trash2, RotateCcw, ChevronLeft } from "lucide-react"

const STATUS_MAP = {
  draft:     { label: "草稿",   color: "bg-gray-100 text-gray-600" },
  confirmed: { label: "已確認", color: "bg-blue-100 text-blue-700" },
  completed: { label: "已完成", color: "bg-green-100 text-green-700" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-700" },
}

export default function SalesReturnsList() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (status) params.set("status", status)
    const res = await fetch(`/api/sales-returns?${params}`)
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { setPage(1); fetchData() }, [q, status])

  const handleDelete = async () => {
    await fetch(`/api/sales-returns/${deleteId}`, { method: "DELETE" })
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
            <Link href="/" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">銷貨退回單</h1>
              <p className="text-base text-gray-400">客戶端 / 銷貨退回作業</p>
            </div>
          </div>
          <Link href="/sales-returns/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white text-lg font-semibold rounded-xl hover:bg-red-600">
            <Plus size={20} /> 新增退回單
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋單號、客戶名稱..."
              className="w-full pl-10 pr-4 py-2.5 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-red-400 bg-white" />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="px-4 py-2.5 text-lg border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-red-400">
            <option value="">全部狀態</option>
            {Object.entries(STATUS_MAP).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? <div className="py-20 text-center text-xl text-gray-400">載入中...</div>
          : items.length === 0 ? <div className="py-20 text-center text-xl text-gray-400">尚無銷貨退回單</div>
          : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["退回單號", "客戶名稱", "退回日期", "原銷貨單號", "退回原因", "狀態", "總金額", "操作"].map(h => (
                    <th key={h} className="px-4 py-4 text-left text-base font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(item => (
                  <tr key={item.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-4 py-4 text-lg font-mono font-semibold text-red-600">{item.return_no}</td>
                    <td className="px-4 py-4 text-lg">{item.customer_name}</td>
                    <td className="px-4 py-4 text-base text-gray-500">{formatDate(item.return_date)}</td>
                    <td className="px-4 py-4 text-base text-gray-500">{item.original_order_no || "—"}</td>
                    <td className="px-4 py-4 text-base text-gray-500 max-w-[150px] truncate">{item.reason || "—"}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${(STATUS_MAP[item.status] || STATUS_MAP.draft).color}`}>
                        {(STATUS_MAP[item.status] || { label: item.status }).label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-lg font-semibold text-red-600">-{formatMoney(item.total)}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <Link href={`/sales-returns/${item.id}`} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <Pencil size={18} />
                        </Link>
                        <button onClick={() => setDeleteId(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
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

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-3">確認刪除</h3>
            <p className="text-lg text-gray-600 mb-6">確定要刪除此退回單？此操作無法復原。</p>
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
