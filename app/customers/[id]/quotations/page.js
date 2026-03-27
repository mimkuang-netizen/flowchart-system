"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { ChevronLeft, FileText, Eye } from "lucide-react"

export default function CustomerQuotationsPage({ params }) {
  const { id } = use(params)
  const [customer, setCustomer] = useState(null)
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      // Get customer info
      const cRes = await fetch(`/api/customers/${id}`)
      const cData = await cRes.json()
      setCustomer(cData)

      // Get quotations for this customer
      const qRes = await fetch(`/api/quotation?customer=${encodeURIComponent(cData.short_name)}`)
      const qData = await qRes.json()
      setQuotations(Array.isArray(qData) ? qData : [])
      setLoading(false)
    }
    load()
  }, [id])

  const statusColor = (s) => {
    switch (s) {
      case "已送出": return "bg-blue-100 text-blue-700"
      case "已成交": return "bg-green-100 text-green-700"
      case "已失效": return "bg-gray-100 text-gray-500"
      default: return "bg-yellow-100 text-yellow-700"
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/customers" className="text-gray-400 hover:text-gray-600">
              <ChevronLeft size={24} />
            </Link>
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {customer?.short_name || "—"} 的報價記錄
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
          ) : quotations.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-xl">此客戶尚無報價記錄</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 w-10">序</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">報價單號</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">報價日期</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">有效日期</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">狀態</th>
                  <th className="px-4 py-3 text-right text-base font-semibold text-gray-600">總金額</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">備註</th>
                  <th className="px-4 py-3 text-center text-base font-semibold text-gray-600">明細</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q, i) => (
                  <tr key={q.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 text-base text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 text-base font-medium text-blue-600">{q.quote_no}</td>
                    <td className="px-4 py-3 text-base text-gray-600">{q.quote_date}</td>
                    <td className="px-4 py-3 text-base text-gray-600">{q.valid_date || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-sm font-semibold ${statusColor(q.status)}`}>
                        {q.status || "草稿"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-base text-right font-semibold text-gray-800">
                      ${(q.total_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-base text-gray-500 max-w-[200px] truncate">{q.notes || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/quotation/${q.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
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
        {!loading && quotations.length > 0 && (
          <p className="mt-3 text-base text-gray-400">共 {quotations.length} 筆報價單</p>
        )}
      </main>
    </div>
  )
}
