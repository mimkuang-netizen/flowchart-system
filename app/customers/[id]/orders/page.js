"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { ChevronLeft, ShoppingCart, Eye } from "lucide-react"

export default function CustomerOrdersPage({ params }) {
  const { id } = use(params)
  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const cRes = await fetch(`/api/customers/${id}`)
      const cData = await cRes.json()
      setCustomer(cData)

      const oRes = await fetch(`/api/sales?customer=${encodeURIComponent(cData.short_name)}`)
      const oData = await oRes.json()
      setOrders(Array.isArray(oData) ? oData : [])
      setLoading(false)
    }
    load()
  }, [id])

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/customers" className="text-gray-400 hover:text-gray-600">
              <ChevronLeft size={24} />
            </Link>
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {customer?.short_name || "—"} 的銷貨記錄
              </h1>
              <p className="text-base text-gray-400">
                {customer?.full_name || customer?.short_name || ""}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-400 text-xl">載入中...</div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-xl">此客戶尚無銷貨記錄</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 w-10">序</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">銷貨單號</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">銷貨日期</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">發票聯式</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">發票號碼</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">運送方式</th>
                  <th className="px-4 py-3 text-right text-base font-semibold text-gray-600">總金額</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">備註</th>
                  <th className="px-4 py-3 text-center text-base font-semibold text-gray-600">明細</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={o.id} className="border-b border-gray-100 hover:bg-orange-50 transition-colors">
                    <td className="px-4 py-3 text-base text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 text-base font-medium text-orange-600">{o.order_no}</td>
                    <td className="px-4 py-3 text-base text-gray-600">{o.order_date}</td>
                    <td className="px-4 py-3 text-base text-gray-600">{o.invoice_type || "—"}</td>
                    <td className="px-4 py-3 text-base text-gray-600">{o.invoice_no || "—"}</td>
                    <td className="px-4 py-3 text-base text-gray-600">{o.shipping_method || "—"}</td>
                    <td className="px-4 py-3 text-base text-right font-semibold text-gray-800">
                      ${(o.total_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-base text-gray-500 max-w-[200px] truncate">{o.notes || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/sales/${o.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                      >
                        <Eye size={14} /> 查看
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && orders.length > 0 && (
          <p className="mt-3 text-base text-gray-400">共 {orders.length} 筆銷貨單</p>
        )}
      </main>
    </div>
  )
}
