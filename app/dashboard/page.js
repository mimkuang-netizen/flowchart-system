"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { LayoutDashboard, ShoppingCart, FileText, Package, AlertTriangle, DollarSign, TrendingUp, Users, ChevronLeft, ArrowRight } from "lucide-react"

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [recentSales, setRecentSales] = useState([])
  const [recentQuotes, setRecentQuotes] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      const today = new Date()
      const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
      const todayStr = today.toISOString().slice(0, 10)

      const [salesRes, quotesRes, productsRes, customersRes] = await Promise.all([
        fetch("/api/sales").then(r => r.json()),
        fetch("/api/quotation").then(r => r.json()),
        fetch("/api/products?limit=500").then(r => r.json()),
        fetch("/api/customers").then(r => r.json()),
      ])

      const sales = Array.isArray(salesRes) ? salesRes : []
      const quotes = Array.isArray(quotesRes) ? quotesRes : []
      const products = Array.isArray(productsRes) ? productsRes : []
      const customers = Array.isArray(customersRes) ? customersRes : []

      // 本月統計
      const monthSales = sales.filter(s => s.order_date >= monthStart && s.order_date <= todayStr)
      const monthQuotes = quotes.filter(q => q.quote_date >= monthStart && q.quote_date <= todayStr)
      const monthRevenue = monthSales.reduce((sum, s) => sum + Number(s.total || 0), 0)

      // 待處理
      const pendingOrders = sales.filter(s => s.status === "draft" || s.status === "confirmed").length
      const pendingQuotes = quotes.filter(q => q.status === "draft" || q.status === "sent").length

      // 低庫存
      const lowStockItems = products.filter(p => {
        const qty = Number(p.stock_qty) || 0
        const safety = Number(p.safety_stock) || 0
        return qty <= safety && safety > 0
      })

      // 應收帳款（未完成的銷貨單總額）
      const receivable = sales
        .filter(s => s.status !== "completed")
        .reduce((sum, s) => sum + Number(s.total || 0), 0)

      setStats({
        monthRevenue,
        monthSalesCount: monthSales.length,
        monthQuotesCount: monthQuotes.length,
        pendingOrders,
        pendingQuotes,
        totalCustomers: customers.length,
        totalProducts: products.length,
        lowStockCount: lowStockItems.length,
        receivable,
      })

      setRecentSales(sales.slice(0, 5))
      setRecentQuotes(quotes.slice(0, 5))
      setLowStock(lowStockItems.slice(0, 5))
      setLoading(false)
    }

    fetchAll()
  }, [])

  const formatMoney = (n) => `$${Number(n || 0).toLocaleString()}`
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("zh-TW") : "—"

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center text-xl text-gray-400">載入儀表板...</div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">營運儀表板</h1>
              <p className="text-base text-gray-400">冠毅國際 — 即時營運概況</p>
            </div>
          </div>
          <Link href="/" className="px-4 py-2 border-2 border-gray-200 rounded-xl hover:bg-gray-50 text-base font-semibold">
            回到流程圖
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* 統計卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">本月營業額</p>
                <p className="text-2xl font-bold text-gray-800">{formatMoney(stats.monthRevenue)}</p>
              </div>
              <TrendingUp className="text-orange-500" size={28} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{stats.monthSalesCount} 筆銷貨單</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">待處理訂單</p>
                <p className="text-2xl font-bold text-gray-800">{stats.pendingOrders} 筆</p>
              </div>
              <ShoppingCart className="text-blue-500" size={28} />
            </div>
            <p className="text-xs text-gray-400 mt-1">報價單 {stats.pendingQuotes} 筆待回覆</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">應收帳款</p>
                <p className="text-2xl font-bold text-red-600">{formatMoney(stats.receivable)}</p>
              </div>
              <DollarSign className="text-red-500" size={28} />
            </div>
            <p className="text-xs text-gray-400 mt-1">未完成訂單合計</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">低庫存警示</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowStockCount} 項</p>
              </div>
              <AlertTriangle className="text-yellow-500" size={28} />
            </div>
            <p className="text-xs text-gray-400 mt-1">商品 {stats.totalProducts} / 客戶 {stats.totalCustomers}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 最近銷貨單 */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                <ShoppingCart size={18} className="text-orange-500" /> 最近銷貨單
              </h2>
              <Link href="/sales" className="text-sm text-orange-500 hover:text-orange-700 flex items-center gap-1">
                查看全部 <ArrowRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentSales.length === 0 ? (
                <p className="text-center text-gray-400 py-8">暫無資料</p>
              ) : recentSales.map(s => (
                <Link key={s.id} href={`/sales/${s.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-orange-50/30">
                  <div>
                    <span className="font-mono text-sm text-orange-600">{s.order_no}</span>
                    <span className="ml-3 text-gray-700">{s.customer_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{formatMoney(s.total)}</span>
                    <span className="ml-3 text-sm text-gray-400">{formatDate(s.order_date)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 最近報價單 */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                <FileText size={18} className="text-blue-500" /> 最近報價單
              </h2>
              <Link href="/quotation" className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1">
                查看全部 <ArrowRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentQuotes.length === 0 ? (
                <p className="text-center text-gray-400 py-8">暫無資料</p>
              ) : recentQuotes.map(q => (
                <Link key={q.id} href={`/quotation/${q.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-blue-50/30">
                  <div>
                    <span className="font-mono text-sm text-blue-600">{q.quote_no}</span>
                    <span className="ml-3 text-gray-700">{q.customer_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{formatMoney(q.total)}</span>
                    <span className="ml-3 text-sm text-gray-400">{formatDate(q.quote_date)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 低庫存商品 */}
        {lowStock.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                <AlertTriangle size={18} className="text-yellow-500" /> 低庫存商品
              </h2>
              <Link href="/stock" className="text-sm text-yellow-600 hover:text-yellow-800 flex items-center gap-1">
                查看全部 <ArrowRight size={14} />
              </Link>
            </div>
            <table className="w-full text-base">
              <thead className="bg-yellow-50/50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500">品號</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500">品名</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500">庫存量</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500">安全庫存</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map(p => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="px-5 py-3 font-mono text-sm">{p.code}</td>
                    <td className="px-5 py-3">{p.name}</td>
                    <td className="px-5 py-3 text-right font-semibold text-red-600">{p.stock_qty}</td>
                    <td className="px-5 py-3 text-right text-gray-400">{p.safety_stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
