"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Save, Truck } from "lucide-react"
import { CITIES, getDistricts, getZip } from "@/lib/taiwan-zip"

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const MONTH_OFFSETS = ["本月", ...Array.from({ length: 12 }, (_, i) => `下${i + 1}個月`)]

const EMPTY = {
  code: "", short_name: "", full_name: "", phone: "", fax: "",
  tax_id: "", contact: "", title: "", mobile: "", email: "",
  biz_city: "", biz_district: "", biz_address: "", biz_zip: "",
  payment_type: "monthly", payment_days: 0, payment_cutoff_day: 31,
  payment_month_offset: "本月", payment_due_day: 31,
  notes: "", tags: [],
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

const inputClass = "w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-green-500"
const selectClass = "px-2 py-1.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 bg-white"

export default function VendorForm() {
  const router = useRouter()
  const { id } = useParams()
  const isNew = id === "new"

  const [form, setForm] = useState(EMPTY)
  const [tagOptions, setTagOptions] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/tags").then(r => r.json()).then(d => setTagOptions(Array.isArray(d) ? d : []))
    if (!isNew) {
      fetch(`/api/vendors/${id}`)
        .then(r => r.json())
        .then(data => { setForm({ ...EMPTY, ...data, tags: data.tags || [] }); setLoading(false) })
        .catch(() => { setError("找不到此廠商"); setLoading(false) })
    }
  }, [id, isNew])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  const setNum = (field) => (e) => setForm(f => ({ ...f, [field]: Number(e.target.value) }))

  const handleCityChange = (e) => {
    const city = e.target.value
    setForm(f => ({ ...f, biz_city: city, biz_district: "", biz_zip: "" }))
  }

  const handleDistrictChange = (e) => {
    const district = e.target.value
    const zip = getZip(form.biz_city, district)
    setForm(f => ({ ...f, biz_district: district, biz_zip: zip }))
  }

  const toggleTag = (name) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(name) ? f.tags.filter(t => t !== name) : [...f.tags, name]
    }))
  }

  const handleSave = async () => {
    if (!form.code.trim()) { setError("請填寫廠商代號"); return }
    if (!form.short_name.trim()) { setError("請填寫廠商簡稱"); return }
    setError("")
    setSaving(true)

    const payload = { ...form }
    delete payload.id
    delete payload.created_at

    const res = await fetch(
      isNew ? "/api/vendors" : `/api/vendors/${id}`,
      { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    )
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || "儲存失敗"); return }
    router.push("/vendors")
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center text-xl text-gray-400">載入中...</div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/vendors" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{isNew ? "新增廠商" : "編輯廠商"}</h1>
              <p className="text-base text-gray-400">基本資料 / 廠商資料</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/vendors" className="px-5 py-2.5 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50 transition-colors">
              取消
            </Link>
            <button
              onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "儲存中..." : "儲存"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-lg px-5 py-3 rounded-xl">{error}</div>
        )}

        {/* 基本資料 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">基本資料</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="廠商代號" required>
              <input value={form.code} onChange={set("code")} maxLength={10} placeholder="最長10碼" className={inputClass} />
            </Field>
            <Field label="廠商簡稱" required>
              <input value={form.short_name} onChange={set("short_name")} placeholder="建議5個中文字內" className={inputClass} />
            </Field>
            <Field label="廠商全名">
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
              <input value={form.phone} onChange={set("phone")} placeholder="06-12345678" className={inputClass} />
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

        {/* 營業地址 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">營業地址</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <Field label="縣市">
              <select value={form.biz_city} onChange={handleCityChange} className={inputClass}>
                <option value="">請選擇</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="鄉鎮市區">
              <select value={form.biz_district} onChange={handleDistrictChange} className={inputClass} disabled={!form.biz_city}>
                <option value="">請選擇</option>
                {getDistricts(form.biz_city).map(d => (
                  <option key={d.d} value={d.d}>{d.d}</option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="路名與門號">
                <input value={form.biz_address} onChange={set("biz_address")} placeholder="信義路五段7號" className={inputClass} />
              </Field>
            </div>
            <Field label="郵遞區號">
              <input
                value={form.biz_zip}
                onChange={set("biz_zip")}
                placeholder="自動填入"
                className={`${inputClass} ${form.biz_zip ? "bg-green-50 font-semibold text-green-700" : ""}`}
                readOnly={!!(form.biz_city && form.biz_district)}
              />
            </Field>
          </div>
        </section>

        {/* 付款方式 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">付款方式</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="payment_type"
                checked={form.payment_type === "days"}
                onChange={() => setForm(f => ({ ...f, payment_type: "days" }))}
                className="w-4 h-4 accent-green-600"
              />
              <span className="text-lg text-gray-700">進貨後</span>
              <input
                type="number" min={0} max={999}
                value={form.payment_days}
                onChange={setNum("payment_days")}
                disabled={form.payment_type !== "days"}
                className="w-20 px-3 py-1.5 text-lg border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 disabled:bg-gray-100"
              />
              <span className="text-lg text-gray-700">天付款</span>
            </label>

            <label className="flex items-center gap-2 flex-wrap cursor-pointer">
              <input
                type="radio"
                name="payment_type"
                checked={form.payment_type === "monthly"}
                onChange={() => setForm(f => ({ ...f, payment_type: "monthly" }))}
                className="w-4 h-4 accent-green-600"
              />
              <span className="text-lg text-gray-700">月結：每月</span>
              <select
                value={form.payment_cutoff_day}
                onChange={setNum("payment_cutoff_day")}
                disabled={form.payment_type !== "monthly"}
                className={`${selectClass} disabled:bg-gray-100`}
              >
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span className="text-lg text-gray-700">日前交易，在</span>
              <select
                value={form.payment_month_offset}
                onChange={set("payment_month_offset")}
                disabled={form.payment_type !== "monthly"}
                className={`${selectClass} disabled:bg-gray-100`}
              >
                {MONTH_OFFSETS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={form.payment_due_day}
                onChange={setNum("payment_due_day")}
                disabled={form.payment_type !== "monthly"}
                className={`${selectClass} disabled:bg-gray-100`}
              >
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span className="text-lg text-gray-700">日付款</span>
            </label>
            {form.payment_type === "monthly" && (
              <p className="text-sm text-blue-600 ml-6">ℹ 如果月結日為每月月底請設為31</p>
            )}
          </div>
        </section>

        {/* 備註 */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-700 mb-5 pb-3 border-b border-gray-100">備註</h2>
          <textarea
            value={form.notes} onChange={set("notes")} rows={4}
            className="w-full px-3 py-2 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-green-500 resize-none"
          />
        </section>

        {/* 底部按鈕 */}
        <div className="flex justify-end gap-3 pb-8">
          <Link href="/vendors" className="px-8 py-3 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50 transition-colors">
            取消
          </Link>
          <button
            onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? "儲存中..." : "儲存"}
          </button>
        </div>
      </main>
    </div>
  )
}
