"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Warehouse, ChevronLeft, AlertTriangle } from "lucide-react"

const CATEGORIES = [
  "全部","電器","五金","照明","衛浴","廚房","門窗","地板","塗料","管材",
  "電線","工具","安全防護","清潔用品","辦公用品","3C","家具","建材","其他","配件","文具"
]

export default function StockPage() {
  const [products, setProducts] = useState([])
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch("/api/products?limit=500")
    const data = await res.json()
    setProducts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = products.filter(p => {
    const matchQ = !q || (p.code || "").toLowerCase().includes(q.toLowerCase()) || (p.name || "").toLowerCase().includes(q.toLowerCase())
    const matchCat = !category || p.category === category
    return matchQ && matchCat
  })

  const getStatus = (p) => {
    const qty = Number(p.stock_qty || 0)
    const safety = Number(p.safety_stock || 0)
    if (qty <= 0) return { label: "缺貨", color: "bg-red-100 text-red-700" }
    if (qty <= safety) return { label: "低庫存", color: "bg-amber-100 text-amber-700" }
    return { label: "正常", color: "bg-green-100 text-green-700" }
  }

  const lowCount = products.filter(p => {
    const qty = Number(p.stock_qty || 0)
    const safety = Number(p.safety_stock || 0)
    return qty <= safety
  }).length

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600">
              <ChevronLeft size={24} />
            </Link>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Warehouse className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">庫存查詢</h1>
              <p className="text-base text-gray-400">商品與財務端 / 庫存管理</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {lowCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-5 py-3 rounded-xl">
            <AlertTriangle size={20} className="shrink-0" />
            <span className="text-base font-medium">
              有 <strong>{lowCount}</strong> 項商品庫存低於安全庫存量
            </span>
          </div>
        )}

        {/* Search & Category Filter */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="搜尋品號、品名..."
              className="w-full pl-10 pr-4 py-2.5 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="px-4 py-2.5 text-lg border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-blue-500"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat === "全部" ? "" : cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-xl text-gray-400">載入中...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-xl text-gray-400">無商品資料</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["品號", "品名", "單位", "分類", "庫存量", "安全庫存", "狀態"].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-base font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => {
                  const qty = Number(p.stock_qty || 0)
                  const safety = Number(p.safety_stock || 0)
                  const status = getStatus(p)
                  return (
                    <tr key={p.id} className={`hover:bg-blue-50/30 ${qty <= safety ? "bg-amber-50/40" : ""}`}>
                      <td className="px-5 py-4 text-base font-mono text-gray-500">{p.code}</td>
                      <td className="px-5 py-4 text-lg font-semibold">{p.name}</td>
                      <td className="px-5 py-4 text-base text-gray-500">{p.unit || "—"}</td>
                      <td className="px-5 py-4 text-base text-gray-500">{p.category || "—"}</td>
                      <td className={`px-5 py-4 text-xl font-bold ${qty <= 0 ? "text-red-600" : qty <= safety ? "text-amber-600" : "text-blue-700"}`}>
                        {qty}
                      </td>
                      <td className="px-5 py-4 text-base text-gray-500">{safety || "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-base text-gray-400">共 {filtered.length} 項商品</p>
      </main>
    </div>
  )
}
