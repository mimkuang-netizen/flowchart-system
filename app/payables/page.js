"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Landmark, ChevronLeft, Search, Download, Printer, Plus, Trash2, FileCheck } from "lucide-react"
import { exportToExcel } from "@/lib/exportExcel"

export default function PayablesPage() {
  const [receivings, setReceivings] = useState([])
  const [loading, setLoading] = useState(true)
  const [vendor, setVendor] = useState("")
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })
  const [viewMode, setViewMode] = useState("summary") // summary | detail

  // 支票簽收單
  const [checks, setChecks] = useState([])
  const [checksLoading, setChecksLoading] = useState(true)
  const [showCheckForm, setShowCheckForm] = useState(false)
  const [checkForm, setCheckForm] = useState({
    vendor_name: "", payment_item: "", issue_date: "", check_date: "", check_no: "", amount: "", notes: ""
  })
  const [deleteCheckId, setDeleteCheckId] = useState(null)
  const [checkedIds, setCheckedIds] = useState(new Set())

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const res = await fetch("/api/receiving")
      const data = await res.json()
      setReceivings(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    fetchData()
    fetchChecks()
  }, [])

  const fetchChecks = async () => {
    setChecksLoading(true)
    try {
      const res = await fetch("/api/check-receipts")
      const data = await res.json()
      setChecks(Array.isArray(data) ? data : [])
    } catch { setChecks([]) }
    setChecksLoading(false)
  }

  // Filter: match month and vendor, exclude "paid" status
  const filtered = receivings.filter(r => {
    if (r.status === "paid") return false
    if (monthFilter) {
      const d = r.receipt_date || r.created_at || ""
      if (!d.startsWith(monthFilter)) return false
    }
    if (vendor.trim()) {
      const q = vendor.toLowerCase()
      if (!(r.vendor_name || "").toLowerCase().includes(q)) return false
    }
    return true
  })

  // Group by vendor
  const grouped = {}
  for (const r of filtered) {
    const key = r.vendor_name || "未知廠商"
    if (!grouped[key]) grouped[key] = { vendor_name: key, orders: [], total: 0 }
    grouped[key].orders.push(r)
    grouped[key].total += Number(r.total || 0)
  }
  const summaryList = Object.values(grouped).sort((a, b) => b.total - a.total)
  const grandTotal = summaryList.reduce((s, g) => s + g.total, 0)
  const totalOrders = filtered.length

  const fmt = (d) => d ? new Date(d).toLocaleDateString("zh-TW") : "—"
  const fmtMoney = (n) => `$${Number(n || 0).toLocaleString()}`

  const statusLabel = (status) => ({
    draft: "草稿",
    confirmed: "已確認",
    paid: "已付款",
  }[status] || status || "已確認")
  const statusColor = (status) => ({
    draft: "bg-gray-100 text-gray-600",
    confirmed: "bg-orange-100 text-orange-700",
    paid: "bg-green-100 text-green-700",
  }[status] || "bg-orange-100 text-orange-700")

  const handleExport = () => {
    if (viewMode === "summary") {
      exportToExcel(summaryList.map(g => ({
        vendor_name: g.vendor_name,
        order_count: g.orders.length,
        total: g.total,
      })), [
        { header: "廠商名稱", key: "vendor_name" },
        { header: "未付筆數", key: "order_count" },
        { header: "應付金額", key: "total", format: "money" },
      ], `應付帳款_${monthFilter}`)
    } else {
      exportToExcel(filtered.map(r => ({
        vendor_name: r.vendor_name,
        receipt_no: r.receipt_no,
        receipt_date: r.receipt_date,
        subtotal: r.subtotal,
        tax_amount: r.tax_amount,
        total: r.total,
        status: statusLabel(r.status),
      })), [
        { header: "廠商名稱", key: "vendor_name" },
        { header: "進貨單號", key: "receipt_no" },
        { header: "進貨日期", key: "receipt_date", format: "date" },
        { header: "小計", key: "subtotal", format: "money" },
        { header: "稅額", key: "tax_amount", format: "money" },
        { header: "總金額", key: "total", format: "money" },
        { header: "狀態", key: "status" },
      ], `應付帳款明細_${monthFilter}`)
    }
  }

  const handleExportChecks = () => {
    exportToExcel(checks.map(c => ({
      vendor_name: c.vendor_name,
      payment_item: c.payment_item,
      issue_date: c.issue_date,
      check_date: c.check_date,
      check_no: c.check_no,
      amount: c.amount,
      notes: c.notes,
    })), [
      { header: "廠商名稱", key: "vendor_name" },
      { header: "付款項目", key: "payment_item" },
      { header: "開票日期", key: "issue_date", format: "date" },
      { header: "票據日期", key: "check_date", format: "date" },
      { header: "支票號碼", key: "check_no" },
      { header: "支票金額", key: "amount", format: "money" },
      { header: "備註", key: "notes" },
    ], `支票簽收單`)
  }

  const handleAddCheck = async () => {
    const payload = {
      ...checkForm,
      amount: Number(checkForm.amount) || 0,
      issue_date: checkForm.issue_date || null,
      check_date: checkForm.check_date || null,
      status: "未列印",
    }
    await fetch("/api/check-receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setCheckForm({ vendor_name: "", payment_item: "", issue_date: "", check_date: "", check_no: "", amount: "", notes: "" })
    setShowCheckForm(false)
    fetchChecks()
  }

  const handleDeleteCheck = async () => {
    await fetch(`/api/check-receipts/${deleteCheckId}`, { method: "DELETE" })
    setDeleteCheckId(null)
    fetchChecks()
  }

  const updateCheckStatus = async (id, status) => {
    await fetch(`/api/check-receipts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  const filteredChecks = checks.filter(c => {
    // 根據付款項目的民國年月對應到 monthFilter
    const [fYear, fMonth] = monthFilter.split("-").map(Number)
    const rocYear = fYear - 1911
    const target = `${rocYear}年${fMonth}月帳`
    if (c.payment_item && c.payment_item.includes(target)) return true
    // fallback: 如果付款項目格式不符，用開票日期比對
    if (!c.payment_item) {
      const d = c.issue_date || c.created_at || ""
      return d.startsWith(monthFilter)
    }
    return false
  })
  const checksTotal = filteredChecks.reduce((s, c) => s + Number(c.amount || 0), 0)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">應付帳款</h1>
              <p className="text-base text-gray-400">廠商端 / 月結對帳</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 text-base font-semibold rounded-xl hover:bg-gray-50">
              <Download size={18} /> 匯出 Excel
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 text-base font-semibold rounded-xl hover:bg-gray-50">
              <Printer size={18} /> 列印
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* 篩選列 */}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="搜尋廠商名稱..."
              className="w-full pl-9 pr-4 py-2.5 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 bg-white" />
          </div>
          <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="px-4 py-2.5 text-lg border border-gray-300 rounded-xl bg-white focus:outline-none focus:border-purple-500" />
          <div className="flex rounded-xl border border-gray-300 overflow-hidden">
            <button onClick={() => setViewMode("summary")}
              className={`px-4 py-2.5 text-base font-semibold ${viewMode === "summary" ? "bg-purple-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              廠商彙總
            </button>
            <button onClick={() => setViewMode("detail")}
              className={`px-4 py-2.5 text-base font-semibold ${viewMode === "detail" ? "bg-purple-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              單據明細
            </button>
          </div>
        </div>

        {/* 摘要卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-base text-gray-500">未付款廠商數</p>
            <p className="text-3xl font-bold text-purple-700 mt-1">{summaryList.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-base text-gray-500">未付款筆數</p>
            <p className="text-3xl font-bold text-orange-600 mt-1">{totalOrders}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-base text-gray-500">應付帳款總額</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{fmtMoney(grandTotal)}</p>
          </div>
        </div>

        {/* 應付帳款表格 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? <div className="py-20 text-center text-xl text-gray-400">載入中...</div>
          : filtered.length === 0 ? <div className="py-20 text-center text-xl text-gray-400">此期間無未付款項</div>
          : viewMode === "summary" ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">廠商名稱</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">未付筆數</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">應付金額</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500 print:hidden">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {summaryList.map(g => (
                  <tr key={g.vendor_name} className="hover:bg-purple-50/50">
                    <td className="px-5 py-4 text-lg font-semibold">{g.vendor_name}</td>
                    <td className="px-5 py-4 text-lg">{g.orders.length} 筆</td>
                    <td className="px-5 py-4 text-xl font-bold text-red-600">{fmtMoney(g.total)}</td>
                    <td className="px-5 py-4 print:hidden">
                      <button onClick={() => { setVendor(g.vendor_name); setViewMode("detail") }}
                        className="text-purple-600 hover:underline text-base font-medium">查看明細</button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-purple-50 font-bold">
                  <td className="px-5 py-4 text-base text-right">合計</td>
                  <td className="px-5 py-4 text-lg">{totalOrders} 筆</td>
                  <td className="px-5 py-4 text-xl text-red-600">{fmtMoney(grandTotal)}</td>
                  <td className="print:hidden"></td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">廠商名稱</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">進貨單號</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">進貨日期</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">小計</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">稅額</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">狀態</th>
                  <th className="px-5 py-4 text-left text-base font-semibold text-gray-500">總金額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.sort((a, b) => (a.vendor_name || "").localeCompare(b.vendor_name || "")).map(r => (
                  <tr key={r.id} className="hover:bg-purple-50/50">
                    <td className="px-5 py-4 text-lg font-semibold">{r.vendor_name}</td>
                    <td className="px-5 py-4 text-base font-mono text-purple-700">
                      <Link href={`/receiving/${r.id}`} className="hover:underline">{r.receipt_no}</Link>
                    </td>
                    <td className="px-5 py-4 text-base text-gray-500">{fmt(r.receipt_date)}</td>
                    <td className="px-5 py-4 text-base">{fmtMoney(r.subtotal)}</td>
                    <td className="px-5 py-4 text-base text-gray-500">{fmtMoney(r.tax_amount)}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${statusColor(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xl font-bold text-red-600">{fmtMoney(r.total)}</td>
                  </tr>
                ))}
                <tr className="bg-purple-50 font-bold">
                  <td className="px-5 py-4 text-base text-right" colSpan={6}>合計</td>
                  <td className="px-5 py-4 text-xl text-red-600">{fmtMoney(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* ===== 支票簽收單區塊 ===== */}
        <div id="check-receipt-print" className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck className="text-purple-600" size={22} />
              <h2 className="text-xl font-bold text-gray-700">支票簽收單</h2>
              <span className="text-base text-gray-400">共 {filteredChecks.length} 筆，合計 {fmtMoney(checksTotal)}</span>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              {checkedIds.size > 0 && (
                <select defaultValue="" onChange={async e => {
                  const status = e.target.value
                  if (!status) return
                  for (const id of checkedIds) { await updateCheckStatus(id, status) }
                  e.target.value = ""
                }}
                  className="px-3 py-2 text-sm font-semibold border border-purple-300 bg-purple-50 text-purple-700 rounded-lg cursor-pointer">
                  <option value="" disabled>批次修改({checkedIds.size}筆)</option>
                  <option value="未列印">未列印</option>
                  <option value="已列印">已列印</option>
                  <option value="已寄出">已寄出</option>
                  <option value="已兌現">已兌現</option>
                </select>
              )}
              <button onClick={handleExportChecks}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-50">
                <Download size={16} /> 匯出
              </button>
              <button onClick={() => {
                const win = window.open("", "_blank")
                const checkedChecks = filteredChecks.filter(c => checkedIds.has(c.id))
                const printChecks = checkedChecks.length > 0 ? checkedChecks : filteredChecks
                const fmtD = (d) => d ? new Date(d).toLocaleDateString("zh-TW") : ""
                const fmtM = (n) => n ? `$${Number(n).toLocaleString()}` : ""
                const slipHtml = printChecks.map(c => `
                  <div class="slip">
                    <h2 class="title">支票簽收單</h2>
                    <div class="header">
                      <div class="left"><strong class="company">冠毅國際有限公司</strong></div>
                      <div class="right-info">電話：06-384-1618、06-384-1619</div>
                    </div>
                    <div class="header">
                      <div class="left">70955 台南市安南區工業三路85號</div>
                      <div class="right-info">傳真：06-384-1026</div>
                    </div>
                    <p class="desc">茲附上下列付款票據，敬請於收訖無誤後，將簽收單寄回或傳真，謝謝。</p>
                    <table>
                      <thead><tr>
                        <th>付款對象</th><th>付款項目</th><th>付款日期</th><th>票據日期</th><th>票據號碼</th><th>票據金額</th><th>簽收人</th>
                      </tr></thead>
                      <tbody><tr>
                        <td>${c.vendor_name || ""}</td>
                        <td>${c.payment_item || ""}</td>
                        <td>${fmtD(c.issue_date)}</td>
                        <td>${fmtD(c.check_date)}</td>
                        <td>${c.check_no || ""}</td>
                        <td>${fmtM(c.amount)}</td>
                        <td></td>
                      </tr></tbody>
                    </table>
                  </div>
                `).join("")
                win.document.write(`<!DOCTYPE html><html><head><title>支票簽收單</title><style>
                  @page { margin: 0; size: A4; }
                  @media print {
                    html, body { -webkit-print-color-adjust: exact; }
                  }
                  body { font-family: "Microsoft JhengHei", "PingFang TC", sans-serif; margin: 0; padding: 12mm 15mm; }
                  .slip { padding: 20px 0 18px 0; border-bottom: 1px dashed #999; page-break-inside: avoid; }
                  .slip:last-child { border-bottom: none; }
                  .title { text-align: center; font-size: 18px; font-weight: bold; margin: 0 0 12px 0; letter-spacing: 6px; }
                  .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
                  .company { font-size: 15px; }
                  .left { font-size: 12px; }
                  .right-info { font-size: 12px; }
                  .desc { font-size: 11px; margin: 6px 0 10px 0; }
                  table { width: 100%; border-collapse: collapse; }
                  th, td { border: 1px solid #555; padding: 5px 8px; font-size: 11px; text-align: left; }
                  th { background: #f5f5f5; font-weight: bold; }
                </style></head><body>${slipHtml}
                <script>
                  // 自動隱藏瀏覽器頁首頁尾（日期、網址、頁碼）
                  document.title = " ";
                </script>
                </body></html>`)
                win.document.close()
                setTimeout(() => win.print(), 100)
                // 自動將列印的支票狀態改為「已列印」
                for (const c of printChecks) {
                  if (!c.status || c.status === "未列印") {
                    updateCheckStatus(c.id, "已列印")
                  }
                }
              }}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-50">
                <Printer size={16} /> 列印{checkedIds.size > 0 ? `(${checkedIds.size})` : ""}
              </button>
              <button onClick={() => {
                const now = new Date()
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
                // 付款項目：根據頁面所選月份，轉民國年
                const [fYear, fMonth] = monthFilter.split("-").map(Number)
                const rocYear = fYear - 1911
                const paymentItem = `${rocYear}年${fMonth}月帳`
                // 票據日期預設：當月8號
                const checkDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-08`
                // 如果搜尋欄有廠商，自動帶入金額
                const matchedVendor = vendor ? summaryList.find(g => g.vendor_name === vendor) : null
                setCheckForm(f => ({
                  ...f,
                  vendor_name: vendor || "",
                  issue_date: todayStr,
                  check_date: checkDateStr,
                  payment_item: paymentItem,
                  amount: matchedVendor ? matchedVendor.total : "",
                }))
                setShowCheckForm(true)
              }}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700">
                <Plus size={16} /> 新增支票
              </button>
            </div>
          </div>

          {/* 新增支票表單 */}
          {showCheckForm && (
            <div className="px-6 py-5 bg-purple-50 border-b border-purple-100 print:hidden">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">廠商名稱</label>
                  <select value={checkForm.vendor_name} onChange={e => {
                    const name = e.target.value
                    const matched = summaryList.find(g => g.vendor_name === name)
                    setCheckForm(f => ({ ...f, vendor_name: name, amount: matched ? matched.total : "" }))
                  }}
                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 bg-white">
                    <option value="">請選擇廠商</option>
                    {summaryList.map(g => (
                      <option key={g.vendor_name} value={g.vendor_name}>{g.vendor_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">付款項目</label>
                  <input value={checkForm.payment_item} onChange={e => setCheckForm(f => ({ ...f, payment_item: e.target.value }))}
                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500" placeholder="如：貨款、加工費" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">開票日期</label>
                  <input type="date" value={checkForm.issue_date} onChange={e => setCheckForm(f => ({ ...f, issue_date: e.target.value }))}
                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">票據日期</label>
                  <input type="date" value={checkForm.check_date} onChange={e => setCheckForm(f => ({ ...f, check_date: e.target.value }))}
                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">支票號碼</label>
                  <input value={checkForm.check_no} onChange={e => setCheckForm(f => ({ ...f, check_no: e.target.value }))}
                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500" placeholder="支票號碼" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">支票金額</label>
                  <input type="number" value={checkForm.amount} onChange={e => setCheckForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500" placeholder="金額" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-600 mb-1">備註</label>
                  <input value={checkForm.notes} onChange={e => setCheckForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500" placeholder="備註（選填）" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowCheckForm(false)}
                  className="px-5 py-2.5 border-2 border-gray-200 text-base rounded-xl hover:bg-gray-50">取消</button>
                <button onClick={handleAddCheck}
                  className="px-5 py-2.5 bg-purple-600 text-white text-base font-semibold rounded-xl hover:bg-purple-700">儲存</button>
              </div>
            </div>
          )}

          {/* 支票列表 */}
          {checksLoading ? <div className="py-12 text-center text-lg text-gray-400">載入中...</div>
          : filteredChecks.length === 0 ? <div className="py-12 text-center text-lg text-gray-400">尚無支票簽收記錄</div>
          : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-3 text-center print:hidden">
                    <input type="checkbox" className="w-4 h-4 accent-purple-600"
                      checked={filteredChecks.length > 0 && checkedIds.size === filteredChecks.length}
                      onChange={e => {
                        if (e.target.checked) setCheckedIds(new Set(filteredChecks.map(c => c.id)))
                        else setCheckedIds(new Set())
                      }} />
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">廠商名稱</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">付款項目</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">開票日期</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">票據日期</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">支票號碼</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">支票金額</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">狀態</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">備註</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500 print:hidden">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredChecks.map(c => (
                  <tr key={c.id} className={`hover:bg-purple-50/30 ${checkedIds.has(c.id) ? "bg-purple-50/50" : ""}`}>
                    <td className="px-3 py-3 text-center print:hidden">
                      <input type="checkbox" className="w-4 h-4 accent-purple-600"
                        checked={checkedIds.has(c.id)}
                        onChange={e => {
                          const next = new Set(checkedIds)
                          if (e.target.checked) next.add(c.id); else next.delete(c.id)
                          setCheckedIds(next)
                        }} />
                    </td>
                    <td className="px-5 py-3 text-base font-semibold">{c.vendor_name}</td>
                    <td className="px-5 py-3 text-base">{c.payment_item}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{fmt(c.issue_date)}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{fmt(c.check_date)}</td>
                    <td className="px-5 py-3 text-base font-mono">{c.check_no}</td>
                    <td className="px-5 py-3 text-lg font-bold text-purple-700">{fmtMoney(c.amount)}</td>
                    <td className="px-5 py-3">
                      <select value={c.status || "未列印"} onChange={e => updateCheckStatus(c.id, e.target.value)}
                        className={`px-2 py-1 text-xs font-semibold rounded-lg border-0 cursor-pointer ${
                          (c.status || "未列印") === "未列印" ? "bg-gray-100 text-gray-600" :
                          c.status === "已列印" ? "bg-blue-100 text-blue-700" :
                          c.status === "已寄出" ? "bg-orange-100 text-orange-700" :
                          c.status === "已兌現" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>
                        <option value="未列印">未列印</option>
                        <option value="已列印">已列印</option>
                        <option value="已寄出">已寄出</option>
                        <option value="已兌現">已兌現</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{c.notes || "—"}</td>
                    <td className="px-5 py-3 print:hidden">
                      <button onClick={() => setDeleteCheckId(c.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-purple-50 font-bold">
                  <td className="print:hidden"></td>
                  <td className="px-5 py-3 text-sm text-right" colSpan={5}>支票合計</td>
                  <td className="px-5 py-3 text-lg text-purple-700">{fmtMoney(checksTotal)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* 刪除支票確認 */}
      {deleteCheckId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold mb-3">確認刪除</h3>
            <p className="text-lg text-gray-600 mb-6">確定要刪除此支票記錄？此操作無法復原。</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteCheckId(null)} className="px-5 py-2.5 border-2 border-gray-200 text-lg rounded-xl">取消</button>
              <button onClick={handleDeleteCheck} className="px-5 py-2.5 bg-red-500 text-white text-lg font-semibold rounded-xl hover:bg-red-600">確認刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
