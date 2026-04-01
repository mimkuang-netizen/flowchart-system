/**
 * 進貨單 PDF 匯入腳本
 * 解析 PDF 中的進貨單（含表頭 + 明細品項），匯入 receiving_orders + receiving_order_items
 */

import { createClient } from "@supabase/supabase-js"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import fs from "fs"

const SUPABASE_URL = "https://ydxpvjerhjuldinvtxvv.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeHB2amVyaGp1bGRpbnZ0eHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTkyMzYsImV4cCI6MjA5MDA5NTIzNn0.IQt2_W3XXbANYUTVz1Y989PiFn_yqR1D0p27-WnN2SI"
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const PDF_PATH = "/Users/smartai/Downloads/cdc7bc53-963e-4240-a8d8-788b456532f8.pdf"

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

function parseReceiving(lines) {
  const lineTexts = lines.map(l => l.text)
  let receiptNo = "", receiptDate = "", vendorName = ""
  let subtotal = 0, taxAmount = 0, total = 0, notes = ""

  for (const line of lineTexts) {
    const rnoMatch = line.match(/進貨單號[：:]?\s*(\d+)/)
    if (rnoMatch) receiptNo = rnoMatch[1]

    const dateMatch = line.match(/進貨日期[：:]?\s*([\d/]+)/)
    if (dateMatch) receiptDate = dateMatch[1].replace(/\//g, "-")

    const vendorMatch = line.match(/廠商名稱[：:]?\s*(.+?)(?:\(|（|$)/)
    if (vendorMatch) vendorName = vendorMatch[1].trim()

    const subMatch = line.match(/金\s*額[：:]?\s*([\d,]+)/)
    if (subMatch) subtotal = Number(subMatch[1].replace(/,/g, ""))

    const taxMatch = line.match(/稅\s*額[：:]?\s*([\d,]+)/)
    if (taxMatch) taxAmount = Number(taxMatch[1].replace(/,/g, ""))

    const totalMatch = line.match(/總金額[：:]?\s*([\d,]+)/)
    if (totalMatch) total = Number(totalMatch[1].replace(/,/g, ""))
  }

  // Find 備註
  for (const line of lineTexts) {
    const noteMatch = line.match(/備註[：:]?\s*(.+)/)
    if (noteMatch && !noteMatch[1].includes("品號") && !noteMatch[1].includes("品名") && noteMatch[1].trim()) {
      notes = noteMatch[1].trim()
    }
  }

  // Parse items - numbers may be on separate lines from product info
  const items = []
  let inItems = false
  const unitList = ["片", "個", "組", "才", "張", "箱", "趟", "式", "支", "塊", "套", "台", "捲", "包", "尺", "卷", "條"]

  // First pass: collect all item data by merging product lines with their number lines
  const itemBlocks = []
  let currentBlock = null

  for (let i = 0; i < lines.length; i++) {
    const lineText = lineTexts[i]

    if (lineText.includes("品號") && lineText.includes("品名")) {
      inItems = true
      continue
    }
    if (!inItems) continue
    if (lineText.includes("備註") && lineText.includes("金") && lineText.includes("額")) break
    if (lineText.includes("總金額")) break
    if (lineText.trim() === "") continue

    const positioned = lines[i].items
    if (positioned.length === 0) continue
    // Skip empty text items to find real first item
    const firstItem = positioned.find(p => p.text.trim() !== "") || positioned[0]
    const lineStart = firstItem.text.trim()

    // Check if this line is a number-only line (quantity, price, amount)
    // Allow remark text like "72*72CM" at the end (x > 480)
    const allNums = positioned.every(p => {
      const cleaned = p.text.replace(/,/g, "").trim()
      return cleaned === "" || /^-?\d+\.?\d*$/.test(cleaned) || p.x >= 480
    })

    if (allNums && positioned.some(p => /\d/.test(p.text)) && currentBlock) {
      // This is a number line - attach to current block
      for (const p of positioned) {
        const cleaned = p.text.replace(/,/g, "").trim()
        if (/^-?\d+\.?\d*$/.test(cleaned)) {
          currentBlock.nums.push({ val: Number(cleaned), x: p.x })
        }
      }
      continue
    }

    // Check if this is a product code line
    if (/^[A-Z0-9]/.test(lineStart) && lineStart.length >= 2 && lineStart.length <= 20) {
      // Save previous block
      if (currentBlock) itemBlocks.push(currentBlock)

      currentBlock = { code: lineStart, textParts: [], unit: "", nums: [] }

      for (const p of positioned) {
        const cleaned = p.text.replace(/,/g, "").trim()
        if (p.x > firstItem.x + 10) {
          if (/^-?\d+\.?\d*$/.test(cleaned)) {
            currentBlock.nums.push({ val: Number(cleaned), x: p.x })
          } else if (unitList.includes(cleaned)) {
            currentBlock.unit = cleaned
          } else if (cleaned.includes("台南") || cleaned.includes("工廠") || cleaned.includes("倉庫") || cleaned === "廠") {
            // Skip warehouse
          } else {
            currentBlock.textParts.push(cleaned)
          }
        }
      }
      continue
    }

    // Continuation line (warehouse text, product name continuation, etc.)
    if (currentBlock) {
      for (const p of positioned) {
        const cleaned = p.text.trim()
        if (cleaned && !unitList.includes(cleaned)) {
          if (cleaned.includes("台南") || cleaned.includes("工廠") || cleaned === "廠" || cleaned.includes("倉庫")) {
            // Skip warehouse
          } else if (/^-?\d+\.?\d*$/.test(cleaned.replace(/,/g, ""))) {
            currentBlock.nums.push({ val: Number(cleaned.replace(/,/g, "")), x: p.x })
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

    items.push({
      product_code: block.code,
      product_name: block.textParts.join(""),
      unit: block.unit || "個",
      quantity,
      unit_price: unitPrice,
      amount,
    })
  }

  return {
    header: {
      receipt_no: receiptNo,
      vendor_name: vendorName,
      receipt_date: receiptDate || null,
      status: "confirmed",
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
  console.log("🚀 開始匯入進貨單 PDF...")

  const data = new Uint8Array(fs.readFileSync(PDF_PATH))
  const doc = await getDocument({ data }).promise
  console.log(`📄 PDF 共 ${doc.numPages} 頁`)

  const { data: existingOrders } = await supabase.from("receiving_orders").select("id, receipt_no")
  const { data: existingItems } = await supabase.from("receiving_order_items").select("receipt_id")
  const orderMap = new Map()
  const idsWithItems = new Set((existingItems || []).map(i => i.receipt_id))
  for (const o of (existingOrders || [])) {
    orderMap.set(o.receipt_no, { id: o.id, hasItems: idsWithItems.has(o.id) })
  }
  console.log(`📋 資料庫已有 ${orderMap.size} 筆，其中 ${idsWithItems.size} 筆有明細`)

  // Parse all pages
  const receivings = new Map()
  for (let p = 1; p <= doc.numPages; p++) {
    if (p % 20 === 0) console.log(`  解析中... 第 ${p}/${doc.numPages} 頁`)
    const page = await doc.getPage(p)
    const lines = await getPageLines(page)
    const parsed = parseReceiving(lines)

    if (!parsed.header.receipt_no) {
      console.log(`  ⚠️ 第 ${p} 頁無法解析單號，跳過`)
      continue
    }

    const rno = parsed.header.receipt_no
    if (receivings.has(rno)) {
      receivings.get(rno).items.push(...parsed.items)
    } else {
      receivings.set(rno, parsed)
    }
  }

  console.log(`\n📝 解析出 ${receivings.size} 張進貨單`)

  let inserted = 0, updated = 0, skipped = 0, errors = 0

  for (const [rno, rec] of receivings) {
    const existing = orderMap.get(rno)

    if (existing && existing.hasItems) {
      skipped++
      continue
    }

    if (existing && !existing.hasItems) {
      // Update header + add items
      const { error: hErr } = await supabase.from("receiving_orders").update(rec.header).eq("id", existing.id)
      if (hErr) { console.log(`  ❌ ${rno} 更新失敗: ${hErr.message}`); errors++; continue }

      if (rec.items.length > 0) {
        const itemRows = rec.items.map((item, i) => ({ ...item, receipt_id: existing.id, sort_order: i }))
        const { error: iErr } = await supabase.from("receiving_order_items").insert(itemRows)
        if (iErr) console.log(`  ⚠️ ${rno} 明細失敗: ${iErr.message}`)
      }
      updated++
    } else {
      // New - insert
      const { data: order, error } = await supabase.from("receiving_orders").insert([rec.header]).select().single()
      if (error) { console.log(`  ❌ ${rno}: ${error.message}`); errors++; continue }

      if (rec.items.length > 0) {
        const itemRows = rec.items.map((item, i) => ({ ...item, receipt_id: order.id, sort_order: i }))
        const { error: iErr } = await supabase.from("receiving_order_items").insert(itemRows)
        if (iErr) console.log(`  ⚠️ ${rno} 明細失敗: ${iErr.message}`)
      }
      inserted++
    }
  }

  console.log(`\n🎉 匯入完成！`)
  console.log(`  ✅ 新增 ${inserted} 筆`)
  console.log(`  🔄 補明細 ${updated} 筆`)
  console.log(`  ⏭️ 跳過 ${skipped} 筆（已完整）`)
  if (errors > 0) console.log(`  ❌ 失敗 ${errors} 筆`)
}

main().catch(err => { console.error("匯入失敗:", err); process.exit(1) })
