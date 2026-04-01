"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Printer, X } from "lucide-react"

function BatchPrintContent() {
  const searchParams = useSearchParams()
  const ids = searchParams.get("ids")?.split(",") || []
  const showPrice = searchParams.get("showPrice") !== "false"
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ids.length === 0) { setLoading(false); return }
    Promise.all(ids.map(id => fetch(`/api/sales/${id}`).then(r => r.json())))
      .then(results => {
        setOrders(results.filter(r => r && r.order_no))
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="flex items-center justify-center min-h-screen text-xl text-gray-400">載入中...</div>
  if (orders.length === 0) return <div className="flex items-center justify-center min-h-screen text-xl text-red-500">無選取的銷貨單</div>

  return (
    <>
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-3">
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white text-lg font-bold rounded-xl hover:bg-red-600 shadow-lg">
          <Printer size={18} /> 列印 {orders.length} 張
        </button>
        <button onClick={() => window.close()}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-300 text-lg font-bold rounded-xl hover:bg-gray-50 shadow-lg">
          <X size={18} /> 關閉
        </button>
      </div>

      {orders.map((data, oi) => {
        const { sales_order_items, ...order } = data
        const items = (sales_order_items || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
        const taxAmount = order.tax_amount || Math.round(subtotal * 0.05)
        const total = order.total || subtotal + taxAmount

        return (
          <div key={order.id} className="print-page bg-white mx-auto mb-4 print:mb-0" style={{ width: '210mm', minHeight: '140mm', padding: '8mm', pageBreakAfter: 'always' }}>
            <div className="border border-gray-400 px-4 py-2 h-full flex flex-col" style={{ fontSize: '10px' }}>
              {/* Header */}
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="logo" className="h-8 object-contain" />
                  <div className="text-[11px] leading-snug">
                    <p className="font-bold text-[13px]">冠毅國際有限公司</p>
                    <p>電話：06-3841619　傳真：06-3841026</p>
                    <p>地址：709台南市安南區工業三路85號</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[16px] font-bold">銷貨單</p>
                  <p className="text-[9px] text-gray-500">{oi + 1}/{orders.length}</p>
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-x-6 text-[10.5px] leading-normal mb-1">
                <div>銷貨單號：<b>{order.order_no}</b></div>
                <div>銷貨日期：{order.order_date}</div>
                <div>客戶名稱：<b>{order.customer_name}</b></div>
                <div>{showPrice && order.invoice_no ? `發票號碼：${order.invoice_no}` : ""}</div>
              </div>

              {/* Items */}
              <table className="w-full border-collapse text-[10px] flex-1">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-1 py-[2px] text-left w-[52px]">品號</th>
                    <th className="border border-gray-300 px-1 py-[2px] text-left">品名/商品描述</th>
                    <th className="border border-gray-300 px-1 py-[2px] w-[28px] text-center">單位</th>
                    <th className="border border-gray-300 px-1 py-[2px] text-right w-[36px]">數量</th>
                    {showPrice && <th className="border border-gray-300 px-1 py-[2px] text-right w-[50px]">單價</th>}
                    {showPrice && <th className="border border-gray-300 px-1 py-[2px] text-right w-[50px]">金額</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td className="border border-gray-200 px-1 py-[1px]">{it.product_code}</td>
                      <td className="border border-gray-200 px-1 py-[1px]">{it.product_name}</td>
                      <td className="border border-gray-200 px-1 py-[1px] text-center">{it.unit}</td>
                      <td className="border border-gray-200 px-1 py-[1px] text-right">{it.quantity}</td>
                      {showPrice && <td className="border border-gray-200 px-1 py-[1px] text-right">{Number(it.unit_price).toLocaleString()}</td>}
                      {showPrice && <td className="border border-gray-200 px-1 py-[1px] text-right">{Number(it.amount).toLocaleString()}</td>}
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 8 - items.length) }).map((_, i) => (
                    <tr key={`empty-${i}`}><td className="border border-gray-200 px-1 py-[3px]" colSpan={showPrice ? 6 : 4}>&nbsp;</td></tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-between items-end mt-1">
                <div className="text-[9px] text-gray-500 max-w-[60%]">
                  {order.notes && <span>備註：{order.notes.slice(0, 80)}</span>}
                </div>
                {showPrice && (
                  <div className="text-right text-[10px] space-y-[1px]">
                    <div className="flex justify-between gap-3"><span>合計金額</span><span>{subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between gap-3"><span>稅　　額</span><span>{taxAmount.toLocaleString()}</span></div>
                    <div className="flex justify-between gap-3 font-bold border-t border-gray-400 pt-[1px]">
                      <span>總金額</span><span className="text-red-600">{total.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-1 pt-1 border-t border-gray-300 text-[9px] text-gray-500">
                <div>業務員：劉冠儀</div>
                <div>客戶簽收：＿＿＿＿＿＿＿</div>
              </div>
            </div>
          </div>
        )
      })}

      <style jsx global>{`
        @media print {
          @page { size: 21.49cm 14cm; margin: 0; }
          body { margin: 0; padding: 0; }
          .print-page { width: 100% !important; min-height: 100vh !important; margin: 0 !important; padding: 5mm !important; }
        }
      `}</style>
    </>
  )
}

export default function BatchPrintPage() {
  return <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-xl text-gray-400">載入中...</div>}><BatchPrintContent /></Suspense>
}
