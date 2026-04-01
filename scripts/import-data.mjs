/**
 * 進銷存資料匯入腳本
 * 從 Excel 匯入客戶、商品、廠商、報價單、銷貨單、進貨單
 * 已存在的資料（依 code / 單號判斷）不會覆蓋
 */

import { createClient } from "@supabase/supabase-js"
import XLSX from "xlsx"
import path from "path"

const SUPABASE_URL = "https://ydxpvjerhjuldinvtxvv.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeHB2amVyaGp1bGRpbnZ0eHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTkyMzYsImV4cCI6MjA5MDA5NTIzNn0.IQt2_W3XXbANYUTVz1Y989PiFn_yqR1D0p27-WnN2SI"
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const DIR = "/Users/smartai/Downloads"

function readExcel(filename) {
  const wb = XLSX.readFile(path.join(DIR, filename))
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { defval: "" })
}

function clean(v) {
  if (v === null || v === undefined) return ""
  return String(v).trim()
}

function cleanNum(v) {
  if (v === null || v === undefined || v === "") return 0
  const n = Number(String(v).replace(/,/g, ""))
  return isNaN(n) ? 0 : n
}

function parseDate(v) {
  if (!v) return null
  // Excel serial number
  if (typeof v === "number") {
    const d = new Date((v - 25569) * 86400000)
    return d.toISOString().split("T")[0]
  }
  // String date like "2026/04/01"
  const s = String(v).replace(/\//g, "-").trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return null
}

// ===== 1. 客戶資料 =====
async function importCustomers() {
  console.log("\n📋 匯入客戶資料...")
  const rows = readExcel("客戶資料20260401202106.xlsx")

  // 取得已有的客戶 code
  const { data: existing } = await supabase.from("customers").select("code")
  const existingCodes = new Set((existing || []).map(c => c.code))

  let inserted = 0, skipped = 0
  for (const r of rows) {
    const code = clean(r["客戶代號"])
    if (!code) continue
    if (existingCodes.has(code)) { skipped++; continue }

    const record = {
      code,
      short_name: clean(r["客戶簡稱"]),
      phone: clean(r["電話"]),
      fax: clean(r["傳真"]),
      contact: clean(r["主聯絡人"]),
      title: clean(r["職稱"]),
      mobile: clean(r["手機"]),
      delivery_address: clean(r["送貨地址"]),
      tax_id: clean(r["統一編號"]),
    }

    const { error } = await supabase.from("customers").insert([record])
    if (error) {
      console.log(`  ❌ ${code} ${record.short_name}: ${error.message}`)
    } else {
      inserted++
    }
  }
  console.log(`  ✅ 新增 ${inserted} 筆，跳過 ${skipped} 筆（已存在）`)
}

// ===== 2. 商品資料 =====
async function importProducts() {
  console.log("\n📦 匯入商品資料...")
  const rows = readExcel("商品資料20260401202113.xlsx")

  const { data: existing } = await supabase.from("products").select("code")
  const existingCodes = new Set((existing || []).map(p => p.code))

  let inserted = 0, skipped = 0
  for (const r of rows) {
    const code = clean(r["品號"])
    if (!code) continue
    if (existingCodes.has(code)) { skipped++; continue }

    const record = {
      code,
      name: clean(r["品名"]),
      unit: clean(r["單位"]) || "個",
      category: clean(r["商品分類"]),
      retail_price: cleanNum(r["零售價"]),
      discount_price: cleanNum(r["優惠價"]),
      cost_price: cleanNum(r["標準進價"]),
      safety_stock: cleanNum(r["安全存量"]),
      stock_qty: cleanNum(r["庫存量"]),
      barcode: clean(r["條碼編號"]),
      supplier: clean(r["主供應商"]),
    }

    const { error } = await supabase.from("products").insert([record])
    if (error) {
      console.log(`  ❌ ${code} ${record.name}: ${error.message}`)
    } else {
      inserted++
    }
  }
  console.log(`  ✅ 新增 ${inserted} 筆，跳過 ${skipped} 筆（已存在）`)
}

// ===== 3. 廠商資料 =====
async function importVendors() {
  console.log("\n🏭 匯入廠商資料...")
  const rows = readExcel("廠商資料20260401202111.xlsx")

  const { data: existing } = await supabase.from("vendors").select("code")
  const existingCodes = new Set((existing || []).map(v => v.code))

  let inserted = 0, skipped = 0
  for (const r of rows) {
    const code = clean(r["廠商代號"])
    if (!code) continue
    if (existingCodes.has(code)) { skipped++; continue }

    const record = {
      code,
      short_name: clean(r["廠商簡稱"]),
      phone: clean(r["電話"]),
      fax: clean(r["傳真"]),
      contact: clean(r["聯絡人"]),
      title: clean(r["職稱"]),
      mobile: clean(r["手機"]),
      tax_id: clean(r["統一編號"]),
    }

    const { error } = await supabase.from("vendors").insert([record])
    if (error) {
      console.log(`  ❌ ${code} ${record.short_name}: ${error.message}`)
    } else {
      inserted++
    }
  }
  console.log(`  ✅ 新增 ${inserted} 筆，跳過 ${skipped} 筆（已存在）`)
}

// ===== 4. 報價單 =====
async function importQuotations() {
  console.log("\n📝 匯入報價單...")
  const rows = readExcel("報價單20260401202029.xlsx")

  const { data: existing } = await supabase.from("quotations").select("quote_no")
  const existingNos = new Set((existing || []).map(q => q.quote_no))

  let inserted = 0, skipped = 0
  for (const r of rows) {
    const quoteNo = clean(r["單號"])
    if (!quoteNo) continue
    if (existingNos.has(quoteNo)) { skipped++; continue }

    const customerName = clean(r["客戶簡稱"]) || clean(r["潛在客戶"])
    const record = {
      quote_no: quoteNo,
      customer_name: customerName,
      quote_date: parseDate(r["日期"]),
      status: "draft",
      total: cleanNum(r["總金額"]),
      subtotal: cleanNum(r["總金額"]),
      tax_amount: 0,
      tax_type: "taxed",
      notes: clean(r["備註"]),
    }

    const { error } = await supabase.from("quotations").insert([record])
    if (error) {
      console.log(`  ❌ ${quoteNo}: ${error.message}`)
    } else {
      inserted++
    }
  }
  console.log(`  ✅ 新增 ${inserted} 筆，跳過 ${skipped} 筆（已存在）`)
}

// ===== 5. 銷貨單 =====
async function importSales() {
  console.log("\n💰 匯入銷貨單...")
  const rows = readExcel("銷貨單20260401202015.xlsx")

  const { data: existing } = await supabase.from("sales_orders").select("order_no")
  const existingNos = new Set((existing || []).map(s => s.order_no))

  let inserted = 0, skipped = 0
  for (const r of rows) {
    const orderNo = clean(r["單號"])
    if (!orderNo) continue
    if (existingNos.has(orderNo)) { skipped++; continue }

    const record = {
      order_no: orderNo,
      customer_name: clean(r["客戶簡稱"]),
      order_date: parseDate(r["日期"]),
      status: "completed",
      total: cleanNum(r["總金額"]),
      subtotal: cleanNum(r["總金額"]),
      tax_amount: 0,
      tax_type: "taxed",
      notes: clean(r["備註"]),
    }

    const { error } = await supabase.from("sales_orders").insert([record])
    if (error) {
      console.log(`  ❌ ${orderNo}: ${error.message}`)
    } else {
      inserted++
    }
  }
  console.log(`  ✅ 新增 ${inserted} 筆，跳過 ${skipped} 筆（已存在）`)
}

// ===== 6. 進貨單 =====
async function importPurchases() {
  console.log("\n📥 匯入進貨單...")
  const rows = readExcel("進貨單20260401202044.xlsx")

  const { data: existing } = await supabase.from("purchase_orders").select("po_no")
  const existingNos = new Set((existing || []).map(p => p.po_no))

  let inserted = 0, skipped = 0
  for (const r of rows) {
    const poNo = clean(r["單號"])
    if (!poNo) continue
    if (existingNos.has(poNo)) { skipped++; continue }

    const record = {
      po_no: poNo,
      vendor_name: clean(r["廠商簡稱"]),
      status: "completed",
    }

    const { error } = await supabase.from("purchase_orders").insert([record])
    if (error) {
      console.log(`  ❌ ${poNo}: ${error.message}`)
    } else {
      inserted++
    }
  }
  console.log(`  ✅ 新增 ${inserted} 筆，跳過 ${skipped} 筆（已存在）`)
}

// ===== 主程式 =====
async function main() {
  console.log("🚀 開始匯入進銷存資料...")
  console.log("⚠️  已存在的資料不會被覆蓋\n")

  await importCustomers()
  await importProducts()
  await importVendors()
  await importQuotations()
  await importSales()
  await importPurchases()

  console.log("\n🎉 全部匯入完成！")
}

main().catch(err => {
  console.error("匯入失敗:", err)
  process.exit(1)
})
