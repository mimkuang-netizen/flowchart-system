"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, SlidersHorizontal, ChevronLeft, Trash2 } from "lucide-react"

export default function StockAdjustList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch("/api/stock-adjust")
    setItems(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleDelete = async () => {
    await fetch(`/api/stock-adjust/${deleteId}`, { method: "DELETE" })
    setDeleteId(null); fetchData()
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString("zh-TW") : "—"

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <SlidersHorizontal className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">庫存調整</h1>
              <p className="text-base text-gray-400">商品與財務端 / 庫存管理</p>
            </div>
          </div>
          <Link href="/stock-adjust/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700">
            <Plus size={20} /> 新增調整單
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? <div className="py-20 text-center text-xl text-gray-400">載入中...</div>
          : items.length === 0 ? <div className="py-20 text-center text-xl text-gray-400">尚無庫存調整記錄</div>
          : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{["調整單號", "調整日期", "類型", "備註", "操作"].map(h => (
                  <th key={h} className="px-5 py-4 text-left text-base font-semibold text-gray-500">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-blue-50/30">
                    <td className="px-5 py-4 text-lg font-mono font-semibold text-blue-700">{item.adj_no}</td>
                    <td className="px-5 py-4 text-base text-gray-500">{fmt(item.adj_date)}</td>
                    <td className="px-5 py-4"><span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${item.adj_type === "stocktake" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                      {item.adj_type === "stocktake" ? "盤點調整" : "人工調整"}
                    </span></td>
                    <td className="px-5 py-4 text-base text-gray-500">{item.notes || "—"}</td>
                    <td className="px-5 py-4">
                      <button onClick={() => setDeleteId(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
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
            <p className="text-lg text-gray-600 mb-6">確定要刪除此調整記錄？庫存數量不會自動回復。</p>
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
