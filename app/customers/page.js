"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Plus, Pencil, Trash2, Users, ChevronLeft } from "lucide-react"

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchCustomers = async (q = "") => {
    setLoading(true)
    const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setCustomers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchCustomers() }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchCustomers(search)
  }

  const handleDelete = async (id) => {
    await fetch(`/api/customers/${id}`, { method: "DELETE" })
    setDeleteTarget(null)
    fetchCustomers(search)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 標題列 */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">客戶資料</h1>
              <p className="text-base text-gray-400">基本資料管理</p>
            </div>
          </div>
          <Link
            href="/customers/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-lg font-semibold rounded-xl hover:bg-orange-600 transition-colors shadow-sm"
          >
            <Plus size={20} />
            新增客戶
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* 搜尋列 */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋客戶代號、簡稱、聯絡人..."
              className="w-full pl-10 pr-4 py-2.5 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-orange-500 text-white text-lg font-semibold rounded-xl hover:bg-orange-600 transition-colors"
          >
            查詢
          </button>
        </form>

        {/* 資料表格 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-400 text-xl">載入中...</div>
          ) : customers.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-xl">
              {search ? "找不到符合的客戶" : "尚無客戶資料，請點「新增客戶」開始建立"}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 w-20">執行</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 w-10">序</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">客戶代號</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">客戶簡稱</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">電話</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">主聯絡人</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">手機</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">送貨地址</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-orange-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/customers/${c.id}`}
                          className="w-8 h-8 flex items-center justify-center bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          title="編輯"
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          title="刪除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-base text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 text-base font-medium text-gray-800">{c.code}</td>
                    <td className="px-4 py-3 text-base text-gray-800">{c.short_name}</td>
                    <td className="px-4 py-3 text-base text-gray-600">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-base text-gray-600">{c.contact || "—"}</td>
                    <td className="px-4 py-3 text-base text-gray-600">{c.mobile || "—"}</td>
                    <td className="px-4 py-3 text-base text-gray-500 max-w-xs truncate">
                      {[c.delivery_city, c.delivery_district, c.delivery_address].filter(Boolean).join("") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && customers.length > 0 && (
          <p className="mt-3 text-base text-gray-400">共 {customers.length} 筆</p>
        )}
      </main>

      {/* 刪除確認視窗 */}
      {deleteTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl px-8 py-7 flex flex-col items-center gap-4 min-w-[300px]">
            <Trash2 className="text-red-500" size={40} />
            <p className="text-xl font-bold text-gray-700 text-center">
              確定刪除「{deleteTarget.short_name}」？
            </p>
            <p className="text-base text-gray-400 text-center">刪除後無法復原</p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-6 py-2.5 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteTarget.id)}
                className="px-6 py-2.5 bg-red-500 text-white text-lg rounded-xl hover:bg-red-600 transition-colors"
              >
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
