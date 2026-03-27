"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Plus, Pencil, Trash2, Users, ChevronLeft, Tag, X } from "lucide-react"

const PRESET_COLORS = [
  "#f97316", "#ef4444", "#22c55e", "#3b82f6",
  "#8b5cf6", "#eab308", "#ec4899", "#6b7280",
]

function TagBadge({ name, color, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {name}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-70">
          <X size={12} />
        </button>
      )}
    </span>
  )
}

function TagManagerModal({ onClose, onRefresh }) {
  const [tags, setTags] = useState([])
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("#f97316")
  const [saving, setSaving] = useState(false)

  const fetchTags = async () => {
    const res = await fetch("/api/tags")
    setTags(await res.json())
  }

  useEffect(() => { fetchTags() }, [])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    })
    setNewName("")
    await fetchTags()
    onRefresh()
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await fetch(`/api/tags/${id}`, { method: "DELETE" })
    await fetchTags()
    onRefresh()
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Tag size={20} className="text-orange-500" /> 管理標籤
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>
        </div>

        {/* 新增標籤 */}
        <div className="flex gap-2 mb-5">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="標籤名稱"
            className="flex-1 px-3 py-2 text-base border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400"
          />
          <div className="flex gap-1 items-center flex-wrap w-36">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: newColor === c ? "#1f2937" : "transparent",
                }}
              />
            ))}
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !newName.trim()}
            className="px-4 py-2 bg-orange-500 text-white text-base font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50"
          >
            新增
          </button>
        </div>

        {/* 標籤列表 */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {tags.length === 0 ? (
            <p className="text-center text-gray-400 py-6">尚無標籤，請新增</p>
          ) : (
            tags.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <TagBadge name={t.name} color={t.color} />
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [tags, setTags] = useState([])
  const [search, setSearch] = useState("")
  const [activeTag, setActiveTag] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showTagManager, setShowTagManager] = useState(false)

  const fetchTags = async () => {
    const res = await fetch("/api/tags")
    const data = await res.json()
    setTags(Array.isArray(data) ? data : [])
  }

  const fetchCustomers = async (q = "", tag = "") => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (tag) params.set("tag", tag)
    const res = await fetch(`/api/customers?${params}`)
    const data = await res.json()
    setCustomers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchTags()
    fetchCustomers()
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchCustomers(search, activeTag)
  }

  const handleTagFilter = (tagName) => {
    const next = activeTag === tagName ? "" : tagName
    setActiveTag(next)
    fetchCustomers(search, next)
  }

  const handleDelete = async (id) => {
    await fetch(`/api/customers/${id}`, { method: "DELETE" })
    setDeleteTarget(null)
    fetchCustomers(search, activeTag)
  }

  const getTagColor = (name) => {
    const t = tags.find((t) => t.name === name)
    return t?.color || "#6b7280"
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">客戶資料</h1>
              <p className="text-base text-gray-400">基本資料管理</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowTagManager(true)}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 text-base font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Tag size={18} className="text-orange-500" />
              管理標籤
            </button>
            <Link
              href="/customers/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-lg font-semibold rounded-xl hover:bg-orange-600 transition-colors shadow-sm"
            >
              <Plus size={20} />
              新增客戶
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* 搜尋列 */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋客戶代號、簡稱、聯絡人..."
              className="w-full pl-10 pr-4 py-2.5 text-lg border border-gray-300 rounded-xl focus:outline-none focus:border-orange-400"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-orange-500 text-white text-lg font-semibold rounded-xl hover:bg-orange-600 transition-colors"
          >
            查詢
          </button>
        </form>

        {/* 標籤篩選列 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5 items-center">
            <span className="text-base text-gray-500 font-medium">標籤篩選：</span>
            <button
              onClick={() => handleTagFilter("")}
              className={`px-4 py-1.5 rounded-full text-base font-semibold border-2 transition-colors ${
                activeTag === ""
                  ? "bg-gray-700 text-white border-gray-700"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
              }`}
            >
              全部
            </button>
            {tags.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTagFilter(t.name)}
                className={`px-4 py-1.5 rounded-full text-base font-semibold border-2 transition-all ${
                  activeTag === t.name ? "opacity-100 scale-105" : "opacity-70 hover:opacity-100"
                }`}
                style={{
                  backgroundColor: activeTag === t.name ? t.color : "white",
                  color: activeTag === t.name ? "white" : t.color,
                  borderColor: t.color,
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        {/* 資料表格 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-400 text-xl">載入中...</div>
          ) : customers.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-xl">
              {search || activeTag ? "找不到符合的客戶" : "尚無客戶資料，請點「新增客戶」開始建立"}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 w-20">執行</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 w-10">序</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">客戶代號</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">客戶簡稱</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">公司全名</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">電話</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">傳真</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">主聯絡人</th>
                  <th className="px-4 py-3 text-left text-base font-semibold text-gray-600">標籤</th>
                  <th className="px-4 py-3 text-right text-base font-semibold text-gray-600">購買記錄</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-orange-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/customers/${c.id}`}
                          className="w-8 h-8 flex items-center justify-center bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-base text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 text-base font-medium text-gray-800">{c.code}</td>
                    <td className="px-4 py-3 text-base text-gray-800">{c.short_name}</td>
                    <td className="px-4 py-3 text-base text-gray-600 max-w-[180px] truncate">{c.full_name || "—"}</td>
                    <td className="px-4 py-3 text-base text-gray-600">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-base text-gray-600">{c.fax || "—"}</td>
                    <td className="px-4 py-3 text-base text-gray-600">{c.contact || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags || []).map((tag) => (
                          <TagBadge key={tag} name={tag} color={getTagColor(tag)} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-base text-right">
                      {c.order_count != null ? (
                        <span className="text-orange-600 font-semibold">{c.order_count} 筆</span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && customers.length > 0 && (
          <p className="mt-3 text-base text-gray-400">共 {customers.length} 筆</p>
        )}
      </main>

      {/* 刪除確認 */}
      {deleteTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl px-8 py-7 flex flex-col items-center gap-4 min-w-[300px]">
            <Trash2 className="text-red-500" size={40} />
            <p className="text-xl font-bold text-gray-700 text-center">
              確定刪除「{deleteTarget.short_name}」？
            </p>
            <p className="text-base text-gray-400 text-center">刪除後無法復原</p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-6 py-2.5 border-2 border-gray-200 text-lg rounded-xl hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteTarget.id)}
                className="px-6 py-2.5 bg-red-500 text-white text-lg rounded-xl hover:bg-red-600 transition-colors"
              >
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 標籤管理 Modal */}
      {showTagManager && (
        <TagManagerModal
          onClose={() => setShowTagManager(false)}
          onRefresh={fetchTags}
        />
      )}
    </div>
  )
}
