"use client"

import { useEffect, useState, use, Fragment } from "react"
import Link from "next/link"
import { ChevronLeft, FileSpreadsheet, Printer, Download, ChevronDown, ChevronRight } from "lucide-react"

const SO_STATUS = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-600" },
  confirmed: { label: "已確認", color: "bg-blue-100 text-blue-700" },
  shipped: { label: "已出貨", color: "bg-orange-100 text-orange-700" },
  completed: { label: "已完成", color: "bg-green-100 text-green-700" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-700" },
}

function getDefaultDates() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return { from: `${y}-${m}-01`, to: `${y}-${m}-${d}` }
}

export default function CustomerStatementPage({ params }) {
  const { id } = use(params)
  const defaults = getDefaultDates()
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState({})

  const fetchData = (f, t) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (f) params.set("from", f)
    if (t) params.set("to", t)
    fetch(`/api/customers/${id}/statement?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchData(from, to) }, [id])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchData(from, to)
  }

  const toggleRow = (orderId) => {
    setExpandedRows(prev => ({ ...prev, [orderId]: !prev[orderId] }))
  }

  const formatDate = d => d ? d.replace(/-/g, "/") : "—"
  const formatMoney = n => n != null ? `$${Number(n).toLocaleString()}` : "$0"

  const handlePrint = () => window.print()

  if (loading && !data) {
    return <div className="flex items-center justify-center min-h-screen text-xl text-gray-400">載入中...</div>
  }

  if (!data?.customer) {
    return <div className="flex items-center justify-center min-h-screen text-xl text-red-500">找不到客戶資料</div>
  }

  const { customer, orders, summary } = data

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          header, .no-print { display: none !important; }
          body { background: white !important; }
          .print-only { display: block !important; }
          .min-h-screen { min-height: auto !important; }
        }
        .print-only { display: none; }
      `}</style>

      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 no-print">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/customers" className="p-2 rounded-lg hover:bg-gray-100">
              <ChevronLeft size={22} className="text-gray-500" />
            </Link>
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">客戶對帳單</h1>
              <p className="text-base text-gray-400">{customer.short_name}{customer.full_name ? ` — ${customer.full_name}` : ""}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 text-base font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Printer size={18} />
              列印
            </button>
          </div>
        </div>
      </header>

      {/* Print header */}
      <div className="print-only px-6 py-4 border-b-2 border-gray-800 mb-4">
        <h1 className="text-2xl font-bold text-center">客戶對帳單</h1>
        <div className="flex justify-between mt-2 text-sm">
          <div>
            <p>客戶：{customer.short_name}{customer.full_name ? ` (${customer.full_name})` : ""}</p>
            <p>客戶代號：{customer.code || "—"}</p>
          </div>
          <div className="text-right">
            <p>期間：{formatDate(from)} ～ {formatDate(to)}</p>
            <p>列印日期：{new Date().toLocaleDateString("zh-TW")}</p>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Date range picker */}
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3 no-print">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">起始日期</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="px-3 py-2.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">結束日期</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="px-3 py-2.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-orange-500 text-white text-base font-semibold rounded-xl hover:bg-orange-600 transition-colors"
          >
            查詢
          </button>
        </form>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-orange-400">
              <div className="text-sm text-gray-500 mb-1">訂單數</div>
              <div className="text-3xl font-bold text-gray-800">{summary.total_orders}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-blue-400">
              <div className="text-sm text-gray-500 mb-1">銷售總額</div>
              <div className="text-2xl font-bold text-gray-800">{formatMoney(summary.total_amount)}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-green-400">
              <div className="text-sm text-gray-500 mb-1">已收款</div>
              <div className="text-2xl font-bold text-green-600">{formatMoney(summary.paid_amount)}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-red-400">
              <div className="text-sm text-gray-500 mb-1">未收款</div>
              <div className="text-2xl font-bold text-red-600">{formatMoney(summary.unpaid_amount)}</div>
            </div>
          </div>
        )}

        {/* Orders table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-gray-400 text-lg">載入中...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-lg">此期間無銷貨記錄</div>
          ) : (
            <table className="w-full text-base">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left font-semibold text-gray-600 w-10"></th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">銷貨單號</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">銷貨日期</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">商品明細</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-600">總金額</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-600">狀態</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const st = SO_STATUS[o.status] || { label: o.status || "—", color: "bg-gray-100 text-gray-600" }
                  const items = o.sales_order_items || []
                  const productNames = items.map(it => it.product_name || it.name || "—").join("、")
                  const isExpanded = expandedRows[o.id]

                  return (
                    <Fragment key={o.id}>
                      <tr
                        className="border-b border-gray-100 hover:bg-orange-50/30 cursor-pointer"
                        onClick={() => toggleRow(o.id)}
                      >
                        <td className="px-5 py-3 text-gray-400">
                          {items.length > 0 && (
                            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/sales/${o.id}`}
                            className="text-orange-600 font-semibold hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            {o.order_no}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{formatDate(o.order_date)}</td>
                        <td className="px-5 py-3 text-gray-600 max-w-[250px] truncate" title={productNames}>
                          {productNames || "—"}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-lg">{formatMoney(o.total)}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${st.color}`}>{st.label}</span>
                        </td>
                      </tr>
                      {isExpanded && items.length > 0 && (
                        <tr className="bg-orange-50/20">
                          <td colSpan={6} className="px-5 py-3">
                            <table className="w-full text-sm ml-6">
                              <thead>
                                <tr className="text-gray-500">
                                  <th className="text-left py-1 font-medium">品名</th>
                                  <th className="text-left py-1 font-medium">規格</th>
                                  <th className="text-right py-1 font-medium">數量</th>
                                  <th className="text-right py-1 font-medium">單價</th>
                                  <th className="text-right py-1 font-medium">小計</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((it, idx) => (
                                  <tr key={idx} className="border-t border-gray-100">
                                    <td className="py-1.5 text-gray-700">{it.product_name || it.name || "—"}</td>
                                    <td className="py-1.5 text-gray-500">{it.spec || it.description || "—"}</td>
                                    <td className="py-1.5 text-right text-gray-700">{it.quantity ?? "—"}</td>
                                    <td className="py-1.5 text-right text-gray-700">{formatMoney(it.unit_price ?? it.price)}</td>
                                    <td className="py-1.5 text-right font-medium text-gray-800">{formatMoney(it.subtotal ?? it.amount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td colSpan={4} className="px-5 py-3 text-right font-bold text-gray-700">合計</td>
                  <td className="px-5 py-3 text-right font-bold text-xl text-orange-600">{formatMoney(summary?.total_amount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Print footer */}
        <div className="print-only text-center text-sm text-gray-500 mt-8 pt-4 border-t border-gray-300">
          <p>冠毅國際有限公司　TEL: 06-3841619</p>
          <p>臺南市科技工業園區工業三路85號</p>
        </div>

        {/* Screen footer */}
        <div className="text-center text-sm text-gray-400 py-4 no-print">
          冠毅國際有限公司 ｜ 06-3841619
        </div>
      </main>
    </div>
  )
}
