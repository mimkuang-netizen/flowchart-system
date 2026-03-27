"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function QuotationPrint() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/quotation/${id}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        // 載入完成後自動觸發列印
        setTimeout(() => window.print(), 600)
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

      {/* 列印 / 關閉 按鈕（列印時隱藏）*/}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button onClick={() => window.print()}
          className="px-5 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 shadow-lg">
          🖨️ 列印
        </button>
        <button onClick={() => window.close()}
          className="px-5 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 shadow-lg">
          ✕ 關閉
        </button>
      </div>

      <div className="max-w-[210mm] mx-auto bg-white p-8" style={{ fontSize: "13px", lineHeight: "1.6" }}>
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
          <div className="text-right">
            <h2 className="text-3xl font-bold tracking-widest text-gray-800">報價單</h2>
            <p className="text-sm text-gray-400 mt-1">頁次：1/1</p>
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
            <span className="text-gray-500 w-20 shrink-0">報價日期：</span>
            <span>{formatDate(data.quote_date)}</span>
          </div>
          <div className="flex">
            <span className="text-gray-500 w-20 shrink-0">聯 絡 人：</span>
            <span>{data.contact_person || "—"}</span>
          </div>
          <div className="flex">
            <span className="text-gray-500 w-20 shrink-0">報價單號：</span>
            <span className="font-mono">{data.quote_no}</span>
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

        {/* ====== 底部簽章 ====== */}
        <div className="flex justify-between mt-8 text-sm">
          <p className="text-gray-500">確認採購請蓋章/回簽</p>
          <p className="text-gray-500 font-semibold">感謝惠顧！</p>
        </div>
      </div>
    </>
  )
}
