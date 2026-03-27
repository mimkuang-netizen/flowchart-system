"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Calculator, ChevronLeft, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react"

const EXPENSE_CATS = ["辦公費用", "交通費", "餐費", "水電費", "材料費", "其他"]
const INCOME_CATS = ["銷貨收入", "其他收入"]
const PAYMENT_METHODS = [
  { value: "cash", label: "現金" },
  { value: "transfer", label: "銀行轉帳" },
  { value: "card", label: "信用卡" },
]

const EMPTY_FORM = {
  entry_date: new Date().toISOString().split("T")[0],
  entry_type: "expense",
  category: "辦公費用",
  description: "",
  amount: "",
  payment_method: "cash",
  notes: "",
}

export default function AccountingPage() {
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [tab, setTab] = useState("expense") // expense | income | query
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().split("T")[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0])
  const [filterType, setFilterType] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const fetchData = async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ from: dateFrom, to: dateTo })
      if (filterType) p.set("type", filterType)
      const res = await fetch(`/api/accounting?${p}`)
      const json = await res.json()
      setEntries(Array.isArray(json) ? json : [])
    } catch {
      setEntries([])
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [dateFrom, dateTo, filterType])

  // When switching to expense/income tab, set form type accordingly
  useEffect(() => {
    if (tab === "expense") {
      setForm(f => ({ ...f, entry_type: "expense", category: EXPENSE_CATS[0] }))
    } else if (tab === "income") {
      setForm(f => ({ ...f, entry_type: "income", category: INCOME_CATS[0] }))
    }
  }, [tab])

  const handleSave = async () => {
    if (!form.description.trim()) { setError("請填寫說明"); return }
    if (!form.amount || Number(form.amount) <= 0) { setError("請填寫正確金額"); return }
    setError(""); setSaving(true)
    try {
      const res = await fetch("/api/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || "儲存失敗")
        setSaving(false)
        return
      }
      setForm({ ...EMPTY_FORM, entry_type: tab === "income" ? "income" : "expense", category: tab === "income" ? INCOME_CATS[0] : EXPENSE_CATS[0] })
      setError("")
      fetchData()
    } catch {
      setError("儲存失敗")
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm("確定要刪除此筆記帳記錄？")) return
    await fetch(`/api/accounting/${id}`, { method: "DELETE" })
    fetchData()
  }

  const totalIncome = entries.filter(e => e.entry_type === "income").reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalExpense = entries.filter(e => e.entry_type === "expense").reduce((s, e) => s + Number(e.amount || 0), 0)
  const balance = totalIncome - totalExpense

  const cats = form.entry_type === "expense" ? EXPENSE_CATS : INCOME_CATS

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={24} /></Link>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">快速記帳</h1>
            <p className="text-base text-gray-400">商品與財務端 / 收支管理</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Tab 切換 */}
        <div className="flex gap-3">
          <button onClick={() => setTab("expense")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-lg font-semibold transition-colors ${tab === "expense" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-blue-50 border border-gray-200"}`}>
            <TrendingDown size={18} /> 支出
          </button>
          <button onClick={() => setTab("income")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-lg font-semibold transition-colors ${tab === "income" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-blue-50 border border-gray-200"}`}>
            <TrendingUp size={18} /> 收入
          </button>
          <button onClick={() => setTab("query")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-lg font-semibold transition-colors ${tab === "query" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-blue-50 border border-gray-200"}`}>
            <Calculator size={18} /> 查詢
          </button>
        </div>

        {/* 支出 / 收入 表單 */}
        {(tab === "expense" || tab === "income") && (
          <section className="bg-white rounded-2xl p-6 shadow-sm border-2 border-blue-200">
            <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">
              新增{tab === "expense" ? "支出" : "收入"}
            </h2>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-base px-4 py-2 rounded-xl mb-4">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-base font-semibold text-gray-600 mb-1">日期</label>
                <input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))}
                  className="w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-base font-semibold text-gray-600 mb-1">類型</label>
                <div className="flex rounded-xl overflow-hidden border border-gray-300">
                  <div className={`flex-1 py-2 text-base font-semibold flex items-center justify-center gap-1.5 ${tab === "expense" ? "bg-red-500 text-white" : "bg-green-600 text-white"}`}>
                    {tab === "expense" ? <><TrendingDown size={16} /> 支出</> : <><TrendingUp size={16} /> 收入</>}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-base font-semibold text-gray-600 mb-1">分類</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white">
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-base font-semibold text-gray-600 mb-1">付款方式</label>
                <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                  className="w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white">
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-base font-semibold text-gray-600 mb-1"><span className="text-red-500 mr-1">*</span>說明</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="費用說明" className="w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-base font-semibold text-gray-600 mb-1"><span className="text-red-500 mr-1">*</span>金額</label>
                <input type="number" min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0" className="w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-right" />
              </div>
              <div>
                <label className="block text-base font-semibold text-gray-600 mb-1">備註</label>
                <input value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setForm({ ...EMPTY_FORM, entry_type: tab, category: tab === "income" ? INCOME_CATS[0] : EXPENSE_CATS[0] })}
                className="px-6 py-2.5 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50">清除</button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                {saving ? "儲存中..." : "確認記帳"}
              </button>
            </div>
          </section>
        )}

        {/* 查詢 Tab */}
        {tab === "query" && (
          <>
            {/* 篩選 */}
            <div className="flex flex-wrap items-center gap-4 bg-white rounded-2xl px-6 py-4 shadow-sm">
              <div className="flex gap-2">
                {[{ v: "", l: "全部" }, { v: "expense", l: "支出" }, { v: "income", l: "收入" }].map(t => (
                  <button key={t.v} onClick={() => setFilterType(t.v)}
                    className={`px-4 py-2 rounded-xl text-base font-semibold transition-colors ${filterType === t.v ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-blue-50"}`}>
                    {t.l}
                  </button>
                ))}
              </div>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500" />
              <span className="text-gray-400">至</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500" />
            </div>

            {/* 統計卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="text-base text-gray-500">總收入</p>
                  <p className="text-2xl font-bold text-green-600">${totalIncome.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <TrendingDown className="text-red-500" size={24} />
                </div>
                <div>
                  <p className="text-base text-gray-500">總支出</p>
                  <p className="text-2xl font-bold text-red-500">${totalExpense.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${balance >= 0 ? "bg-blue-100" : "bg-orange-100"}`}>
                  <Calculator className={balance >= 0 ? "text-blue-600" : "text-orange-600"} size={24} />
                </div>
                <div>
                  <p className="text-base text-gray-500">淨額</p>
                  <p className={`text-2xl font-bold ${balance >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                    {balance >= 0 ? "+" : ""}{balance.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* 記帳列表 */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {loading ? <div className="py-16 text-center text-xl text-gray-400">載入中...</div>
              : entries.length === 0 ? <div className="py-16 text-center text-xl text-gray-400">此期間無記帳資料</div>
              : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>{["日期", "類型", "分類", "說明", "金額", "付款方式"].map(h => (
                      <th key={h} className="px-5 py-4 text-left text-base font-semibold text-gray-500">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {entries.map(entry => (
                      <tr key={entry.id} className={`hover:bg-blue-50/20 ${entry.entry_type === "income" ? "border-l-4 border-green-400" : "border-l-4 border-red-400"}`}>
                        <td className="px-5 py-4 text-base text-gray-500">{new Date(entry.entry_date).toLocaleDateString("zh-TW")}</td>
                        <td className="px-5 py-4">
                          <span className={`flex items-center gap-1 text-sm font-semibold ${entry.entry_type === "income" ? "text-green-600" : "text-red-500"}`}>
                            {entry.entry_type === "income" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {entry.entry_type === "income" ? "收入" : "支出"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-base">{entry.category}</td>
                        <td className="px-5 py-4 text-lg font-semibold">{entry.description}</td>
                        <td className={`px-5 py-4 text-xl font-bold ${entry.entry_type === "income" ? "text-green-600" : "text-red-500"}`}>
                          {entry.entry_type === "income" ? "+" : "-"}${Number(entry.amount).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-base text-gray-500">
                          {{ cash: "現金", transfer: "銀行轉帳", card: "信用卡" }[entry.payment_method] || entry.payment_method}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <p className="text-base text-gray-400">共 {entries.length} 筆記帳記錄</p>
          </>
        )}
      </main>
    </div>
  )
}
