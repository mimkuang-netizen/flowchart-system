/**
 * 銷貨單 PDF 匯入腳本
 * 解析 PDF 中的銷貨單（含表頭 + 明細品項），匯入 sales_orders + sales_order_items
 * - 新單號 → 新增表頭 + 明細
 * - 已存在但無明細 → 更新表頭 + 補明細
 * - 已存在且有明細 → 跳過
 */

import { createClient } from "@supabase/supabase-js"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import fs from "fs"

const SUPABASE_URL = "https://ydxpvjerhjuldinvtxvv.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeHB2amVyaGp1bGRpbnZ0eHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTkyMzYsImV4cCI6MjA5MDA5NTIzNn0.IQt2_W3XXbANYUTVz1Y989PiFn_yqR1D0p27-WnN2SI"
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const PDF_PATH = "/Users/smartai/Downloads/SalesVoucher20260401204731.pdf"

async function getPageLines(page) {
  const content = await page.getTextContent()
  const lines = []
  let currentLine = []
  let lastY = null

  for (const item of content.items) {
    const y = Math.round(item.transform[5])
    if (lastY !== null && Math.abs(y - lastY) > 3) {
      lines.push(currentLine.map(i => ({ text: i.str, x: Math.round(i.transform[4]) })))
      currentLine = []
    }
    currentLine.push(item)
    lastY = y
  }
  if (currentLine.length > 0) {
    lines.push(currentLine.map(i => ({ text: i.str, x: Math.round(i.transform[4]) })))
  }

  return lines.map(items => {
    const sorted = items.sort((a, b) => a.x - b.x)
    return { text: sorted.map(i => i.text).join(""), items: sorted }
  })
}

function parseSalesOrder(lines) {
  const lineTexts = lines.map(l => l.text)

  let orderNo = "", orderDate = "", customerName = ""
  let subtotal = 0, taxAmount = 0, total = 0, notes = ""

  for (const line of lineTexts) {
    const onoMatch = line.match(/銷貨單號[：:]?\s*(\d+)/)
    if (onoMatch) orderNo = onoMatch[1]

    const dateMatch = line.match(/銷貨日期[：:]?\s*([\d/]+)/)
    if (dateMatch) orderDate = dateMatch[1].replace(/\//g, "-")

    const custMatch = line.match(/客戶名稱[：:]?\s*(.+?)(?:\(|（|$)/)
    if (custMatch) customerName = custMatch[1].trim()

    const subtotalMatch = line.match(/合計金額\s*([\d,]+)/)
    if (subtotalMatch) subtotal = Number(subtotalMatch[1].replace(/,/g, ""))

    const taxMatch = line.match(/稅\s*額\s*([\d,]+)/)
    if (taxMatch) taxAmount = Number(taxMatch[1].replace(/,/g, ""))

    const totalMatch = line.match(/總金額\s*([\d,]+)/)
    if (totalMatch) total = Number(totalMatch[1].replace(/,/g, ""))
  }

  // Find 備註
  for (const line of lineTexts) {
    const noteMatch = line.match(/備註[：:]?\s*(.+)/)
    if (noteMatch && !noteMatch[1].includes("品號") && !noteMatch[1].includes("品名")) {
      notes = noteMatch[1].trim()
    }
  }

  // Parse items using block-based approach (handles text/numbers on separate lines)
  const items = []
  let inItems = false
  const unitList = ["片", "個", "組", "才", "張", "箱", "趟", "式", "支", "塊", "套", "台", "捲", "包", "尺", "卷", "條"]
  const itemBlocks = []
  let currentBlock = null

  for (let i = 0; i < lines.length; i++) {
    const lineText = lineTexts[i]

    if (lineText.includes("品號") && (lineText.includes("品名") || lineText.includes("商品"))) {
      inItems = true
      continue
    }
    if (!inItems) continue

    // Break conditions
    const firstReal = lines[i].items.find(p => p.text.trim() !== "")
    const firstText = firstReal?.text.trim() || ""
    if (firstText.startsWith("備註")) break
    if (lineText.includes("合計金額") || lineText.includes("總金額")) break
    if (lineText.includes("業務員") || lineText.includes("客戶簽收") || lineText.includes("條款")) break
    if (lineText.trim() === "") continue

    const positioned = lines[i].items
    if (positioned.length === 0) continue
    const firstItem = positioned.find(p => p.text.trim() !== "") || positioned[0]
    const lineStart = firstItem.text.trim()

    // Check if this line is a number-only line (quantity, price, amount)
    // Allow remark text at x >= 478
    const allNums = positioned.every(p => {
      const cleaned = p.text.replace(/,/g, "").trim()
      return cleaned === "" || /^-?\d+\.?\d*$/.test(cleaned) || p.x >= 478
    })

    if (allNums && positioned.some(p => /\d/.test(p.text)) && currentBlock) {
      // Number line - attach to current block
      for (const p of positioned) {
        const cleaned = p.text.replace(/,/g, "").trim()
        if (/^-?\d+\.?\d*$/.test(cleaned)) {
          currentBlock.nums.push({ val: Number(cleaned), x: p.x })
        }
      }
      continue
    }

    // Check if this is a product code line
    if (/^[A-Z0-9]/.test(lineStart) && lineStart.length >= 2 && lineStart.length <= 15) {
      if (currentBlock) itemBlocks.push(currentBlock)
      currentBlock = { code: lineStart, textParts: [], unit: "", nums: [], remark: "" }

      for (const p of positioned) {
        const cleaned = p.text.replace(/,/g, "").trim()
        if (p.x > firstItem.x + 10) {
          if (/^-?\d+\.?\d*$/.test(cleaned)) {
            currentBlock.nums.push({ val: Number(cleaned), x: p.x })
          } else if (unitList.includes(cleaned)) {
            currentBlock.unit = cleaned
          } else if (p.x >= 478) {
            currentBlock.remark += cleaned
          } else {
            currentBlock.textParts.push(cleaned)
          }
        }
      }
      continue
    }

    // Continuation line (product name overflow, unit line, number line, etc.)
    if (currentBlock) {
      for (const p of positioned) {
        const cleaned = p.text.trim()
        if (cleaned) {
          if (unitList.includes(cleaned)) {
            currentBlock.unit = cleaned
          } else if (/^-?\d+\.?\d*$/.test(cleaned.replace(/,/g, ""))) {
            currentBlock.nums.push({ val: Number(cleaned.replace(/,/g, "")), x: p.x })
          } else if (p.x >= 478) {
            currentBlock.remark += cleaned
          } else {
            currentBlock.textParts.push(cleaned)
          }
        }
      }
    }
  }
  if (currentBlock) itemBlocks.push(currentBlock)

  // Convert blocks to items
  for (const block of itemBlocks) {
    let quantity = 0, unitPrice = 0, amount = 0
    if (block.nums.length >= 3) {
      block.nums.sort((a, b) => a.x - b.x)
      quantity = block.nums[0].val
      unitPrice = block.nums[1].val
      amount = block.nums[2].val
    } else if (block.nums.length === 2) {
      block.nums.sort((a, b) => a.x - b.x)
      quantity = block.nums[0].val
      amount = block.nums[1].val
    }

    if (block.code && (block.textParts.length > 0 || amount)) {
      items.push({
        product_code: block.code,
        product_name: block.textParts.join(""),
        unit: block.unit || "片",
        quantity,
        unit_price: unitPrice,
        discount: 100,
        amount,
        remark: block.remark,
      })
    }
  }

  return {
    header: {
      order_no: orderNo,
      customer_name: customerName,
      order_date: orderDate || null,
      status: "completed",
      tax_type: taxAmount > 0 ? "taxed" : "tax_free",
      subtotal,
      tax_amount: taxAmount,
      total,
      notes,
    },
    items,
  }
}

async function main() {
  console.log("🚀 開始匯入銷貨單 PDF...")

  const data = new Uint8Array(fs.readFileSync(PDF_PATH))
  const doc = await getDocument({ data }).promise
  console.log(`📄 PDF 共 ${doc.numPages} 頁`)

  // Get existing orders and their item status
  const { data: existingOrders } = await supabase.from("sales_orders").select("id, order_no")
  const { data: existingItems } = await supabase.from("sales_order_items").select("order_id")
  const orderMap = new Map() // order_no -> { id, hasItems }
  const orderIdsWithItems = new Set((existingItems || []).map(i => i.order_id))
  for (const o of (existingOrders || [])) {
    orderMap.set(o.order_no, { id: o.id, hasItems: orderIdsWithItems.has(o.id) })
  }
  console.log(`📋 資料庫已有 ${orderMap.size} 筆銷貨單，其中 ${orderIdsWithItems.size} 筆有明細`)

  // Parse all pages
  const salesOrders = new Map()
  for (let p = 1; p <= doc.numPages; p++) {
    if (p % 50 === 0) console.log(`  解析中... 第 ${p}/${doc.numPages} 頁`)
    const page = await doc.getPage(p)
    const lines = await getPageLines(page)
    const parsed = parseSalesOrder(lines)

    if (!parsed.header.order_no) {
      console.log(`  ⚠️ 第 ${p} 頁無法解析單號，跳過`)
      continue
    }

    const ono = parsed.header.order_no
    if (salesOrders.has(ono)) {
      salesOrders.get(ono).items.push(...parsed.items)
    } else {
      salesOrders.set(ono, parsed)
    }
  }

  console.log(`\n📝 解析出 ${salesOrders.size} 張銷貨單`)

  let inserted = 0, updated = 0, skipped = 0, errors = 0

  for (const [ono, so] of salesOrders) {
    const existing = orderMap.get(ono)

    if (existing && existing.hasItems) {
      skipped++
      continue
    }

    if (existing && !existing.hasItems) {
      // Update header + add items
      const { error: hErr } = await supabase.from("sales_orders").update(so.header).eq("id", existing.id)
      if (hErr) { console.log(`  ❌ ${ono} 更新失敗: ${hErr.message}`); errors++; continue }

      if (so.items.length > 0) {
        const itemRows = so.items.map((item, i) => ({ ...item, order_id: existing.id, sort_order: i }))
        const { error: iErr } = await supabase.from("sales_order_items").insert(itemRows)
        if (iErr) console.log(`  ⚠️ ${ono} 明細匯入失敗: ${iErr.message}`)
      }
      updated++
    } else {
      // New order - insert header + items
      const { data: order, error } = await supabase.from("sales_orders").insert([so.header]).select().single()
      if (error) { console.log(`  ❌ ${ono}: ${error.message}`); errors++; continue }

      if (so.items.length > 0) {
        const itemRows = so.items.map((item, i) => ({ ...item, order_id: order.id, sort_order: i }))
        const { error: iErr } = await supabase.from("sales_order_items").insert(itemRows)
        if (iErr) console.log(`  ⚠️ ${ono} 明細匯入失敗: ${iErr.message}`)
      }
      inserted++
    }

    if ((inserted + updated) % 20 === 0 && (inserted + updated) > 0) {
      console.log(`  進度: 新增 ${inserted}, 補明細 ${updated}, 跳過 ${skipped}...`)
    }
  }

  console.log(`\n🎉 匯入完成！`)
  console.log(`  ✅ 新增 ${inserted} 筆`)
  console.log(`  🔄 補明細 ${updated} 筆`)
  console.log(`  ⏭️ 跳過 ${skipped} 筆（已完整）`)
  if (errors > 0) console.log(`  ❌ 失敗 ${errors} 筆`)
}

main().catch(err => {
  console.error("匯入失敗:", err)
  process.exit(1)
})
