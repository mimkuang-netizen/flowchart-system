"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import * as Icons from "lucide-react"
import { flowSections } from "./menuConfig"

const colorMap = {
  orange: { text: "text-orange-500", bg: "bg-orange-50", activeBg: "bg-orange-100", label: "text-orange-600" },
  green:  { text: "text-green-600",  bg: "bg-green-50",  activeBg: "bg-green-100",  label: "text-green-700" },
  blue:   { text: "text-blue-600",   bg: "bg-blue-50",   activeBg: "bg-blue-100",   label: "text-blue-700" },
  purple: { text: "text-purple-600", bg: "bg-purple-50", activeBg: "bg-purple-100", label: "text-purple-700" },
}

const extraLinks = [
  { label: "首頁", icon: "Home", href: "/" },
  { label: "儀表板", icon: "LayoutDashboard", href: "/dashboard" },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const isActive = (href) => {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const w = collapsed ? "w-16" : "w-56"

  return (
    <>
      {/* 固定側邊欄 */}
      <div className={`fixed top-0 left-0 h-full ${w} bg-white border-r border-gray-200 z-30 transition-all duration-200 print:hidden flex flex-col`}>
        {/* 標題列 */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 shrink-0">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
                <Icons.Workflow size={18} className="text-white" />
              </div>
              <span className="text-base font-bold text-gray-800 truncate">冠毅進銷存</span>
            </Link>
          )}
          <button onClick={() => setCollapsed(c => !c)}
            className={`p-1.5 hover:bg-gray-100 rounded-lg shrink-0 ${collapsed ? "mx-auto" : ""}`}
            title={collapsed ? "展開選單" : "收合選單"}>
            {collapsed
              ? <Icons.PanelLeftOpen size={18} className="text-gray-400" />
              : <Icons.PanelLeftClose size={18} className="text-gray-400" />
            }
          </button>
        </div>

        {/* 選單內容 */}
        <div className="overflow-y-auto flex-1 py-2">
          {/* 首頁 & 儀表板 */}
          {extraLinks.map(link => {
            const Icon = Icons[link.icon] || Icons.Box
            const active = isActive(link.href)
            return (
              <Link key={link.href} href={link.href} title={link.label}
                className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-colors ${active ? "bg-orange-100 text-orange-700 font-semibold" : "text-gray-600 hover:bg-gray-50"} ${collapsed ? "justify-center" : ""}`}>
                <Icon size={20} className="shrink-0" />
                {!collapsed && <span className="text-sm truncate">{link.label}</span>}
              </Link>
            )
          })}

          <div className="h-px bg-gray-100 mx-3 my-2" />

          {/* 各區段 */}
          {flowSections.map(section => {
            const colors = colorMap[section.color] || colorMap.blue
            return (
              <div key={section.id} className="mb-1">
                {!collapsed && (
                  <div className={`mx-4 mt-3 mb-1 px-1 py-0.5 text-[11px] font-bold ${colors.label} tracking-wider`}>
                    {section.label}
                  </div>
                )}
                {collapsed && <div className="h-px bg-gray-100 mx-3 my-1.5" />}
                {section.items.map(item => {
                  const Icon = Icons[item.icon] || Icons.Box
                  const active = isActive(item.href)
                  return (
                    <Link key={item.id} href={item.href} title={item.label}
                      className={`flex items-center gap-3 mx-2 px-3 py-2 rounded-xl transition-colors ${active ? `${colors.activeBg} ${colors.text} font-semibold` : "text-gray-600 hover:bg-gray-50"} ${collapsed ? "justify-center" : ""}`}>
                      <Icon size={18} className={`shrink-0 ${active ? colors.text : "text-gray-400"}`} />
                      {!collapsed && <span className="text-sm truncate">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            )
          })}

          <div className="h-4" />
        </div>
      </div>

      {/* 佔位元素，讓 flex 主內容區正確推移 */}
      <div className={`${w} shrink-0 transition-all duration-200 print:hidden print:w-0`} />
    </>
  )
}
