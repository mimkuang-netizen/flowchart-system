"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Plus, Pencil, Trash2, Truck, ChevronLeft } from "lucide-react"

export default function VendorsPage() {
  const [vendors, setVendors] = useState([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchVendors = async (q = "") => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    const res = await fetch(`/api/vendors?${params}`)
    const data = await res.json()
    setVendors(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchVendors() }, [])

  const handleSearch = e => { e.preventDefault(); fetchVendors(search) }
  const handleDelete = async id => {
    await fetch(`/api/vendors/${id}`, { method: "DELETE" })
    setDeleteTarget(null); fetchVendors(search)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">廠商資料</h1>
              <p className="text-base text-gray-400">基本資料管理</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/vendors/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 shadow-sm">
              <Plus size={20} />新增廠商
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜尋廠商代號、簡稱、聯絡人..."
              className="w-full pl-10 pr-4 py-2.5 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-green-400" />
          </div>
          <button type="submit" className="px-6 py-2.5 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700">查詢</button>
        </form>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? <div className="py-20 text-center text-gray-400 text-xl">載入中...</div>
            : vendors.length === 0 ? <div className="py-20 text-center text-gray-400 text-xl">{search || activeTag ? "找不到符合的廠商" : "尚無廠商資料，請點「新增廠商」開始建立"}</div>
            : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 w-20">執行</th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 w-10">序</th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">廠商代號</th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">廠商簡稱</th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">電話</th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">聯絡人</th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">手機</th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">營業地址</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v, i) => (
                    <tr key={v.id} className="border-b border-gray-100 hover:bg-green-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link href={`/vendors/${v.id}`}
                            className="w-8 h-8 flex items-center justify-center bg-green-500 text-white rounded-lg hover:bg-green-600">
                            <Pencil size={14} />
                          </Link>
                          <button onClick={() => setDeleteTarget(v)}
                            className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-base text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 text-base font-medium text-gray-800">{v.code}</td>
                      <td className="px-4 py-3 text-base text-gray-800">{v.short_name}</td>
                      <td className="px-4 py-3 text-base text-gray-600">{v.phone || "—"}</td>
                      <td className="px-4 py-3 text-base text-gray-600">{v.contact || "—"}</td>
                      <td className="px-4 py-3 text-base text-gray-600">{v.mobile || "—"}</td>
                      <td className="px-4 py-3 text-base text-gray-500 max-w-xs truncate">
                        {[v.business_city, v.business_district, v.business_address].filter(Boolean).join("") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
        {!loading && vendors.length > 0 && <p className="mt-3 text-base text-gray-400">共 {vendors.length} 筆</p>}
      </main>

      {deleteTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl px-8 py-7 flex flex-col items-center gap-4 min-w-[300px]">
            <Trash2 className="text-red-500" size={40} />
            <p className="text-xl font-bold text-gray-700 text-center">確定刪除「{deleteTarget.short_name}」？</p>
            <p className="text-base text-gray-400">刪除後無法復原</p>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setDeleteTarget(null)} className="px-6 py-2.5 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50">取消</button>
              <button onClick={() => handleDelete(deleteTarget.id)} className="px-6 py-2.5 bg-red-500 text-white text-lg rounded-xl hover:bg-red-600">確定刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
