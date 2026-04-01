"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ShoppingCart, AlertTriangle, DollarSign, TrendingUp } from "lucide-react"

export default function DashboardSummary() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
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

        const monthSales = sales.filter(s => s.order_date >= monthStart && s.order_date <= todayStr)
        const monthRevenue = monthSales.reduce((sum, s) => sum + Number(s.total || 0), 0)

        const pendingOrders = sales.filter(s => s.status === "draft" || s.status === "confirmed").length
        const pendingQuotes = quotes.filter(q => q.status === "draft" || q.status === "sent").length

        const lowStockCount = products.filter(p => {
          const qty = Number(p.stock_qty) || 0
          const safety = Number(p.safety_stock) || 0
          return qty <= safety && safety > 0
        }).length

        const receivable = sales
          .filter(s => s.status !== "completed")
          .reduce((sum, s) => sum + Number(s.total || 0), 0)

        setStats({
          monthRevenue,
          monthSalesCount: monthSales.length,
          pendingOrders,
          pendingQuotes,
          totalCustomers: customers.length,
          totalProducts: products.length,
          lowStockCount,
          receivable,
        })
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const formatMoney = (n) => `$${Number(n || 0).toLocaleString()}`

  if (loading) {
    return (
      <div className="w-full px-4 py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-28" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    {
      label: "本月營業額",
      value: formatMoney(stats.monthRevenue),
      sub: `${stats.monthSalesCount} 筆銷貨單`,
      icon: TrendingUp,
      color: "orange",
      borderColor: "border-orange-500",
      iconColor: "text-orange-500",
      valueColor: "text-gray-800",
      hoverBg: "hover:bg-orange-50/50",
    },
    {
      label: "待處理訂單",
      value: `${stats.pendingOrders} 筆`,
      sub: `報價單 ${stats.pendingQuotes} 筆待回覆`,
      icon: ShoppingCart,
      color: "blue",
      borderColor: "border-blue-500",
      iconColor: "text-blue-500",
      valueColor: "text-gray-800",
      hoverBg: "hover:bg-blue-50/50",
    },
    {
      label: "應收帳款",
      value: formatMoney(stats.receivable),
      sub: "未完成訂單合計",
      icon: DollarSign,
      color: "red",
      borderColor: "border-red-500",
      iconColor: "text-red-500",
      valueColor: "text-red-600",
      hoverBg: "hover:bg-red-50/50",
    },
    {
      label: "低庫存警示",
      value: `${stats.lowStockCount} 項`,
      sub: `商品 ${stats.totalProducts} / 客戶 ${stats.totalCustomers}`,
      icon: AlertTriangle,
      color: "yellow",
      borderColor: "border-yellow-500",
      iconColor: "text-yellow-500",
      valueColor: "text-yellow-600",
      hoverBg: "hover:bg-yellow-50/50",
    },
  ]

  return (
    <div className="w-full px-4 py-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              href="/dashboard"
              className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${card.borderColor} ${card.hoverBg} transition-colors cursor-pointer block`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">{card.label}</p>
                  <p className={`text-lg font-bold ${card.valueColor} truncate`}>{card.value}</p>
                </div>
                <Icon className={`${card.iconColor} flex-shrink-0`} size={22} />
              </div>
              <p className="text-[11px] text-gray-400 mt-1 truncate">{card.sub}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
