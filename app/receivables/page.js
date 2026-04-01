"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { HandCoins, ChevronLeft, Search, Download, Printer } from "lucide-react"
import { exportToExcel } from "@/lib/exportExcel"

export default function ReceivablesPage() {
  const [sales, setSales] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState("")
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })
  const [viewMode, setViewMode] = useState("summary") // summary | detail

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      const [salesRes, custRes] = await Promise.all([
        fetch("/api/sales").then(r => r.json()),
        fetch("/api/customers").then(r => r.json()),
      ])
      setSales(Array.isArray(salesRes) ? salesRes : [])
      setCustomers(Array.isArray(custRes) ? custRes : [])
      setLoading(false)
    }
    fetchAll()
  }, [])

  // Build customer short name map
  const custMap = {}
  customers.forEach(c => {
    if (c.full_name) custMap[c.full_name] = c.short_name || c.full_name
    if (c.short_name) custMap[c.short_name] = c.short_name
  })

  // Filter: only unpaid (not completed), match month and customer
  const filtered = sales.filter(s => {
    if (s.status === "completed") return false
    if (monthFilter) {
      const d = s.order_date || s.created_at || ""
      if (!d.startsWith(monthFilter)) return false
    }
    if (customer.trim()) {
      const q = customer.toLowerCase()
      const name = (s.customer_name || "").toLowerCase()
      const short = (custMap[s.customer_name] || "").toLowerCase()
      if (!name.includes(q) && !short.includes(q)) return false
    }
    return true
  })

  // Group by customer
  const grouped = {}
  for (const s of filtered) {
    const key = s.customer_name || "未知客戶"
    if (!grouped[key]) grouped[key] = { customer_name: key, short_name: custMap[key] || "", orders: [], total: 0 }
    grouped[key].orders.push(s)
    grouped[key].total += Number(s.total || 0)
  }
  const summaryList = Object.values(grouped).sort((a, b) => b.total - a.total)
  const grandTotal = summaryList.reduce((s, g) => s + g.total, 0)
  const totalOrders = filtered.length

  const fmt = (d) => d ? new Date(d).toLocaleDateString("zh-TW") : "—"
  const fmtMoney = (n) => `$${Number(n || 0).toLocaleString()}`

  const statusLabel = (status) => ({ draft: "草稿", confirmed: "未收款", shipped: "已出貨" }[status] || status)
  const statusColor = (status) => ({
    draft: "bg-gray-100 text-gray-600",
    confirmed: "bg-orange-100 text-orange-700",
    shipped: "bg-blue-100 text-blue-700",
  }[status] || "bg-gray-100 text-gray-600")

  const handleExport = () => {
    if (viewMode === "summary") {
      exportToExcel(summaryList.map(g => ({
        customer_name: g.customer_name,
        short_name: g.short_name,
        order_count: g.orders.length,
        total: g.total,
      })), [
        { header: "客戶名稱", key: "customer_name" },
        { header: "客戶簡稱", key: "short_name" },
        { header: "未收筆數", key: "order_count" },
        { header: "應收金額", key: "total", format: "money" },
      ], `應收帳款_${monthFilter}`)
    } else {
      exportToExcel(filtered.map(s => ({
        customer_name: s.customer_name,
        short_name: custMap[s.customer_name] || "",
        order_no: s.order_no,
        order_date: s.order_date,
        total: s.total,
        status: statusLabel(s.status),
      })), [
        { header: "客戶名稱", key: "customer_name" },
        { header: "客戶簡稱", key: "short_name" },
        { header: "銷貨單號", key: "order_no" },
        { header: "銷貨日期", key: "order_date", format: "date" },
        { header: "金額", key: "total", format: "money" },
        { header: "狀態", key: "status" },
      ], `應收帳款明細_${monthFilter}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
              <HandCoins className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">應收帳款</h1>
              <p className="text-base text-gray-400">客戶端 / 月結對帳</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 text-base font-semibold rounded-xl hover:bg-gray-50">
              <Download size={18} /> 匯出 Excel
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 text-base font-semibold rounded-xl hover:bg-gray-50">
              <Printer size={18} /> 列印
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* 篩選列 */}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="搜尋客戶名稱或簡稱..."
              className="w-full pl-9 pr-4 py-2.5 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 bg-white" />
          </div>
          <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="px-4 py-2.5 text-lg border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-purple-500" />
          <div className="flex rounded-xl border border-gray-300 overflow-hidden">
            <button onClick={() => setViewMode("summary")}
              className={`px-4 py-2.5 text-base font-semibold ${viewMode === "summary" ? "bg-purple-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              客戶彙總
            </button>
            <button onClick={() => setViewMode("detail")}
              className={`px-4 py-2.5 text-base font-semibold ${viewMode === "detail" ? "bg-purple-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              單據明細
            </button>
          </div>
        </div>

        {/* 摘要卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-base text-gray-500">未收款客戶數</p>
            <p className="text-3xl font-bold text-purple-700 mt-1">{summaryList.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-base text-gray-500">未收款筆數</p>
            <p className="text-3xl font-bold text-orange-600 mt-1">{totalOrders}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-base text-gray-500">應收帳款總額</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{fmtMoney(grandTotal)}</p>
          </div>
        </div>

        {/* 表格 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? <div className="py-20 text-center text-xl text-gray-400">載入中...</div>
          : filtered.length === 0 ? <div className="py-20 text-center text-xl text-gray-400">此期間無未收款項</div>
          : viewMode === "summary" ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">客戶名稱</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">客戶簡稱</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">未收筆數</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">應收金額</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500 print:hidden">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {summaryList.map(g => (
                  <tr key={g.customer_name} className="hover:bg-purple-50/50">
                    <td className="px-5 py-4 text-lg font-semibold">{g.customer_name}</td>
                    <td className="px-5 py-4 text-base text-gray-500">{g.short_name || "—"}</td>
                    <td className="px-5 py-4 text-lg">{g.orders.length} 筆</td>
                    <td className="px-5 py-4 text-xl font-bold text-red-600">{fmtMoney(g.total)}</td>
                    <td className="px-5 py-4 print:hidden">
                      <button onClick={() => { setCustomer(g.customer_name); setViewMode("detail") }}
                        className="text-purple-600 hover:underline text-base font-medium">查看明細</button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-purple-50 font-bold">
                  <td className="px-5 py-4 text-base text-right" colSpan={2}>合計</td>
                  <td className="px-5 py-4 text-lg">{totalOrders} 筆</td>
                  <td className="px-5 py-4 text-xl text-red-600">{fmtMoney(grandTotal)}</td>
                  <td className="print:hidden"></td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">客戶名稱</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">客戶簡稱</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">銷貨單號</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">銷貨日期</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">狀態</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">金額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.sort((a, b) => (a.customer_name || "").localeCompare(b.customer_name || "")).map(s => (
                  <tr key={s.id} className="hover:bg-purple-50/50">
                    <td className="px-5 py-4 text-lg font-semibold">{s.customer_name}</td>
                    <td className="px-5 py-4 text-base text-gray-500">{custMap[s.customer_name] || "—"}</td>
                    <td className="px-5 py-4 text-base font-mono text-purple-700">
                      <Link href={`/sales/${s.id}`} className="hover:underline">{s.order_no}</Link>
                    </td>
                    <td className="px-5 py-4 text-base text-gray-500">{fmt(s.order_date)}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${statusColor(s.status)}`}>
                        {statusLabel(s.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xl font-bold text-red-600">{fmtMoney(s.total)}</td>
                  </tr>
                ))}
                <tr className="bg-purple-50 font-bold">
                  <td className="px-5 py-4 text-base text-right" colSpan={5}>合計</td>
                  <td className="px-5 py-4 text-xl text-red-600">{fmtMoney(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
