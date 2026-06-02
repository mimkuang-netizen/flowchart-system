"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Printer, Download, Link2, Check } from "lucide-react"

export default function QuotationPrint() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [shareUrl, setShareUrl] = useState("")  // 頁面載入時就先取好 token，避免按按鈕當下因失焦失敗
  const action = searchParams.get("action")

  // Pre-fetch share token (頁面 mount 時跑一次)
  useEffect(() => {
    if (!id) return
    fetch("/api/share-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "quotation", id }),
    })
      .then(r => r.json())
      .then(j => {
        if (j.token) {
          // 優先用 server 回傳的 base_url (從環境變數 SHARE_BASE_URL 來)
          // 沒設定才 fallback 用 window.location.origin
          const base = j.base_url || window.location.origin
          setShareUrl(`${base}/v/${j.token}`)
        }
      })
      .catch(() => {})
  }, [id])

  const copyToClipboard = async (text) => {
    // 多重備援：modern API → execCommand fallback
    try {
      if (navigator.clipboard && document.hasFocus()) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch {}
    // Fallback: 用 textarea + execCommand (相容性最高)
    try {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      const ok = document.execCommand("copy")
      document.body.removeChild(ta)
      return ok
    } catch { return false }
  }

  const handleCopyLink = async () => {
    let url = shareUrl
    if (!url) {
      // token 還沒到 (網路慢)，現場拿
      try {
        const res = await fetch("/api/share-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "quotation", id }),
        })
        const j = await res.json()
        if (!j.token) throw new Error(j.error || "產生連結失敗")
        const base = j.base_url || window.location.origin
        url = `${base}/v/${j.token}`
        setShareUrl(url)
      } catch (e) { alert("產生連結失敗：" + e.message); return }
    }
    window.focus()  // 嘗試把焦點拉回來
    const ok = await copyToClipboard(url)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      // 最後保險：用 prompt 讓使用者手動複製
      prompt("自動複製失敗，請手動複製：", url)
    }
  }

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      const { toPng } = await import("html-to-image")
      const { jsPDF } = await import("jspdf")
      const el = document.getElementById("print-content")
      // 強制 A4 寬度與置左排版（避免 mx-auto 在較寬視窗造成位移）
      const A4_W_PX = 794      // ≈ 210mm @ 96dpi
      const origStyle = el.style.cssText
      el.style.width = `${A4_W_PX}px`
      el.style.maxWidth = `${A4_W_PX}px`
      el.style.minHeight = "auto"
      el.style.margin = "0"
      el.style.padding = "24px"
      el.style.boxSizing = "border-box"

      const imgData = await toPng(el, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: A4_W_PX,                 // 強制畫布寬度
        height: el.scrollHeight,        // 用實際內容高度
        filter: (node) => !node?.classList?.contains("print:hidden"),
      })
      el.style.cssText = origStyle

      const img = new Image()
      img.src = imgData
      await new Promise(r => { img.onload = r })

      // 用標準 A4 portrait，內容超出時自動分頁
      const pdf = new jsPDF("p", "mm", "a4")
      const pageW = 210
      const pageH = 297
      const imgW = pageW
      const imgH = (img.height / img.width) * imgW

      if (imgH <= pageH) {
        pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH)
      } else {
        // 多頁：用 addImage 的 yOffset 把圖往上拉，每次顯示一頁高度
        let remaining = imgH
        let yOffset = 0
        while (remaining > 0) {
          pdf.addImage(imgData, "PNG", 0, -yOffset, imgW, imgH)
          remaining -= pageH
          yOffset += pageH
          if (remaining > 0) pdf.addPage()
        }
      }

      pdf.save(`報價單_${data.quote_no || id}.pdf`)
    } catch (e) {
      console.error("PDF download failed:", e)
      alert("PDF 下載失敗：" + e.message)
    }
    setDownloading(false)
  }

  useEffect(() => {
    fetch(`/api/quotation/${id}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        // If action=download, auto trigger PDF download after load
        if (action === "download") {
          setTimeout(() => handleDownloadPDF(), 800)
        }
      })
      .catch(() => setError("載入失敗"))
  }, [id])

  if (error) return <div className="p-10 text-red-500 text-xl">{error}</div>
  if (!data) return <div className="p-10 text-gray-400 text-xl">載入中...</div>

  const items = (data.quotation_items || []).sort((a, b) => a.sort_order - b.sort_order)
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("zh-TW") : "—"
  const formatMoney = (n) => Number(n || 0).toLocaleString()

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { font-family: "Microsoft JhengHei", "PingFang TC", sans-serif; }
      `}</style>

      {/* 工具列（列印時隱藏）*/}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 shadow-lg">
          <Printer size={18} /> 列印
        </button>
        <button onClick={handleDownloadPDF} disabled={downloading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 shadow-lg disabled:opacity-50">
          <Download size={18} /> {downloading ? "下載中..." : "下載 PDF"}
        </button>
        <button onClick={handleCopyLink}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 shadow-lg">
          {copied ? <Check size={18} /> : <Link2 size={18} />} {copied ? "已複製連結" : "複製連結"}
        </button>
        <button onClick={() => window.close()}
          className="px-5 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 shadow-lg">
          ✕ 關閉
        </button>
      </div>

      <div id="print-content" className="max-w-[210mm] mx-auto bg-white p-8" style={{ fontSize: "13px", lineHeight: "1.6" }}>
        {/* ====== 公司表頭 ====== */}
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
            <img src="/logo.png" alt="Master Mirror" className="mt-2" style={{ height: "50px", objectFit: "contain" }} />
          </div>
        </div>

        <hr className="border-t-2 border-gray-800 my-3" />

        {/* ====== 客戶 & 報價資訊 ====== */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4 text-sm">
          <div className="flex">
            <span className="text-gray-500 w-20 shrink-0">客戶名稱：</span>
            <span className="font-semibold">{data.customer_name}</span>
          </div>
          <div className="flex">
            <span className="text-gray-500 w-20 shrink-0">報價單號：</span>
            <span className="font-mono">{data.quote_no}</span>
          </div>
          <div className="flex">
            <span className="text-gray-500 w-20 shrink-0">聯 絡 人：</span>
            <span>{data.contact_person || "—"}</span>
          </div>
          <div className="flex">
            <span className="text-gray-500 w-20 shrink-0">報價日期：</span>
            <span>{formatDate(data.quote_date)}</span>
          </div>
          <div className="flex">
            <span className="text-gray-500 w-20 shrink-0">業　　務：</span>
            <span>{data.sales_person || "劉冠儀"}</span>
          </div>
          <div className="flex">
            <span className="text-gray-500 w-20 shrink-0">有效日期：</span>
            <span>{formatDate(data.valid_until)}</span>
          </div>
        </div>

        {/* ====== 商品明細表格 ====== */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-1.5 text-left w-24">品號</th>
              <th className="border border-gray-300 px-2 py-1.5 text-left">品名/商品描述</th>
              <th className="border border-gray-300 px-2 py-1.5 text-center w-12">單位</th>
              <th className="border border-gray-300 px-2 py-1.5 text-right w-14">數量</th>
              <th className="border border-gray-300 px-2 py-1.5 text-right w-24">單價</th>
              <th className="border border-gray-300 px-2 py-1.5 text-right w-24">金額</th>
              <th className="border border-gray-300 px-2 py-1.5 text-left w-28">備註</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "" : "bg-gray-50"}>
                <td className="border border-gray-300 px-2 py-1.5 font-mono text-gray-600">{item.product_code}</td>
                <td className="border border-gray-300 px-2 py-1.5">{item.product_name}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center">{item.unit}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">{Number(item.quantity).toLocaleString()}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">{formatMoney(item.unit_price)}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">{formatMoney(item.amount)}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-gray-500">{item.remark || ""}</td>
              </tr>
            ))}
            {/* 空白行填充（讓表格看起來完整）*/}
            {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-gray-300 px-2 py-1.5">&nbsp;</td>
                <td className="border border-gray-300 px-2 py-1.5"></td>
                <td className="border border-gray-300 px-2 py-1.5"></td>
                <td className="border border-gray-300 px-2 py-1.5"></td>
                <td className="border border-gray-300 px-2 py-1.5"></td>
                <td className="border border-gray-300 px-2 py-1.5"></td>
                <td className="border border-gray-300 px-2 py-1.5"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ====== 備註 + 合計 ====== */}
        <div className="flex justify-between mt-1">
          <div className="flex-1 border border-gray-300 px-3 py-2 text-sm">
            <span className="text-gray-500">備註：</span>
            <span>{data.notes || ""}</span>
          </div>
          <div className="w-52 border border-gray-300 border-l-0">
            <div className="flex justify-between px-3 py-1 border-b border-gray-200">
              <span className="text-gray-500">合計金額</span>
              <span className="font-semibold">{formatMoney(data.subtotal)}</span>
            </div>
            <div className="flex justify-between px-3 py-1 border-b border-gray-200">
              <span className="text-gray-500">稅　額</span>
              <span className="font-semibold">{formatMoney(data.tax_amount)}</span>
            </div>
            <div className="flex justify-between px-3 py-1.5 bg-gray-50 font-bold">
              <span>總金額</span>
              <span className="text-orange-600">{formatMoney(data.total)}</span>
            </div>
          </div>
        </div>

        {/* ====== 付款方式 ====== */}
        <div className="mt-4 border border-gray-300 px-4 py-3 text-sm">
          <p className="font-bold mb-1">條款及細則：</p>
          {data.payment_deadline && <p>1. 付款期限：{data.payment_deadline}</p>}
          {data.payment_method && <p>2. 付款條件：{data.payment_method}。</p>}
          {data.bank_info && <p>（{data.bank_info}）</p>}
          {data.account_name && <p>戶名：{data.account_name}</p>}
          {data.account_number && <p>帳號：{data.account_number}</p>}
        </div>

        {/* ====== 客戶回簽 (已簽過才顯示) ====== */}
        {data.signed_at && data.signature_data && (
          <div className="mt-4 border-2 border-green-300 bg-green-50 rounded-xl p-3">
            <p className="text-sm text-green-700 font-bold mb-2">
              ✓ 客戶已於 {new Date(data.signed_at).toLocaleString("zh-TW")} 完成回簽
              {data.signer_name && ` — 簽收人：${data.signer_name}`}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.signature_data} alt="客戶簽收章" className="max-h-28 bg-white border border-gray-200 rounded" />
          </div>
        )}

        {/* ====== 底部簽章 ====== */}
        <div className="flex justify-between mt-8 text-sm">
          <p className="text-gray-500">確認採購請蓋章/回簽</p>
          <p className="text-gray-500 font-semibold">感謝惠顧！</p>
        </div>
      </div>
    </>
  )
}
