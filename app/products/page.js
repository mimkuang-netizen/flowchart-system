"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Plus, Pencil, Trash2, Package, ChevronLeft, Filter, Download } from "lucide-react"
import { exportToExcel } from "@/lib/exportExcel"

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState("code")
  const [sortDir, setSortDir] = useState("asc")
  const PAGE_SIZE = 20

  const SortTh = ({ field, children, className = "" }) => (
    <th className={`px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:text-gray-800 select-none ${className}`}
      onClick={() => { if (sortKey === field) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(field); setSortDir("asc") } }}>
      <span className="flex items-center gap-1">{children} {sortKey === field ? (sortDir === "asc" ? "↑" : "↓") : ""}</span>
    </th>
  )

  const sorted = [...products].sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey]
    if (va == null) va = ""; if (vb == null) vb = ""
    if (typeof va === "string") va = va.toLowerCase()
    if (typeof vb === "string") vb = vb.toLowerCase()
    if (va < vb) return sortDir === "asc" ? -1 : 1
    if (va > vb) return sortDir === "asc" ? 1 : -1
    return 0
  })

  const fetchProducts = async (q = "", cat = "") => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (cat) params.set("category", cat)
    const res = await fetch(`/api/products?${params}`)
    const data = await res.json()
    const arr = Array.isArray(data) ? data : []
    setProducts(arr)
    const cats = [...new Set(arr.map(p => p.category).filter(Boolean))].sort()
    setCategories(cats)
    setPage(1)
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

  const handleSearch = (e) => { e.preventDefault(); fetchProducts(search, activeCategory) }

  const handleCategoryFilter = (cat) => {
    const next = activeCategory === cat ? "" : cat
    setActiveCategory(next)
    fetchProducts(search, next)
  }

  const handleDelete = async (id) => {
    await fetch(`/api/products/${id}`, { method: "DELETE" })
    setDeleteTarget(null)
    fetchProducts(search, activeCategory)
  }

  const totalPages = Math.ceil(products.length / PAGE_SIZE)
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">商品資料</h1>
              <p className="text-base text-gray-400">共 {products.length} 筆商品</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportToExcel(sorted, [
                { header: "品號", key: "code" },
                { header: "品名", key: "name" },
                { header: "單位", key: "unit" },
                { header: "分類", key: "category" },
                { header: "零售價", key: "retail_price", format: "money" },
                { header: "標準進價", key: "cost_price", format: "money" },
                { header: "庫存量", key: "stock_qty" },
              ], "商品資料")}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 text-base font-semibold rounded-xl hover:bg-gray-50"
            >
              <Download size={18} /> 匯出 Excel
            </button>
            <Link
              href="/products/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={20} />新增商品
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* 搜尋列 */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜尋品號、品名、供應商..."
              className="w-full pl-10 pr-4 py-2.5 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-blue-400"
            />
          </div>
          <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            查詢
          </button>
        </form>

        {/* 分類篩選 */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5 items-center">
            <Filter size={16} className="text-gray-400" />
            <button
              onClick={() => handleCategoryFilter("")}
              className={`px-3 py-1 rounded-full text-sm font-semibold border-2 transition-colors ${activeCategory === "" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}
            >全部</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => handleCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-sm font-semibold border-2 transition-colors ${activeCategory === cat ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}
              >{cat}</button>
            ))}
          </div>
        )}

        {/* 表格 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-400 text-xl">載入中...</div>
          ) : paged.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-xl">找不到商品</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-500 w-20">執行</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-500 w-8">序</th>
                  <SortTh field="code">品號</SortTh>
                  <SortTh field="name">品名</SortTh>
                  <SortTh field="unit">單位</SortTh>
                  <SortTh field="category">分類</SortTh>
                  <SortTh field="retail_price" className="text-right">零售價</SortTh>
                  <SortTh field="cost_price" className="text-right">標準進價</SortTh>
                  <SortTh field="stock_qty" className="text-right">庫存量</SortTh>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">主供應商</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p, i) => (
                  <tr key={p.id} className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${!p.active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-2">
                      <div className="flex gap-1.5">
                        <Link href={`/products/${p.id}`}
                          className="w-7 h-7 flex items-center justify-center bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                          <Pencil size={13} />
                        </Link>
                        <button onClick={() => setDeleteTarget(p)}
                          className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-400">{(page-1)*PAGE_SIZE+i+1}</td>
                    <td className="px-4 py-2 text-sm font-mono font-medium text-gray-800">{p.code}</td>
                    <td className="px-4 py-2 text-sm text-gray-800 max-w-xs">{p.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{p.unit || "—"}</td>
                    <td className="px-4 py-2">
                      {p.category && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">{p.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-700">{p.retail_price > 0 ? p.retail_price.toLocaleString() : "—"}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-700">{p.cost_price > 0 ? p.cost_price.toLocaleString() : "—"}</td>
                    <td className={`px-4 py-2 text-sm text-right font-semibold ${p.stock_qty > 0 ? "text-green-600" : "text-gray-400"}`}>
                      {p.stock_qty > 0 ? p.stock_qty : "—"}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">{p.supplier || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 分頁 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-400">第 {page} / {totalPages} 頁，共 {products.length} 筆</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(1)} disabled={page===1} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">第一頁</button>
              <button onClick={() => setPage(p=>p-1)} disabled={page===1} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">上一頁</button>
              <button onClick={() => setPage(p=>p+1)} disabled={page===totalPages} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">下一頁</button>
              <button onClick={() => setPage(totalPages)} disabled={page===totalPages} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">最後頁</button>
            </div>
          </div>
        )}
      </main>

      {/* 刪除確認 */}
      {deleteTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl px-8 py-7 flex flex-col items-center gap-4 min-w-[300px]">
            <Trash2 className="text-red-500" size={40} />
            <p className="text-xl font-bold text-gray-700 text-center">確定刪除「{deleteTarget.name}」？</p>
            <p className="text-sm text-gray-400">刪除後無法復原</p>
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
