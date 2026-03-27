"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { ChevronLeft, ShoppingCart, FileText, Eye, Printer } from "lucide-react"

const QT_STATUS = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-600" },
  sent: { label: "已送出", color: "bg-blue-100 text-blue-700" },
  accepted: { label: "已接受", color: "bg-green-100 text-green-700" },
  rejected: { label: "已拒絕", color: "bg-red-100 text-red-700" },
  expired: { label: "已過期", color: "bg-yellow-100 text-yellow-700" },
}

const SO_STATUS = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-600" },
  confirmed: { label: "已確認", color: "bg-blue-100 text-blue-700" },
  shipped: { label: "已出貨", color: "bg-orange-100 text-orange-700" },
  completed: { label: "已完成", color: "bg-green-100 text-green-700" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-700" },
}

export default function CustomerOrdersPage({ params }) {
  const { id } = use(params)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("sales")

  useEffect(() => {
    fetch(`/api/customers/${id}/orders`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center min-h-screen text-xl text-gray-400">載入中...</div>
  if (!data?.customer) return <div className="flex items-center justify-center min-h-screen text-xl text-red-500">找不到客戶資料</div>

  const { customer, quotations, sales_orders } = data
  const formatDate = d => d ? d.replace(/-/g, '/') : "—"
  const formatMoney = n => n != null ? `$${Number(n).toLocaleString()}` : "$0"

  const qtTotal = quotations.reduce((s, q) => s + (Number(q.total) || 0), 0)
  const soTotal = sales_orders.reduce((s, q) => s + (Number(q.total) || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/customers" className="p-2 rounded-lg hover:bg-gray-100">
              <ChevronLeft size={22} className="text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                {customer.short_name}
                <span className="text-base font-normal text-gray-400">的交易記錄</span>
              </h1>
              {customer.full_name && <p className="text-sm text-gray-500">{customer.full_name}</p>}
            </div>
          </div>
          <Link href={`/customers/${id}`} className="px-4 py-2 text-base font-semibold text-gray-500 hover:text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50">
            編輯客戶
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={() => setTab("sales")} className={`text-left bg-white rounded-2xl p-5 shadow-sm border-l-4 transition ${tab === "sales" ? "border-orange-500 ring-2 ring-orange-200" : "border-orange-300 hover:ring-1 hover:ring-orange-100"}`}>
            <div className="text-base text-gray-500 mb-1">銷貨單</div>
            <div className="text-3xl font-bold text-gray-800">{sales_orders.length} <span className="text-lg font-normal text-gray-400">筆</span></div>
            <div className="text-base text-orange-600 font-semibold mt-1">總金額 {formatMoney(soTotal)}</div>
          </button>
          <button onClick={() => setTab("quotations")} className={`text-left bg-white rounded-2xl p-5 shadow-sm border-l-4 transition ${tab === "quotations" ? "border-blue-500 ring-2 ring-blue-200" : "border-blue-300 hover:ring-1 hover:ring-blue-100"}`}>
            <div className="text-base text-gray-500 mb-1">報價單</div>
            <div className="text-3xl font-bold text-gray-800">{quotations.length} <span className="text-lg font-normal text-gray-400">筆</span></div>
            <div className="text-base text-blue-600 font-semibold mt-1">總金額 {formatMoney(qtTotal)}</div>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTab("sales")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-lg font-semibold rounded-lg transition ${tab === "sales" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <ShoppingCart size={20} /> 銷貨單 ({sales_orders.length})
          </button>
          <button onClick={() => setTab("quotations")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-lg font-semibold rounded-lg transition ${tab === "quotations" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <FileText size={20} /> 報價單 ({quotations.length})
          </button>
        </div>

        {/* Sales orders table */}
        {tab === "sales" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {sales_orders.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-lg">尚無銷貨記錄</div>
            ) : (
              <table className="w-full text-base">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">銷貨單號</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">銷貨日期</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">狀態</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">發票號碼</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-600">總金額</th>
                    <th className="px-5 py-3 text-center font-semibold text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sales_orders.map(o => {
                    const st = SO_STATUS[o.status] || { label: o.status || "—", color: "bg-gray-100 text-gray-600" }
                    return (
                      <tr key={o.id} className="border-b border-gray-100 hover:bg-orange-50/30">
                        <td className="px-5 py-3">
                          <Link href={`/sales/${o.id}`} className="text-orange-600 font-semibold hover:underline">{o.order_no}</Link>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{formatDate(o.order_date)}</td>
                        <td className="px-5 py-3"><span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${st.color}`}>{st.label}</span></td>
                        <td className="px-5 py-3 text-gray-500 text-sm">{o.invoice_no || "—"}</td>
                        <td className="px-5 py-3 text-right font-semibold text-lg">{formatMoney(o.total)}</td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            <Link href={`/sales/${o.id}`} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg" title="查看"><Eye size={16} /></Link>
                            <Link href={`/sales/${o.id}/print`} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg" title="列印"><Printer size={16} /></Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Quotations table */}
        {tab === "quotations" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {quotations.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-lg">尚無報價記錄</div>
            ) : (
              <table className="w-full text-base">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">報價單號</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">報價日期</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">有效日期</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">狀態</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-600">總金額</th>
                    <th className="px-5 py-3 text-center font-semibold text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map(q => {
                    const st = QT_STATUS[q.status] || { label: q.status || "—", color: "bg-gray-100 text-gray-600" }
                    return (
                      <tr key={q.id} className="border-b border-gray-100 hover:bg-blue-50/30">
                        <td className="px-5 py-3">
                          <Link href={`/quotation/${q.id}`} className="text-blue-600 font-semibold hover:underline">{q.quote_no}</Link>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{formatDate(q.quote_date)}</td>
                        <td className="px-5 py-3 text-gray-500">{formatDate(q.valid_date)}</td>
                        <td className="px-5 py-3"><span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${st.color}`}>{st.label}</span></td>
                        <td className="px-5 py-3 text-right font-semibold text-lg">{formatMoney(q.total)}</td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            <Link href={`/quotation/${q.id}`} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg" title="查看"><Eye size={16} /></Link>
                            <Link href={`/quotation/${q.id}/print`} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg" title="列印"><Printer size={16} /></Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
