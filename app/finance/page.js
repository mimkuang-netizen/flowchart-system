"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TrendingUp, ChevronLeft, Search } from "lucide-react"

export default function FinancePage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [customer, setCustomer] = useState("")
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    return d.toISOString().split("T")[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sales`)
      const json = await res.json()
      let orders = Array.isArray(json) ? json : []
      // Filter by date range
      orders = orders.filter(o => {
        const d = o.order_date || o.created_at
        if (!d) return false
        if (dateFrom && d < dateFrom) return false
        if (dateTo && d > dateTo) return false
        return true
      })
      // Filter by customer name
      if (customer.trim()) {
        orders = orders.filter(o =>
          (o.customer_name || "").toLowerCase().includes(customer.toLowerCase())
        )
      }
      setData(orders)
    } catch {
      setData([])
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [dateFrom, dateTo, customer])

  const totalAmount = data.reduce((s, r) => s + Number(r.total || 0), 0)
  const completedAmount = data
    .filter(r => r.status === "completed")
    .reduce((s, r) => s + Number(r.total || 0), 0)
  const unpaidAmount = totalAmount - completedAmount

  const statusLabel = (status) => ({
    draft: "草稿",
    confirmed: "未收款",
    shipped: "未收款",
    completed: "已收款",
  }[status] || status)

  const statusColor = (status) => ({
    draft: "bg-gray-100 text-gray-600",
    confirmed: "bg-orange-100 text-orange-700",
    shipped: "bg-orange-100 text-orange-700",
    completed: "bg-green-100 text-green-700",
  }[status] || "bg-gray-100 text-gray-600")

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">財務報表</h1>
            <p className="text-base text-gray-400">商品與財務端 / 應收帳款</p>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* 篩選 */}
        <div className="flex flex-wrap items-center gap-4 bg-white rounded-2xl px-6 py-4 shadow-sm">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="客戶名稱篩選..."
              className="w-full pl-9 pr-4 py-2 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500" />
          </div>
          <span className="text-base font-semibold text-gray-600">日期</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500" />
          <span className="text-gray-400">至</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500" />
        </div>

        {/* 摘要卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-base text-gray-500">查詢期間筆數</p>
            <p className="text-3xl font-bold text-blue-700 mt-1">{data.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-base text-gray-500">應收帳款總額（未收款）</p>
            <p className="text-3xl font-bold text-orange-600 mt-1">${unpaidAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-base text-gray-500">已收款金額</p>
            <p className="text-3xl font-bold text-green-600 mt-1">${completedAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* 明細表 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-700">應收帳款明細</h2>
          </div>
          {loading ? <div className="py-16 text-center text-xl text-gray-400">載入中...</div>
          : data.length === 0 ? <div className="py-16 text-center text-xl text-gray-400">此期間無銷貨資料</div>
          : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{["客戶名稱", "銷貨單號", "銷貨日期", "總金額", "狀態"].map(h => (
                  <th key={h} className="px-5 py-4 text-left text-base font-semibold text-gray-500">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map(row => (
                  <tr key={row.id} className="hover:bg-blue-50/30">
                    <td className="px-5 py-4 text-lg font-semibold">{row.customer_name}</td>
                    <td className="px-5 py-4 text-base font-mono text-blue-700">{row.order_no}</td>
                    <td className="px-5 py-4 text-base text-gray-500">{row.order_date ? new Date(row.order_date).toLocaleDateString("zh-TW") : "—"}</td>
                    <td className="px-5 py-4 text-xl font-bold text-blue-700">${Number(row.total || 0).toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${statusColor(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-blue-50">
                  <td colSpan={3} className="px-5 py-4 text-base font-bold text-right text-gray-700">合計</td>
                  <td className="px-5 py-4 text-xl font-bold text-blue-700">${totalAmount.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
