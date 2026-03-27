"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Printer, X } from "lucide-react"

export default function SalesPrintPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/sales/${id}`)
      .then(r => r.json())
      .then(async data => {
        const { sales_order_items, ...header } = data
        setOrder(header)
        setItems(sales_order_items?.sort((a, b) => a.sort_order - b.sort_order) || [])
        // Fetch customer info for address & phone
        if (header.customer_name) {
          try {
            const cr = await fetch(`/api/customers?q=${encodeURIComponent(header.customer_name)}`)
            const customers = await cr.json()
            if (customers.length > 0) {
              const match = customers.find(c => c.short_name === header.customer_name) || customers[0]
              setCustomer(match)
            }
          } catch {}
        }
        setLoading(false)
      })
  }, [id])

  if (loading) return <div className="flex items-center justify-center min-h-screen text-xl text-gray-400">載入中...</div>
  if (!order) return <div className="flex items-center justify-center min-h-screen text-xl text-red-500">找不到銷貨單</div>

  const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
  const taxAmount = order.tax_amount || Math.round(subtotal * 0.05)
  const total = order.total || subtotal + taxAmount

  const SlipContent = ({ copy }) => (
    <div className="slip-half border border-gray-400 px-4 py-2 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="MASTER MIRROR" className="h-8 object-contain" />
          <div className="text-[11px] leading-snug">
            <div className="font-bold text-[13px]">冠毅國際有限公司</div>
            <div>電話：06-3841619　傳真：06-3841026</div>
            <div>地址：709台南市安南區工業三路85號</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-[15px]">銷貨單</div>
          <div className="text-gray-500 text-[9px]">{copy}</div>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-x-6 text-[10.5px] leading-normal mb-1">
        <div>銷貨單號：<b>{order.order_no}</b></div>
        <div>銷貨日期：{order.order_date}</div>
        <div>客戶名稱：<b>{order.customer_name}</b></div>
        <div>聯絡電話：{customer?.phone || customer?.mobile || "—"}</div>
        <div>送貨地址：{customer?.address || "—"}</div>
        <div>{order.invoice_no ? `發票號碼：${order.invoice_no}` : ""}</div>
        {order.invoice_type && <div>發票聯式：{order.invoice_type}</div>}
      </div>

      {/* Items table */}
      <table className="w-full border-collapse text-[10px] flex-1">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-1 py-[2px] text-left w-[52px]">品號</th>
            <th className="border border-gray-300 px-1 py-[2px] text-left">品名/商品描述</th>
            <th className="border border-gray-300 px-1 py-[2px] w-[28px] text-center">單位</th>
            <th className="border border-gray-300 px-1 py-[2px] text-right w-[36px]">數量</th>
            <th className="border border-gray-300 px-1 py-[2px] text-right w-[50px]">單價</th>
            <th className="border border-gray-300 px-1 py-[2px] text-right w-[50px]">金額</th>
            <th className="border border-gray-300 px-1 py-[2px] w-[60px]">備註</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td className="border border-gray-300 px-1 py-[1px]">{item.product_code}</td>
              <td className="border border-gray-300 px-1 py-[1px]">{item.product_name}</td>
              <td className="border border-gray-300 px-1 py-[1px] text-center">{item.unit}</td>
              <td className="border border-gray-300 px-1 py-[1px] text-right">{Number(item.quantity).toLocaleString()}</td>
              <td className="border border-gray-300 px-1 py-[1px] text-right">{Number(item.unit_price).toLocaleString()}</td>
              <td className="border border-gray-300 px-1 py-[1px] text-right">{Number(item.amount).toLocaleString()}</td>
              <td className="border border-gray-300 px-1 py-[1px]">{item.remark || ""}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 8 - items.length) }).map((_, i) => (
            <tr key={`e-${i}`}>
              <td className="border border-gray-300 px-1 py-[1px]">&nbsp;</td>
              <td className="border border-gray-300 px-1 py-[1px]"></td>
              <td className="border border-gray-300 px-1 py-[1px]"></td>
              <td className="border border-gray-300 px-1 py-[1px]"></td>
              <td className="border border-gray-300 px-1 py-[1px]"></td>
              <td className="border border-gray-300 px-1 py-[1px]"></td>
              <td className="border border-gray-300 px-1 py-[1px]"></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="flex justify-between items-end mt-1">
        <div className="text-[9px] max-w-[55%] leading-tight">
          {order.notes && <div><b>備註：</b>{order.notes}</div>}
        </div>
        <div className="text-right text-[10.5px]">
          <div className="flex justify-between gap-3"><span>合計金額</span><span>{subtotal.toLocaleString()}</span></div>
          <div className="flex justify-between gap-3"><span>稅　　額</span><span>{taxAmount.toLocaleString()}</span></div>
          <div className="flex justify-between gap-3 font-bold text-[12px] border-t border-gray-400 pt-[1px] mt-[1px]">
            <span>總金額</span><span className="text-red-600">{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-1 pt-1 border-t border-gray-300 text-[9px] text-gray-500">
        <div>業務員：劉冠儀</div>
        <div>客戶簽收：＿＿＿＿＿＿＿</div>
      </div>
    </div>
  )

  return (
    <>
      {/* Print controls */}
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

      {/* Print area - 中一刀三聯單 (21.49cm × 14cm) */}
      <div className="print-page bg-white p-4 mx-auto" style={{ width: '21.49cm', minHeight: '14cm' }}>
        <SlipContent copy="銷貨單" />
      </div>

      <style jsx global>{`
        @media print {
          @page { size: 21.49cm 14cm; margin: 3mm; }
          body { margin: 0; padding: 0; }
          .print-page { width: 100% !important; min-height: auto !important; padding: 2mm !important; }
        }
        .slip-half { height: auto; }
      `}</style>
    </>
  )
}
