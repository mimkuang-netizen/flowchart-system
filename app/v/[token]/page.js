"use client"

/**
 * 公開分享頁 — 客戶看到的就是這個 URL: /v/<token>
 *
 * 不需登入，靠 token 取資料。
 * 故意不顯示「冠毅進銷存」、編輯連結、後台 breadcrumb 等等
 * 讓客戶無法回推系統結構。
 */
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Printer, Download } from "lucide-react"

export default function PublicShareView() {
  const { token } = useParams()
  const [type, setType] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetch(`/api/share-resource/${token}`)
      .then(async r => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({}))
          throw new Error(e.error || "連結無效")
        }
        return r.json()
      })
      .then(({ type, data }) => { setType(type); setData(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [token])

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      const { toPng } = await import("html-to-image")
      const { jsPDF } = await import("jspdf")
      const el = document.getElementById("share-print-content")
      const A4_W_PX = 794
      const orig = el.style.cssText
      el.style.width = `${A4_W_PX}px`
      el.style.maxWidth = `${A4_W_PX}px`
      el.style.minHeight = "auto"
      el.style.margin = "0"
      el.style.padding = "24px"
      el.style.boxSizing = "border-box"
      const imgData = await toPng(el, { quality: 1, pixelRatio: 2, backgroundColor: "#ffffff",
        width: A4_W_PX, height: el.scrollHeight })
      el.style.cssText = orig
      const img = new Image()
      img.src = imgData
      await new Promise(r => { img.onload = r })
      const pdf = new jsPDF("p", "mm", "a4")
      const pageW = 210, pageH = 297
      const imgH = (img.height / img.width) * pageW
      if (imgH <= pageH) {
        pdf.addImage(imgData, "PNG", 0, 0, pageW, imgH)
      } else {
        let yOff = 0, remaining = imgH
        while (remaining > 0) {
          pdf.addImage(imgData, "PNG", 0, -yOff, pageW, imgH)
          remaining -= pageH; yOff += pageH
          if (remaining > 0) pdf.addPage()
        }
      }
      const docNo = type === 'quotation' ? data.quote_no : data.order_no
      pdf.save(`${docNo}.pdf`)
    } catch (e) {
      console.error(e); alert("下載失敗：" + e.message)
    }
    setDownloading(false)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-xl text-gray-400">載入中...</div>
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <p className="text-2xl text-red-500 font-bold">{error}</p>
      <p className="text-gray-500">請聯絡業務取得新連結</p>
    </div>
  )

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { font-family: "Microsoft JhengHei", "PingFang TC", sans-serif; background: #f3f4f6; }
      `}</style>

      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 shadow-lg">
          <Printer size={18} /> 列印
        </button>
        <button onClick={handleDownloadPDF} disabled={downloading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 shadow-lg disabled:opacity-50">
          <Download size={18} /> {downloading ? "下載中..." : "下載 PDF"}
        </button>
      </div>

      {type === 'quotation' ? <QuotationView data={data} /> : <SalesView data={data} />}
    </>
  )
}

// ====== 報價單顯示 ======
function QuotationView({ data }) {
  const items = (data.quotation_items || []).sort((a, b) => a.sort_order - b.sort_order)
  const fmt = (d) => d ? new Date(d).toLocaleDateString("zh-TW") : "—"
  const money = (n) => Number(n || 0).toLocaleString()

  return (
    <div id="share-print-content" className="max-w-[210mm] mx-auto bg-white p-8 my-4" style={{ fontSize: "13px", lineHeight: 1.6 }}>
      <div className="flex justify-between items-start mb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-wider">冠毅國際有限公司</h1>
          <div className="mt-1 text-sm text-gray-600 space-y-0.5">
            <p>電　話：06-3841619</p>
            <p>傳　真：06-3841026</p>
            <p>地　址：709台南市安南區工業三路85號</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <h2 className="text-3xl font-bold tracking-widest text-gray-800">報價單</h2>
          <p className="text-sm text-gray-400 mt-1">頁次：1/1</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="mt-2" style={{ height: "50px", objectFit: "contain" }} />
        </div>
      </div>
      <hr className="border-t-2 border-gray-800 my-3" />
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4 text-sm">
        <div className="flex"><span className="text-gray-500 w-20 shrink-0">客戶名稱：</span><span className="font-semibold">{data.customer_name}</span></div>
        <div className="flex"><span className="text-gray-500 w-20 shrink-0">報價單號：</span><span className="font-mono">{data.quote_no}</span></div>
        <div className="flex"><span className="text-gray-500 w-20 shrink-0">業　　務：</span><span>{data.sales_person || "劉冠儀"}</span></div>
        <div className="flex"><span className="text-gray-500 w-20 shrink-0">報價日期：</span><span>{fmt(data.quote_date)}</span></div>
        <div className="flex"><span className="text-gray-500 w-20 shrink-0">有效日期：</span><span>{fmt(data.valid_until)}</span></div>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead><tr className="bg-gray-100">
          <th className="border border-gray-300 px-2 py-1.5 text-left w-24">品號</th>
          <th className="border border-gray-300 px-2 py-1.5 text-left">品名/商品描述</th>
          <th className="border border-gray-300 px-2 py-1.5 text-center w-12">單位</th>
          <th className="border border-gray-300 px-2 py-1.5 text-right w-14">數量</th>
          <th className="border border-gray-300 px-2 py-1.5 text-right w-24">單價</th>
          <th className="border border-gray-300 px-2 py-1.5 text-right w-24">金額</th>
          <th className="border border-gray-300 px-2 py-1.5 text-left w-28">備註</th>
        </tr></thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className={i % 2 ? "bg-gray-50" : ""}>
              <td className="border border-gray-300 px-2 py-1.5 font-mono text-gray-600">{it.product_code}</td>
              <td className="border border-gray-300 px-2 py-1.5">{it.product_name}</td>
              <td className="border border-gray-300 px-2 py-1.5 text-center">{it.unit}</td>
              <td className="border border-gray-300 px-2 py-1.5 text-right">{Number(it.quantity).toLocaleString()}</td>
              <td className="border border-gray-300 px-2 py-1.5 text-right">{money(it.unit_price)}</td>
              <td className="border border-gray-300 px-2 py-1.5 text-right">{money(it.amount)}</td>
              <td className="border border-gray-300 px-2 py-1.5 text-gray-500">{it.remark || ""}</td>
            </tr>
          ))}
          {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
            <tr key={`e${i}`}>{Array(7).fill(null).map((_, j) => <td key={j} className="border border-gray-300 px-2 py-1.5">&nbsp;</td>)}</tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-between mt-1">
        <div className="flex-1 border border-gray-300 px-3 py-2 text-sm">
          <span className="text-gray-500">備註：</span><span>{data.notes || ""}</span>
        </div>
        <div className="w-52 border border-gray-300 border-l-0">
          <div className="flex justify-between px-3 py-1 border-b border-gray-200"><span className="text-gray-500">合計金額</span><span className="font-semibold">{money(data.subtotal)}</span></div>
          <div className="flex justify-between px-3 py-1 border-b border-gray-200"><span className="text-gray-500">稅　額</span><span className="font-semibold">{money(data.tax_amount)}</span></div>
          <div className="flex justify-between px-3 py-1.5 bg-gray-50 font-bold"><span>總金額</span><span className="text-orange-600">{money(data.total)}</span></div>
        </div>
      </div>
      <div className="mt-4 border border-gray-300 px-4 py-3 text-sm">
        <p className="font-bold mb-1">條款及細則：</p>
        {data.payment_deadline && <p>1. 付款期限：{data.payment_deadline}</p>}
        {data.payment_method && <p>2. 付款條件：{data.payment_method}。</p>}
        {data.bank_info && <p>（{data.bank_info}）</p>}
        {data.account_name && <p>戶名：{data.account_name}</p>}
        {data.account_number && <p>帳號：{data.account_number}</p>}
      </div>
      <div className="flex justify-between mt-8 text-sm">
        <p className="text-gray-500">確認採購請蓋章/回簽</p>
        <p className="text-gray-500 font-semibold">感謝惠顧！</p>
      </div>
    </div>
  )
}

// ====== 銷貨單顯示 (簡化版，A4 直印) ======
function SalesView({ data }) {
  const items = (data.sales_order_items || []).sort((a, b) => a.sort_order - b.sort_order)
  const money = (n) => Number(n || 0).toLocaleString()
  return (
    <div id="share-print-content" className="max-w-[210mm] mx-auto bg-white p-8 my-4" style={{ fontSize: "13px", lineHeight: 1.6 }}>
      <div className="flex justify-between items-start mb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-wider">冠毅國際有限公司</h1>
          <div className="mt-1 text-sm text-gray-600 space-y-0.5">
            <p>電　話：06-3841619</p>
            <p>傳　真：06-3841026</p>
            <p>地　址：709台南市安南區工業三路85號</p>
          </div>
        </div>
        <h2 className="text-3xl font-bold tracking-widest text-gray-800">銷貨單</h2>
      </div>
      <hr className="border-t-2 border-gray-800 my-3" />
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4 text-sm">
        <div className="flex"><span className="text-gray-500 w-20 shrink-0">客戶名稱：</span><span className="font-semibold">{data.customer_name}</span></div>
        <div className="flex"><span className="text-gray-500 w-20 shrink-0">銷貨單號：</span><span className="font-mono">{data.order_no}</span></div>
        <div className="flex"><span className="text-gray-500 w-20 shrink-0">公司名稱：</span><span>{data.ship_to_name || "—"}</span></div>
        <div className="flex"><span className="text-gray-500 w-20 shrink-0">銷貨日期：</span><span>{data.order_date}</span></div>
        <div className="flex"><span className="text-gray-500 w-20 shrink-0">統一編號：</span><span>{data.ship_to_tax_id || "—"}</span></div>
        <div className="flex"><span className="text-gray-500 w-20 shrink-0">聯絡電話：</span><span>{data.ship_to_phone || "—"}</span></div>
        <div className="flex col-span-2"><span className="text-gray-500 w-20 shrink-0">送貨地址：</span><span>{data.ship_to_address || "—"}</span></div>
        {data.delivery_method && <div className="flex"><span className="text-gray-500 w-20 shrink-0">配送方式：</span><span>{data.delivery_method}</span></div>}
      </div>
      <table className="w-full border-collapse text-sm">
        <thead><tr className="bg-gray-100">
          <th className="border border-gray-300 px-2 py-1.5 text-left w-24">品號</th>
          <th className="border border-gray-300 px-2 py-1.5 text-left">品名</th>
          <th className="border border-gray-300 px-2 py-1.5 text-center w-12">單位</th>
          <th className="border border-gray-300 px-2 py-1.5 text-right w-14">數量</th>
          <th className="border border-gray-300 px-2 py-1.5 text-right w-24">單價</th>
          <th className="border border-gray-300 px-2 py-1.5 text-right w-24">金額</th>
        </tr></thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className={i % 2 ? "bg-gray-50" : ""}>
              <td className="border border-gray-300 px-2 py-1.5 font-mono text-gray-600">{it.product_code}</td>
              <td className="border border-gray-300 px-2 py-1.5">{it.product_name}</td>
              <td className="border border-gray-300 px-2 py-1.5 text-center">{it.unit}</td>
              <td className="border border-gray-300 px-2 py-1.5 text-right">{Number(it.quantity).toLocaleString()}</td>
              <td className="border border-gray-300 px-2 py-1.5 text-right">{money(it.unit_price)}</td>
              <td className="border border-gray-300 px-2 py-1.5 text-right">{money(it.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-between mt-1">
        <div className="flex-1 border border-gray-300 px-3 py-2 text-sm">
          <span className="text-gray-500">備註：</span><span>{data.notes || ""}</span>
        </div>
        <div className="w-52 border border-gray-300 border-l-0">
          <div className="flex justify-between px-3 py-1 border-b border-gray-200"><span className="text-gray-500">合計金額</span><span className="font-semibold">{money(data.subtotal)}</span></div>
          <div className="flex justify-between px-3 py-1 border-b border-gray-200"><span className="text-gray-500">稅　額</span><span className="font-semibold">{money(data.tax_amount)}</span></div>
          <div className="flex justify-between px-3 py-1.5 bg-gray-50 font-bold"><span>總金額</span><span className="text-red-600">{money(data.total)}</span></div>
        </div>
      </div>
      <div className="flex justify-between mt-8 text-sm">
        <p className="text-gray-500">業務員：劉冠儀</p>
        <p className="text-gray-500">客戶簽收：＿＿＿＿＿＿＿</p>
      </div>
    </div>
  )
}
