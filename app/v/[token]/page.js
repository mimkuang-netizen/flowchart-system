"use client"

/**
 * 公開分享頁 — 客戶看到的就是這個 URL: /v/<token>
 *
 * 不需登入，靠 token 取資料。
 * 故意不顯示「冠毅進銷存」、編輯連結、後台 breadcrumb 等等
 * 讓客戶無法回推系統結構。
 */
import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Printer, Download, Eraser, Upload, Check, PenLine } from "lucide-react"

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

      <div className="no-print print:hidden fixed top-2 right-2 sm:top-4 sm:right-4 flex gap-2 z-50">
        <button onClick={() => window.print()}
          className="flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-orange-500 text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl hover:bg-orange-600 shadow-lg">
          <Printer size={16} /> 列印
        </button>
        <button onClick={handleDownloadPDF} disabled={downloading}
          className="flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-blue-500 text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl hover:bg-blue-600 shadow-lg disabled:opacity-50">
          <Download size={16} /> {downloading ? "下載中..." : "下載 PDF"}
        </button>
      </div>

      {type === 'quotation' ? <QuotationView data={data} token={token} onSigned={(updated) => setData(d => ({ ...d, ...updated }))} /> : <SalesView data={data} />}
    </>
  )
}

/* ====== 簽名 / 收發章區塊 (只用於報價單) ====== */
function SignatureSection({ token, signed_at, signature_data, signer_name, onSigned }) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)  // 用 ref 不用 state 避免 re-render
  const [hasDrawn, setHasDrawn] = useState(false)
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState("sign")

  // 只在 mount 時初始化 canvas，避免 re-render 清掉內容
  // ⚠️ Hooks 必須在任何 conditional return 之前呼叫
  useEffect(() => {
    if (signed_at) return  // 已簽不需初始化 canvas
    const cvs = canvasRef.current
    if (!cvs) return
    const setupCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = cvs.getBoundingClientRect()
      cvs.width = rect.width * dpr
      cvs.height = rect.height * dpr
      const ctx = cvs.getContext("2d")
      ctx.scale(dpr, dpr)
      ctx.strokeStyle = "#1e3a8a"
      ctx.lineWidth = 2.5
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
    }
    setupCanvas()

    // 用 native event listener + passive:false 才能 preventDefault 阻止頁面滾動
    const getXY = (e) => {
      const rect = cvs.getBoundingClientRect()
      const t = e.touches?.[0] || e
      return { x: t.clientX - rect.left, y: t.clientY - rect.top }
    }
    const onStart = (e) => {
      e.preventDefault()
      drawingRef.current = true
      const { x, y } = getXY(e)
      const ctx = cvs.getContext("2d")
      ctx.beginPath(); ctx.moveTo(x, y)
      // 點一下也算 (沒拖也算簽過了)
      ctx.lineTo(x + 0.01, y + 0.01); ctx.stroke()
      setHasDrawn(true)
    }
    const onMove = (e) => {
      if (!drawingRef.current) return
      e.preventDefault()
      const { x, y } = getXY(e)
      const ctx = cvs.getContext("2d")
      ctx.lineTo(x, y); ctx.stroke()
    }
    const onEnd = () => { drawingRef.current = false }

    cvs.addEventListener("mousedown", onStart)
    cvs.addEventListener("mousemove", onMove)
    cvs.addEventListener("mouseup", onEnd)
    cvs.addEventListener("mouseleave", onEnd)
    cvs.addEventListener("touchstart", onStart, { passive: false })
    cvs.addEventListener("touchmove", onMove, { passive: false })
    cvs.addEventListener("touchend", onEnd)
    cvs.addEventListener("touchcancel", onEnd)

    return () => {
      cvs.removeEventListener("mousedown", onStart)
      cvs.removeEventListener("mousemove", onMove)
      cvs.removeEventListener("mouseup", onEnd)
      cvs.removeEventListener("mouseleave", onEnd)
      cvs.removeEventListener("touchstart", onStart)
      cvs.removeEventListener("touchmove", onMove)
      cvs.removeEventListener("touchend", onEnd)
      cvs.removeEventListener("touchcancel", onEnd)
    }
  }, [mode, signed_at])  // mode/signed_at 變化時重設

  // 已簽 → 顯示 readonly (必須在所有 hooks 之後)
  if (signed_at) {
    return (
      <div className="mt-6 sm:mt-8 border-2 border-green-200 bg-green-50 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 text-green-700 font-bold text-sm sm:text-base">
          <Check size={20} /> 已於 {new Date(signed_at).toLocaleString("zh-TW")} 完成回簽
        </div>
        {signer_name && <p className="text-sm sm:text-base text-gray-600 mb-2">簽收人：{signer_name}</p>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {signature_data && <img src={signature_data} alt="簽收章/簽名" className="max-h-32 sm:max-h-40 bg-white border border-gray-200 rounded" />}
      </div>
    )
  }

  const clearCanvas = () => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext("2d")
    ctx.clearRect(0, 0, cvs.width, cvs.height)
    setHasDrawn(false)
  }

  const handleUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1024 * 1024) { setError("檔案需 1MB 以下"); return }
    const reader = new FileReader()
    reader.onload = () => {
      const img = new window.Image()
      img.onload = () => {
        const cvs = canvasRef.current
        const ctx = cvs.getContext("2d")
        const dpr = window.devicePixelRatio || 1
        const cwLogical = cvs.width / dpr, chLogical = cvs.height / dpr
        ctx.clearRect(0, 0, cvs.width, cvs.height)
        const ratio = Math.min(cwLogical / img.width, chLogical / img.height) * 0.9
        const w = img.width * ratio, h = img.height * ratio
        ctx.drawImage(img, (cwLogical - w) / 2, (chLogical - h) / 2, w, h)
        setHasDrawn(true)
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  }

  const submit = async () => {
    if (!hasDrawn) { setError("請先簽名或上傳印章"); return }
    setSubmitting(true); setError("")
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png")
      const res = await fetch(`/api/share-resource/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature_data: dataUrl, signer_name: name }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "送出失敗")
      onSigned({ signed_at: j.signed_at, signature_data: dataUrl, signer_name: name })
    } catch (e) {
      setError(e.message)
    } finally { setSubmitting(false) }
  }

  return (
    <div className="no-print print:hidden mt-6 sm:mt-8 border-2 border-orange-200 bg-orange-50 rounded-2xl p-4 sm:p-5">
      <h3 className="text-base sm:text-lg font-bold text-orange-700 mb-3 flex items-center gap-2">
        <PenLine size={18} /> 客戶回簽
      </h3>
      <div className="flex gap-2 mb-3">
        <button onClick={() => setMode("sign")}
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold ${mode === "sign" ? "bg-orange-500 text-white" : "bg-white border border-gray-300 text-gray-700"}`}>
          手寫簽名
        </button>
        <button onClick={() => setMode("upload")}
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold ${mode === "upload" ? "bg-orange-500 text-white" : "bg-white border border-gray-300 text-gray-700"}`}>
          上傳印章
        </button>
      </div>

      {mode === "sign" ? (
        <p className="text-xs sm:text-sm text-gray-500 mb-2">在下方白色區域用手指或滑鼠簽名</p>
      ) : (
        <div className="mb-2">
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-dashed border-orange-300 rounded-lg text-sm font-semibold text-orange-600 cursor-pointer hover:bg-orange-50">
            <Upload size={16} /> 選擇印章圖片 (PNG/JPG, 1MB 內)
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-44 sm:h-48 bg-white border-2 border-gray-300 rounded-lg cursor-crosshair select-none"
        style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none" }}
      />

      <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:gap-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="簽收人姓名 (選填)"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-base" />
        <div className="flex gap-2 justify-end">
          <button onClick={clearCanvas} className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50">
            <Eraser size={14} /> 清除
          </button>
          <button onClick={submit} disabled={submitting || !hasDrawn}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
            <Check size={14} /> {submitting ? "送出中..." : "確認簽收"}
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-gray-400">送出後即代表確認接受本報價，無法再次修改。</p>
    </div>
  )
}

// ====== 報價單顯示 ======
function QuotationView({ data, token, onSigned }) {
  const items = (data.quotation_items || []).sort((a, b) => a.sort_order - b.sort_order)
  const fmt = (d) => d ? new Date(d).toLocaleDateString("zh-TW") : "—"
  const money = (n) => Number(n || 0).toLocaleString()

  return (
    <div id="share-print-content" className="max-w-[210mm] mx-auto bg-white p-4 sm:p-8 my-2 sm:my-4 text-[13px] sm:text-[13px]" style={{ lineHeight: 1.6 }}>
      <div className="flex justify-between items-start gap-2 mb-1">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold tracking-wider">冠毅國際有限公司</h1>
          <div className="mt-1 text-[11px] sm:text-sm text-gray-600 space-y-0.5">
            <p>電　話：06-3841619</p>
            <p>傳　真：06-3841026</p>
            <p>地　址：709台南市安南區工業三路85號</p>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <h2 className="text-xl sm:text-3xl font-bold tracking-widest text-gray-800">報價單</h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">頁次：1/1</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="mt-2 h-8 sm:h-12 object-contain" />
        </div>
      </div>
      <hr className="border-t-2 border-gray-800 my-2 sm:my-3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mb-3 sm:mb-4 text-xs sm:text-sm">
        <div className="flex"><span className="text-gray-500 w-20 shrink-0">客戶名稱：</span><span className="font-semibold">{data.customer_name}</span></div>
        <div className="flex"><span className="text-gray-500 w-20 shrink-0">報價單號：</span><span className="font-mono">{data.quote_no}</span></div>
        <div className="flex"><span className="text-gray-500 w-20 shrink-0">業　　務：</span><span>{data.sales_person || "劉冠儀"}</span></div>
        <div className="flex"><span className="text-gray-500 w-20 shrink-0">報價日期：</span><span>{fmt(data.quote_date)}</span></div>
        <div className="flex"><span className="text-gray-500 w-20 shrink-0">有效日期：</span><span>{fmt(data.valid_until)}</span></div>
      </div>
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
      <table className="w-full border-collapse text-xs sm:text-sm min-w-[600px]">
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
      </div>
      <div className="flex flex-col sm:flex-row justify-between mt-1">
        <div className="flex-1 border border-gray-300 px-3 py-2 text-xs sm:text-sm">
          <span className="text-gray-500">備註：</span><span>{data.notes || ""}</span>
        </div>
        <div className="w-full sm:w-52 border border-gray-300 sm:border-l-0 text-xs sm:text-sm">
          <div className="flex justify-between px-3 py-1 border-b border-gray-200"><span className="text-gray-500">合計金額</span><span className="font-semibold">{money(data.subtotal)}</span></div>
          <div className="flex justify-between px-3 py-1 border-b border-gray-200"><span className="text-gray-500">稅　額</span><span className="font-semibold">{money(data.tax_amount)}</span></div>
          <div className="flex justify-between px-3 py-1.5 bg-gray-50 font-bold"><span>總金額</span><span className="text-orange-600">{money(data.total)}</span></div>
        </div>
      </div>
      <div className="mt-4 border border-gray-300 px-4 py-3 text-xs sm:text-sm">
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

      {/* 已簽完顯示在文件內 (列印也帶) */}
      {data.signed_at && data.signature_data && (
        <div className="mt-4 border-2 border-green-300 bg-green-50 rounded-xl p-4 print:border print:bg-white">
          <p className="text-sm text-green-700 font-bold mb-2">
            已於 {new Date(data.signed_at).toLocaleString("zh-TW")} 完成回簽
            {data.signer_name && ` — 簽收人：${data.signer_name}`}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.signature_data} alt="簽收章" className="max-h-32" />
        </div>
      )}

      {/* 簽名區塊 (沒簽過才顯示，列印時隱藏) */}
      <SignatureSection
        token={token}
        signed_at={data.signed_at}
        signature_data={data.signature_data}
        signer_name={data.signer_name}
        onSigned={onSigned}
      />
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
