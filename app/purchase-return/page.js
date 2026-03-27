"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Plus, Pencil, Trash2, PackageX, ChevronLeft } from "lucide-react"

export default function PurchaseReturnList() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch(`/api/purchase-return${q ? `?q=${q}` : ""}`)
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [q])

  const handleDelete = async () => {
    await fetch(`/api/purchase-return/${deleteId}`, { method: "DELETE" })
    setDeleteId(null); fetchData()
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString("zh-TW") : "—"

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
              <PackageX className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">進貨退出</h1>
              <p className="text-base text-gray-400">廠商端 / 退貨作業</p>
            </div>
          </div>
          <Link href="/purchase-return/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700">
            <Plus size={20} /> 新增退出單
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋單號、廠商名稱..."
            className="w-full pl-10 pr-4 py-2.5 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-green-500 bg-white" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? <div className="py-20 text-center text-xl text-gray-400">載入中...</div>
          : items.length === 0 ? <div className="py-20 text-center text-xl text-gray-400">尚無退出單資料</div>
          : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{["退出單號", "廠商名稱", "退出日期", "原進貨單號", "退出原因", "總金額", "操作"].map(h => (
                  <th key={h} className="px-5 py-4 text-left text-base font-semibold text-gray-500">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-green-50">
                    <td className="px-5 py-4 text-lg font-mono font-semibold text-green-700">{item.return_no}</td>
                    <td className="px-5 py-4 text-lg">{item.vendor_name}</td>
                    <td className="px-5 py-4 text-base text-gray-500">{fmt(item.return_date)}</td>
                    <td className="px-5 py-4 text-base text-gray-500">{item.original_receipt_no || "—"}</td>
                    <td className="px-5 py-4 text-base text-gray-500">{item.reason || "—"}</td>
                    <td className="px-5 py-4 text-lg font-semibold">${Number(item.total || 0).toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <Link href={`/purchase-return/${item.id}`} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Pencil size={18} /></Link>
                        <button onClick={() => setDeleteId(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                      </div>
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
            <p className="text-lg text-gray-600 mb-6">確定要刪除此退出單？此操作無法復原。</p>
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
