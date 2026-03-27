"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BarChart3, ChevronLeft, Users, TrendingUp } from "lucide-react"

export default function ReportsPage() {
  const [tab, setTab] = useState("customer") // customer | product
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3)
    return d.toISOString().split("T")[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0])
  const [salesData, setSalesData] = useState([])
  const [productData, setProductData] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchCustomerRanking = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sales`)
      const json = await res.json()
      const orders = Array.isArray(json) ? json : []
      // Filter by date range
      const filtered = orders.filter(o => {
        const d = o.order_date || o.created_at
        if (!d) return false
        if (dateFrom && d < dateFrom) return false
        if (dateTo && d > dateTo) return false
        return true
      })
      // Aggregate by customer_name
      const map = {}
      for (const row of filtered) {
        const name = row.customer_name || "未知客戶"
        if (!map[name]) map[name] = { customer_name: name, order_count: 0, total: 0 }
        map[name].order_count += 1
        map[name].total += Number(row.total || 0)
      }
      const result = Object.values(map).sort((a, b) => b.total - a.total)
      setSalesData(result)
    } catch {
      setSalesData([])
    }
    setLoading(false)
  }

  const fetchTopProducts = async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (dateFrom) p.set("start_date", dateFrom)
      if (dateTo) p.set("end_date", dateTo)
      const res = await fetch(`/api/reports/top-products?${p}`)
      const json = await res.json()
      setProductData(Array.isArray(json) ? json : [])
    } catch {
      setProductData([])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (tab === "customer") fetchCustomerRanking()
    else fetchTopProducts()
  }, [tab, dateFrom, dateTo])

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">進銷存報表</h1>
            <p className="text-base text-gray-400">商品與財務端 / 報表分析</p>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Tab 切換 */}
        <div className="flex gap-3">
          <button onClick={() => setTab("customer")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-lg font-semibold transition-colors ${tab === "customer" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-blue-50 border border-gray-200"}`}>
            <Users size={18} /> 客戶銷售排名
          </button>
          <button onClick={() => setTab("product")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-lg font-semibold transition-colors ${tab === "product" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-blue-50 border border-gray-200"}`}>
            <TrendingUp size={18} /> 暢銷商品分析
          </button>
        </div>

        {/* 日期篩選 */}
        <div className="flex items-center gap-4 bg-white rounded-2xl px-6 py-4 shadow-sm">
          <span className="text-base font-semibold text-gray-600">查詢區間</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500" />
          <span className="text-gray-400">至</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500" />
        </div>

        {/* 報表內容 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-700">
              {tab === "customer" ? "客戶銷售排名" : "暢銷商品分析"}
            </h2>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xl text-gray-400">載入中...</div>
          ) : tab === "customer" ? (
            salesData.length === 0 ? (
              <div className="py-16 text-center text-xl text-gray-400">
                <p>此期間尚無銷售資料</p>
                <p className="text-base text-gray-300 mt-2">請先建立銷貨單後即可查看報表</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{["排名", "客戶名稱", "銷貨筆數", "總銷售金額"].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-base font-semibold text-gray-500">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {salesData.map((item, i) => (
                    <tr key={item.customer_name} className="hover:bg-blue-50/30">
                      <td className="px-5 py-4 text-lg font-bold text-gray-400 w-16 text-center">{i + 1}</td>
                      <td className="px-5 py-4 text-lg font-semibold">{item.customer_name}</td>
                      <td className="px-5 py-4 text-base text-gray-600">{item.order_count} 筆</td>
                      <td className="px-5 py-4 text-xl font-bold text-blue-700">${Number(item.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            productData.length === 0 ? (
              <div className="py-16 text-center text-xl text-gray-400">
                <p>此期間尚無商品銷售資料</p>
                <p className="text-base text-gray-300 mt-2">請先建立銷貨單後即可查看報表</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{["排名", "品號", "品名", "銷售數量", "銷售金額"].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-base font-semibold text-gray-500">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {productData.map((item, i) => (
                    <tr key={item.product_code || item.product_name} className="hover:bg-blue-50/30">
                      <td className="px-5 py-4 text-lg font-bold text-gray-400 w-16 text-center">{i + 1}</td>
                      <td className="px-5 py-4 text-base font-mono text-gray-500">{item.product_code || "—"}</td>
                      <td className="px-5 py-4 text-lg font-semibold">{item.product_name}</td>
                      <td className="px-5 py-4 text-base text-gray-600">{Number(item.total_quantity).toLocaleString()}</td>
                      <td className="px-5 py-4 text-xl font-bold text-blue-700">${Number(item.total_amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </main>
    </div>
  )
}
