"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Printer, X, Download, Link2, Check } from "lucide-react"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"

export default function SalesPrintPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [showPrice, setShowPrice] = useState(searchParams.get("showPrice") !== "false")
  const action = searchParams.get("action")

  const handleCopyLink = () => {
    const url = `${window.location.origin}/sales/${id}/print`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      const el = document.getElementById("print-content")
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" })
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("l", "mm", [241, 140])
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = (canvas.height * pdfW) / canvas.width
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH)
      const fileName = `銷貨單_${order?.order_no || id}.pdf`
      pdf.save(fileName)
    } catch (e) {
      console.error("PDF download failed:", e)
      alert("PDF 下載失敗，請改用列印功能")
    }
    setDownloading(false)
  }

  useEffect(() => {
    fetch(`/api/sales/${id}`)
      .then(r => r.json())
      .then(async data => {
        const { sales_order_items, ...header } = data
        setOrder(header)
        setItems(sales_order_items?.sort((a, b) => a.sort_order - b.sort_order) || [])
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
        if (action === "download") {
          setTimeout(() => handleDownloadPDF(), 800)
        }
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
        <div>送貨地址：{customer ? [customer.delivery_zip, customer.delivery_city, customer.delivery_district, customer.delivery_address].filter(Boolean).join("") || "—" : "—"}</div>
        <div>{showPrice && order.invoice_no ? `發票號碼：${order.invoice_no}` : ""}</div>
        {showPrice && order.invoice_type && <div>發票聯式：{order.invoice_type}</div>}
        {order.payment_method && <div>付款方式：{{"bank_transfer":"銀行匯款","credit_card":"信用卡","line_pay":"LINE Pay","monthly":"月結（經銷商）","cash":"現金","other":"其他"}[order.payment_method] || order.payment_method}</div>}
      </div>

      {/* Items table */}
      <table className="w-full border-collapse text-[10px] flex-1">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-1 py-[2px] text-left w-[52px]">品號</th>
            <th className="border border-gray-300 px-1 py-[2px] text-left">品名/商品描述</th>
            <th className="border border-gray-300 px-1 py-[2px] w-[28px] text-center">單位</th>
            <th className="border border-gray-300 px-1 py-[2px] text-right w-[36px]">數量</th>
            {showPrice && <th className="border border-gray-300 px-1 py-[2px] text-right w-[50px]">單價</th>}
            {showPrice && <th className="border border-gray-300 px-1 py-[2px] text-right w-[50px]">金額</th>}
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
              {showPrice && <td className="border border-gray-300 px-1 py-[1px] text-right">{Number(item.unit_price).toLocaleString()}</td>}
              {showPrice && <td className="border border-gray-300 px-1 py-[1px] text-right">{Number(item.amount).toLocaleString()}</td>}
              <td className="border border-gray-300 px-1 py-[1px]">{item.remark || ""}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, Math.min(2, 8 - items.length)) }).map((_, i) => (
            <tr key={`e-${i}`}>
              <td className="border border-gray-300 px-1 py-[1px]" colSpan={showPrice ? 7 : 5}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="flex justify-between items-end mt-1">
        <div className="text-[9px] max-w-[55%] leading-tight">
          {order.notes && <div><b>備註：</b>{order.notes}</div>}
        </div>
        {showPrice && (
          <div className="text-right text-[10.5px]">
            <div className="flex justify-between gap-3"><span>合計金額</span><span>{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between gap-3"><span>稅　　額</span><span>{taxAmount.toLocaleString()}</span></div>
            <div className="flex justify-between gap-3 font-bold text-[12px] border-t border-gray-400 pt-[1px] mt-[1px]">
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
  )

  return (
    <>
      {/* Print controls */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-3 items-center">
        <label className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl shadow-lg cursor-pointer select-none text-base font-semibold text-gray-700">
          <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} className="w-4 h-4 accent-blue-600" />
          顯示單價
        </label>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white text-lg font-bold rounded-xl hover:bg-red-600 shadow-lg">
          <Printer size={18} /> 列印
        </button>
        <button onClick={handleDownloadPDF} disabled={downloading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white text-lg font-bold rounded-xl hover:bg-blue-600 shadow-lg disabled:opacity-50">
          <Download size={18} /> {downloading ? "下載中..." : "下載 PDF"}
        </button>
        <button onClick={handleCopyLink}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white text-lg font-bold rounded-xl hover:bg-green-600 shadow-lg">
          {copied ? <Check size={18} /> : <Link2 size={18} />} {copied ? "已複製連結" : "複製連結"}
        </button>
        <Link href={`/sales/${id}`}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-300 text-lg font-bold rounded-xl hover:bg-gray-50 shadow-lg">
          <X size={18} /> 關閉
        </Link>
      </div>

      {/* Print area - 中一刀三聯單 (21.49cm x 14cm) */}
      <div id="print-content" className="print-page bg-white p-4 mx-auto" style={{ width: '21.49cm', minHeight: '14cm' }}>
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
