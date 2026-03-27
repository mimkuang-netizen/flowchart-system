"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Warehouse, ChevronLeft, AlertTriangle } from "lucide-react"

const CATEGORIES = ["全部","電器","五金","照明","衛浴","廚房","門窗","地板","塗料","管材","電線","工具","安全防護","清潔用品","辦公用品","3C","家具","建材","其他","配件","文具"]

export default function StockPage() {
  const [products, setProducts] = useState([])
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("")
  const [showLow, setShowLow] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (q) p.set("q", q)
    if (category) p.set("category", category)
    const res = await fetch(`/api/products?${p}`)
    const data = await res.json()
    setProducts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [q, category])

  const displayed = showLow
    ? products.filter(p => Number(p.stock_qty) <= Number(p.safety_stock || 0))
    : products

  const lowCount = products.filter(p => Number(p.stock_qty) <= Number(p.safety_stock || 0)).length

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Warehouse className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">庫存查詢</h1>
              <p className="text-base text-gray-400">商品與財務端 / 庫存管理</p>
            </div>
          </div>
          <Link href="/stock-adjust/new"
            className="px-5 py-2.5 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700">
            新增庫存調整
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {lowCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-5 py-3 rounded-xl">
            <AlertTriangle size={20} className="shrink-0" />
            <span className="text-base font-medium">有 <strong>{lowCount}</strong> 項商品庫存低於安全庫存量</span>
            <button onClick={() => setShowLow(!showLow)} className="ml-auto text-sm underline">
              {showLow ? "顯示全部" : "只顯示低庫存"}
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋品號、品名..."
              className="w-full pl-10 pr-4 py-2.5 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white" />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.slice(0, 8).map(cat => (
              <button key={cat} onClick={() => setCategory(cat === "全部" ? "" : cat)}
                className={`px-4 py-2 rounded-xl text-base font-medium transition-colors ${category === (cat === "全部" ? "" : cat) || (cat === "全部" && !category) ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-blue-50 border border-gray-200"}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? <div className="py-20 text-center text-xl text-gray-400">載入中...</div>
          : displayed.length === 0 ? <div className="py-20 text-center text-xl text-gray-400">無商品資料</div>
          : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{["品號", "品名", "分類", "單位", "安全庫存", "現有庫存", "狀態"].map(h => (
                  <th key={h} className="px-5 py-4 text-left text-base font-semibold text-gray-500">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(p => {
                  const qty = Number(p.stock_qty || 0)
                  const safety = Number(p.safety_stock || 0)
                  const isLow = qty <= safety
                  return (
                    <tr key={p.id} className={`hover:bg-blue-50/30 ${isLow ? "bg-amber-50/40" : ""}`}>
                      <td className="px-5 py-4 text-base font-mono text-gray-500">{p.code}</td>
                      <td className="px-5 py-4 text-lg font-semibold">{p.name}</td>
                      <td className="px-5 py-4 text-base text-gray-500">{p.category || "—"}</td>
                      <td className="px-5 py-4 text-base">{p.unit || "—"}</td>
                      <td className="px-5 py-4 text-base text-gray-500">{safety || "—"}</td>
                      <td className={`px-5 py-4 text-xl font-bold ${isLow ? "text-amber-600" : "text-blue-700"}`}>{qty}</td>
                      <td className="px-5 py-4">
                        {isLow
                          ? <span className="flex items-center gap-1.5 text-amber-600 text-sm font-medium"><AlertTriangle size={14} />庫存不足</span>
                          : <span className="text-green-600 text-sm font-medium">正常</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-base text-gray-400">共 {displayed.length} 項商品</p>
      </main>
    </div>
  )
}
