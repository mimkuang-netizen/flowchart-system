"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Printer, X } from "lucide-react"

export default function SalesPrintPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/sales/${id}`)
      .then(r => r.json())
      .then(data => {
        const { sales_order_items, ...header } = data
        setOrder(header)
        setItems(sales_order_items?.sort((a, b) => a.sort_order - b.sort_order) || [])
        setLoading(false)
      })
  }, [id])

  if (loading) return <div className="flex items-center justify-center min-h-screen text-xl text-gray-400">載入中...</div>
  if (!order) return <div className="flex items-center justify-center min-h-screen text-xl text-red-500">找不到銷貨單</div>

  const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
  const taxAmount = order.tax_amount || Math.round(subtotal * 0.05)
  const total = order.total || subtotal + taxAmount

  // Render one copy of the sales slip
  const SlipContent = ({ copy }) => (
    <div className="w-[48%] text-[11px] leading-tight border border-gray-400 p-3 flex flex-col" style={{ minHeight: '100%' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="MASTER MIRROR" className="h-10 object-contain" />
          <div>
            <div className="font-bold text-sm">冠毅國際有限公司</div>
            <div>電話：06-3841619　傳真：06-3841026</div>
            <div>地址：709台南市安南區工業三路85號</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-base">銷貨單</div>
          <div className="text-gray-500 text-[10px]">{copy}</div>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mb-2 text-[11px]">
        <div>銷貨單號：<span className="font-semibold">{order.order_no}</span></div>
        <div>銷貨日期：{order.order_date}</div>
        <div>客戶名稱：<span className="font-semibold">{order.customer_name}</span></div>
        <div>出貨日期：{order.delivery_date || "—"}</div>
        {order.invoice_no && <div>發票號碼：{order.invoice_no}</div>}
        {order.invoice_type && <div>發票聯式：{order.invoice_type}</div>}
      </div>

      {/* Items table */}
      <table className="w-full border-collapse text-[10.5px] mb-2 flex-1">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-1 py-0.5 text-left w-16">品號</th>
            <th className="border border-gray-300 px-1 py-0.5 text-left">品名/商品描述</th>
            <th className="border border-gray-300 px-1 py-0.5 w-8">單位</th>
            <th className="border border-gray-300 px-1 py-0.5 text-right w-10">數量</th>
            <th className="border border-gray-300 px-1 py-0.5 text-right w-16">單價</th>
            <th className="border border-gray-300 px-1 py-0.5 text-right w-16">金額</th>
            <th className="border border-gray-300 px-1 py-0.5 w-20">備註</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td className="border border-gray-300 px-1 py-0.5">{item.product_code}</td>
              <td className="border border-gray-300 px-1 py-0.5">{item.product_name}</td>
              <td className="border border-gray-300 px-1 py-0.5 text-center">{item.unit}</td>
              <td className="border border-gray-300 px-1 py-0.5 text-right">{Number(item.quantity).toLocaleString()}</td>
              <td className="border border-gray-300 px-1 py-0.5 text-right">{Number(item.unit_price).toLocaleString()}</td>
              <td className="border border-gray-300 px-1 py-0.5 text-right">{Number(item.amount).toLocaleString()}</td>
              <td className="border border-gray-300 px-1 py-0.5">{item.remark || ""}</td>
            </tr>
          ))}
          {/* Empty rows to fill space */}
          {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td className="border border-gray-300 px-1 py-1.5">&nbsp;</td>
              <td className="border border-gray-300 px-1 py-1.5"></td>
              <td className="border border-gray-300 px-1 py-1.5"></td>
              <td className="border border-gray-300 px-1 py-1.5"></td>
              <td className="border border-gray-300 px-1 py-1.5"></td>
              <td className="border border-gray-300 px-1 py-1.5"></td>
              <td className="border border-gray-300 px-1 py-1.5"></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="flex justify-between items-end mt-auto">
        <div className="text-[10px] max-w-[55%]">
          {order.notes && <div className="mb-1"><span className="font-semibold">備註：</span>{order.notes}</div>}
        </div>
        <div className="text-right text-[11px]">
          <div className="flex justify-between gap-4"><span>合計金額</span><span>{subtotal.toLocaleString()}</span></div>
          <div className="flex justify-between gap-4"><span>稅　　額</span><span>{taxAmount.toLocaleString()}</span></div>
          <div className="flex justify-between gap-4 font-bold text-sm border-t border-gray-400 pt-0.5 mt-0.5">
            <span>總金額</span><span className="text-red-600">{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-2 pt-1 border-t border-gray-300 text-[10px] text-gray-500">
        <div>業務員：劉冠儀</div>
        <div>客戶簽收：＿＿＿＿＿＿＿</div>
      </div>
    </div>
  )

  return (
    <>
      {/* Print controls - hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-3">
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white text-lg font-bold rounded-xl hover:bg-red-600 shadow-lg">
          <Printer size={18} /> 列印
        </button>
        <Link href={`/sales/${id}`}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-300 text-lg font-bold rounded-xl hover:bg-gray-50 shadow-lg">
          <X size={18} /> 關閉
        </Link>
      </div>

      {/* Print area - A4 landscape, 中一刀 (split left/right) */}
      <div className="print-page bg-white flex justify-between p-4 gap-4" style={{ width: '297mm', minHeight: '210mm', margin: '0 auto' }}>
        <SlipContent copy="公司留存聯" />
        <SlipContent copy="客戶簽收聯" />
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 5mm; }
          body { margin: 0; padding: 0; }
          .print-page { width: 100% !important; min-height: 100vh !important; padding: 3mm !important; }
        }
      `}</style>
    </>
  )
}
