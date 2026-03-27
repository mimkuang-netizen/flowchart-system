"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, FileCheck, Search, ExternalLink, Plus, Trash2 } from "lucide-react"

export default function InvoiceHelperPage() {
  const [invoices, setInvoices] = useState([])
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchInvoice = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/invoice-lookup?url=${encodeURIComponent(url.trim())}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setInvoices(prev => [data, ...prev])
        setUrl("")
      }
    } catch {
      setError("讀取發票失敗，請確認連結是否正確")
    }
    setLoading(false)
  }

  const removeInvoice = (i) => setInvoices(prev => prev.filter((_, idx) => idx !== i))

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
          <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
            <FileCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">電子發票助手</h1>
            <p className="text-base text-gray-400">快速查詢與管理電子發票</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* 查詢區 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-4">查詢電子發票</h2>
          <div className="flex gap-3">
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchInvoice()}
              placeholder="貼上 Giveme 電子發票連結..."
              className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={fetchInvoice}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-purple-500 text-white text-lg font-semibold rounded-xl hover:bg-purple-600 disabled:opacity-50"
            >
              <Search size={20} /> {loading ? "查詢中..." : "讀取發票"}
            </button>
          </div>
          {error && <p className="mt-3 text-red-600 text-base">{error}</p>}
          <p className="mt-3 text-sm text-gray-400">
            支援 Giveme 電子發票加值中心連結（giveme.com.tw）
          </p>
        </section>

        {/* 發票列表 */}
        {invoices.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-700">已查詢的發票 ({invoices.length})</h2>
            </div>
            <table className="w-full text-base">
              <thead className="bg-gray-50">
                <tr>
                  {["發票號碼", "開立日期", "賣方", "買方統編", "金額", "載具", "連結", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-purple-50/30">
                    <td className="px-4 py-3 font-mono font-semibold text-purple-600">{inv.invoice_no || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.invoice_date || "—"}</td>
                    <td className="px-4 py-3">{inv.seller_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.buyer_tax_id || "—"}</td>
                    <td className="px-4 py-3 font-semibold">${Number(inv.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{inv.carrier || "—"}</td>
                    <td className="px-4 py-3">
                      {inv.url && (
                        <a href={inv.url} target="_blank" rel="noopener noreferrer"
                          className="text-purple-500 hover:text-purple-700">
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => removeInvoice(i)} className="text-gray-300 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* 使用說明 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-4">使用說明</h2>
          <div className="space-y-3 text-base text-gray-600">
            <p>1. 到 Giveme 電子發票加值中心查詢發票</p>
            <p>2. 複製發票查詢頁面的網址</p>
            <p>3. 貼上到上方輸入框，點擊「讀取發票」</p>
            <p>4. 系統會自動解析發票號碼、日期、金額等資訊</p>
            <p>5. 也可以在銷貨單的「發票資訊」區塊直接貼入連結</p>
          </div>
        </section>
      </main>
    </div>
  )
}
