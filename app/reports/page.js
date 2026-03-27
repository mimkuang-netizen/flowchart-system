"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BarChart3, ChevronLeft, TrendingUp, Users } from "lucide-react"

export default function ReportsPage() {
  const [tab, setTab] = useState("customer") // customer | product
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3)
    return d.toISOString().split("T")[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0])
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?type=${tab}&from=${dateFrom}&to=${dateTo}`)
      const json = await res.json()
      setData(Array.isArray(json) ? json : [])
    } catch {
      setData([])
    }
    setLoading(false)
  }

  useEffect(() => { fetchReport() }, [tab, dateFrom, dateTo])

  const maxVal = data.length > 0 ? Math.max(...data.map(d => d.total)) : 1

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
            <p className="text-base text-gray-400">商品與財務端 / 銷售分析</p>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* 切換 Tab */}
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
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-700 mb-6">
            {tab === "customer" ? "客戶銷售排名表" : "暢銷商品分析圖"}
          </h2>
          {loading ? (
            <div className="py-16 text-center text-xl text-gray-400">載入中...</div>
          ) : data.length === 0 ? (
            <div className="py-16 text-center text-xl text-gray-400">
              <p>此期間尚無銷售資料</p>
              <p className="text-base text-gray-300 mt-2">請先建立銷貨單後即可查看報表</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.slice(0, 20).map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="w-8 text-center text-lg font-bold text-gray-400">{i + 1}</span>
                  <div className="w-48 text-base font-semibold truncate">{tab === "customer" ? item.customer_name : item.product_name}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                      style={{ width: `${Math.max(5, (item.total / maxVal) * 100)}%` }}>
                      <span className="text-white text-sm font-bold whitespace-nowrap">${Number(item.total).toLocaleString()}</span>
                    </div>
                  </div>
                  {tab === "customer" && <span className="text-base text-gray-500 w-20 text-right">{item.order_count} 筆</span>}
                  {tab === "product" && <span className="text-base text-gray-500 w-24 text-right">數量 {item.qty}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
