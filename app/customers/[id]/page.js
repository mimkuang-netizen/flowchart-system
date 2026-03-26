"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Save, Users } from "lucide-react"

const EMPTY = {
  code: "", short_name: "", full_name: "", phone: "", fax: "",
  tax_id: "", contact: "", title: "", mobile: "", email: "",
  sales: "", discount: 100,
  delivery_city: "", delivery_district: "", delivery_address: "", delivery_zip: "",
  notes: "",
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-base font-semibold text-gray-600 mb-1">
        {required && <span className="text-red-500 mr-1">*</span>}
        {label}
      </label>
      {children}
    </div>
  )
}

const inputClass = "w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400"

export default function CustomerForm() {
  const router = useRouter()
  const { id } = useParams()
  const isNew = id === "new"

  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isNew) {
      fetch(`/api/customers/${id}`)
        .then((r) => r.json())
        .then((data) => { setForm({ ...EMPTY, ...data }); setLoading(false) })
        .catch(() => { setError("找不到此客戶"); setLoading(false) })
    }
  }, [id, isNew])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSave = async () => {
    if (!form.code.trim()) { setError("請填寫客戶代號"); return }
    if (!form.short_name.trim()) { setError("請填寫客戶簡稱"); return }
    setError("")
    setSaving(true)

    const payload = { ...form }
    delete payload.id
    delete payload.created_at

    const res = await fetch(
      isNew ? "/api/customers" : `/api/customers/${id}`,
      {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )
    const data = await res.json()
    setSaving(false)

    if (!res.ok) { setError(data.error || "儲存失敗"); return }
    router.push("/customers")
  }

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center text-xl text-gray-400">載入中...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 標題列 */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/customers" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {isNew ? "新增客戶" : "編輯客戶"}
              </h1>
              <p className="text-base text-gray-400">基本資料 / 客戶資料</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href="/customers"
              className="px-5 py-2.5 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50 transition-colors"
            >
              取消
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white text-lg font-semibold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "儲存中..." : "儲存"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-lg px-5 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* 基本資料 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">基本資料</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="客戶代號" required>
              <input value={form.code} onChange={set("code")} maxLength={10} placeholder="最長10碼" className={inputClass} />
            </Field>
            <Field label="客戶簡稱" required>
              <input value={form.short_name} onChange={set("short_name")} placeholder="建議5個中文字內" className={inputClass} />
            </Field>
            <Field label="客戶全名">
              <input value={form.full_name} onChange={set("full_name")} className={inputClass} />
            </Field>
            <Field label="統一編號">
              <input value={form.tax_id} onChange={set("tax_id")} className={inputClass} />
            </Field>
          </div>
        </section>

        {/* 聯絡資訊 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">聯絡資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="電話">
              <input value={form.phone} onChange={set("phone")} placeholder="02-12345678" className={inputClass} />
            </Field>
            <Field label="傳真">
              <input value={form.fax} onChange={set("fax")} className={inputClass} />
            </Field>
            <Field label="主聯絡人">
              <input value={form.contact} onChange={set("contact")} className={inputClass} />
            </Field>
            <Field label="職稱">
              <input value={form.title} onChange={set("title")} className={inputClass} />
            </Field>
            <Field label="手機">
              <input value={form.mobile} onChange={set("mobile")} placeholder="0930123456" className={inputClass} />
            </Field>
            <Field label="E-mail">
              <input value={form.email} onChange={set("email")} type="email" className={inputClass} />
            </Field>
          </div>
        </section>

        {/* 業務設定 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">業務設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="業務">
              <input value={form.sales} onChange={set("sales")} className={inputClass} />
            </Field>
            <Field label="固定折扣 (%)">
              <input value={form.discount} onChange={set("discount")} type="number" min={0} max={100} className={inputClass} />
            </Field>
          </div>
        </section>

        {/* 送貨地址 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">送貨地址</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <Field label="縣市">
              <input value={form.delivery_city} onChange={set("delivery_city")} placeholder="台北市" className={inputClass} />
            </Field>
            <Field label="鄉鎮市區">
              <input value={form.delivery_district} onChange={set("delivery_district")} placeholder="信義區" className={inputClass} />
            </Field>
            <div className="md:col-span-2">
              <Field label="路名與門號">
                <input value={form.delivery_address} onChange={set("delivery_address")} placeholder="信義路五段7號" className={inputClass} />
              </Field>
            </div>
            <Field label="郵遞區號">
              <input value={form.delivery_zip} onChange={set("delivery_zip")} placeholder="110" className={inputClass} />
            </Field>
          </div>
        </section>

        {/* 備註 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">備註</h2>
          <textarea
            value={form.notes}
            onChange={set("notes")}
            rows={4}
            className="w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400 resize-none"
          />
        </section>

        {/* 底部按鈕 */}
        <div className="flex justify-end gap-3 pb-8">
          <Link
            href="/customers"
            className="px-8 py-3 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50 transition-colors"
          >
            取消
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-orange-500 text-white text-lg font-semibold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? "儲存中..." : "儲存"}
          </button>
        </div>
      </main>
    </div>
  )
}
