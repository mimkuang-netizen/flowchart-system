"use client";

import { useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { flowSections } from "./menuConfig";

const colorMap = {
  orange: {
    section: "border-orange-300 bg-orange-50",
    label: "bg-orange-500 text-white",
    icon: "text-orange-500",
    card: "hover:border-orange-400 hover:shadow-orange-100",
    arrow: "text-orange-400",
    dot: "bg-orange-400",
  },
  green: {
    section: "border-green-300 bg-green-50",
    label: "bg-green-600 text-white",
    icon: "text-green-600",
    card: "hover:border-green-400 hover:shadow-green-100",
    arrow: "text-green-400",
    dot: "bg-green-500",
  },
  blue: {
    section: "border-blue-300 bg-blue-50",
    label: "bg-blue-600 text-white",
    icon: "text-blue-600",
    card: "hover:border-blue-400 hover:shadow-blue-100",
    arrow: "text-blue-400",
    dot: "bg-blue-500",
  },
  purple: {
    section: "border-purple-300 bg-purple-50",
    label: "bg-purple-600 text-white",
    icon: "text-purple-600",
    card: "hover:border-purple-400 hover:shadow-purple-100",
    arrow: "text-purple-400",
    dot: "bg-purple-500",
  },
};

function Toast({ message, onClose }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 min-w-[280px]">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
          <Icons.Construction className="w-8 h-8 text-orange-500" />
        </div>
        <p className="text-2xl font-bold text-gray-700 text-center">{message}</p>
        <p className="text-lg text-gray-400 text-center">功能開發中，敬請期待</p>
        <button
          onClick={onClose}
          className="mt-2 px-8 py-3 bg-orange-500 text-white text-xl rounded-xl hover:bg-orange-600 transition-colors"
        >
          確定
        </button>
      </div>
    </div>
  );
}

function FlowItem({ item, color, isLast }) {
  const [showToast, setShowToast] = useState(false);
  const colors = colorMap[color];
  const IconComponent = Icons[item.icon] || Icons.Box;

  const cardClass = `
    flex flex-col items-center justify-center gap-3
    w-36 h-36 bg-white rounded-2xl border-2 border-gray-200
    shadow-sm cursor-pointer transition-all duration-200
    ${colors.card} hover:shadow-lg hover:-translate-y-1
  `;

  const cardContent = (
    <>
      <div className={`${colors.icon}`}>
        <IconComponent size={44} strokeWidth={1.5} />
      </div>
      <span className="text-xl font-semibold text-gray-700 leading-tight text-center">
        {item.label}
      </span>
    </>
  );

  return (
    <>
      <div className="flex items-center">
        {/* 功能卡片 */}
        {item.active ? (
          <Link href={item.href} className={cardClass} title={item.description}>
            {cardContent}
          </Link>
        ) : (
          <button onClick={() => setShowToast(true)} className={cardClass} title={item.description}>
            {cardContent}
          </button>
        )}

        {/* 箭頭 */}
        {!isLast && (
          <div className={`flex items-center mx-2 ${colors.arrow}`}>
            <div className={`h-0.5 w-8 ${colors.dot}`} />
            <Icons.ChevronRight size={28} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {showToast && (
        <Toast
          message={`「${item.label}」功能開發中`}
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  );
}

export default function FlowChart() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* 頂部標題列 */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
            <Icons.Workflow className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">業務流程圖</h1>
            <p className="text-base text-gray-400">點擊功能按鈕開始操作</p>
          </div>
        </div>
      </header>

      {/* 儀表板快捷入口 */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <Link href="/dashboard"
          className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <Icons.LayoutDashboard size={24} />
            <div>
              <p className="text-lg font-bold">營運儀表板</p>
              <p className="text-sm opacity-80">本月營業額、待處理訂單、庫存警示</p>
            </div>
          </div>
          <Icons.ArrowRight size={22} />
        </Link>
      </div>

      {/* 主內容 */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {flowSections.map((section) => {
          const colors = colorMap[section.color];
          return (
            <div
              key={section.id}
              className={`rounded-2xl border-2 ${colors.section} p-6`}
            >
              {/* 區段標題 */}
              <div className="flex items-center gap-3 mb-6">
                <span
                  className={`px-4 py-1.5 rounded-full text-xl font-bold ${colors.label}`}
                >
                  {section.label}
                </span>
                <div className={`flex-1 h-0.5 opacity-30 ${colors.dot}`} />
              </div>

              {/* 流程項目 */}
              <div className="flex flex-wrap items-center gap-y-4">
                {section.items.map((item, index) => (
                  <FlowItem
                    key={item.id}
                    item={item}
                    color={section.color}
                    isLast={index === section.items.length - 1}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </main>

      {/* 頁腳 */}
      <footer className="text-center py-6 text-base text-gray-400">
        © 冠毅國際 · 業務管理系統
      </footer>
    </div>
  );
}
