/**
 * 報價單 PDF 匯入腳本
 * 解析 PDF 中的報價單（含表頭 + 明細品項），匯入 quotations + quotation_items
 * 已存在的報價單（依 quote_no 判斷）不會覆蓋
 */

import { createClient } from "@supabase/supabase-js"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import fs from "fs"

const SUPABASE_URL = "https://ydxpvjerhjuldinvtxvv.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeHB2amVyaGp1bGRpbnZ0eHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTkyMzYsImV4cCI6MjA5MDA5NTIzNn0.IQt2_W3XXbANYUTVz1Y989PiFn_yqR1D0p27-WnN2SI"
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const PDF_PATH = "/Users/smartai/Downloads/報價單.pdf"

// Extract text lines from a PDF page, grouped by Y position
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

// Parse a quotation from page lines
function parseQuotation(lines) {
  const lineTexts = lines.map(l => l.text)
  const fullText = lineTexts.join("\n")

  // Extract header info
  let quoteNo = "", quoteDate = "", validUntil = "", customerName = ""
  let subtotal = 0, taxAmount = 0, total = 0, notes = ""

  for (const line of lineTexts) {
    const qnoMatch = line.match(/報價單號[：:]?\s*(\d+)/)
    if (qnoMatch) quoteNo = qnoMatch[1]

    const dateMatch = line.match(/報價日期[：:]?\s*([\d/]+)/)
    if (dateMatch) quoteDate = dateMatch[1].replace(/\//g, "-")

    const validMatch = line.match(/有效日期[：:]?\s*([\d/]+)/)
    if (validMatch) validUntil = validMatch[1].replace(/\//g, "-")

    const custMatch = line.match(/客戶名稱[：:]?\s*(.+?)(?:\(|（|$)/)
    if (custMatch) customerName = custMatch[1].trim()

    const subtotalMatch = line.match(/合計金額\s*([\d,]+)/)
    if (subtotalMatch) subtotal = Number(subtotalMatch[1].replace(/,/g, ""))

    const taxMatch = line.match(/稅\s*額\s*([\d,]+)/)
    if (taxMatch) taxAmount = Number(taxMatch[1].replace(/,/g, ""))

    const totalMatch = line.match(/總金額\s*([\d,]+)/)
    if (totalMatch) total = Number(totalMatch[1].replace(/,/g, ""))
  }

  // Find 備註 line
  for (const line of lineTexts) {
    const noteMatch = line.match(/備註[：:]?\s*(.+)/)
    if (noteMatch && !noteMatch[1].includes("備註")) {
      notes = noteMatch[1].trim()
    }
  }

  // Parse item rows - find lines between header row (品號) and 備註/合計
  const items = []
  let inItems = false

  for (let i = 0; i < lines.length; i++) {
    const lineText = lineTexts[i]

    if (lineText.includes("品號") && lineText.includes("品名")) {
      inItems = true
      continue
    }

    if (inItems) {
      if (lineText.includes("備註") || lineText.includes("合計金額") ||
          lineText.includes("條款及細則") || lineText.includes("稅") ||
          lineText.includes("總金額") || lineText.trim() === "") {
        // Check if this is a continuation line (no product code at start)
        continue
      }

      // Try to parse as item line using positioned items
      const positioned = lines[i].items
      if (positioned.length === 0) continue

      // Product code is at x < 100 typically
      // Check if this line starts with a product code pattern
      const firstItem = positioned[0]
      const lineStart = firstItem.text.trim()

      // Product codes: MA05, M939, MZ01, M224-001, 5D01, etc.
      if (/^[A-Z0-9]/.test(lineStart) && lineStart.length >= 2 && lineStart.length <= 15) {
        // This is likely an item line
        // Parse numbers from the right side
        const nums = []
        for (const p of positioned) {
          const cleaned = p.text.replace(/,/g, "").trim()
          if (/^-?\d+\.?\d*$/.test(cleaned)) {
            nums.push({ val: Number(cleaned), x: p.x })
          }
        }

        // Extract product name - text between code and unit
        let productName = ""
        let unit = ""
        let remark = ""

        // Find text items that are the product name (between code and numbers)
        const textParts = []
        for (const p of positioned) {
          const cleaned = p.text.replace(/,/g, "").trim()
          if (p.x > firstItem.x + 10 && !/^-?\d+\.?\d*$/.test(cleaned)) {
            if (cleaned === "片" || cleaned === "個" || cleaned === "組" || cleaned === "才" ||
                cleaned === "張" || cleaned === "箱" || cleaned === "趟" || cleaned === "式" ||
                cleaned === "支" || cleaned === "塊" || cleaned === "套") {
              unit = cleaned
            } else if (p.x > 450) {
              // Likely remark column
              remark = cleaned
            } else {
              textParts.push(cleaned)
            }
          }
        }
        productName = textParts.join("")

        // nums should be: quantity, unit_price, amount (sorted by x position)
        let quantity = 0, unitPrice = 0, amount = 0
        if (nums.length >= 3) {
          // Sort by x position
          nums.sort((a, b) => a.x - b.x)
          quantity = nums[0].val
          unitPrice = nums[1].val
          amount = nums[2].val
        } else if (nums.length === 2) {
          quantity = nums[0].val
          amount = nums[1].val
        }

        // Check if next line(s) are continuation of product name
        let j = i + 1
        while (j < lines.length) {
          const nextText = lineTexts[j].trim()
          if (!nextText || nextText.includes("備註") || nextText.includes("合計") ||
              nextText.includes("條款") || nextText.includes("稅") || nextText.includes("總金額")) break

          const nextFirst = lines[j].items[0]?.text.trim() || ""
          // If next line doesn't start with a product code, it's continuation
          if (/^[A-Z0-9]/.test(nextFirst) && nextFirst.length >= 2 && nextFirst.length <= 15) {
            // Check if it has numbers - if yes, it's a new item
            const hasNums = lines[j].items.some(p => /^-?\d+\.?\d*$/.test(p.text.replace(/,/g, "").trim()))
            if (hasNums) break
          }

          // It's a continuation line
          const contParts = []
          let contRemark = ""
          for (const p of lines[j].items) {
            const cleaned = p.text.trim()
            if (cleaned && cleaned !== unit) {
              if (p.x > 450) {
                contRemark += cleaned
              } else {
                contParts.push(cleaned)
              }
            }
          }
          if (contParts.length > 0) productName += contParts.join("")
          if (contRemark) remark += contRemark
          j++
        }

        if (lineStart && (productName || amount)) {
          items.push({
            product_code: lineStart,
            product_name: productName,
            unit: unit || "片",
            quantity,
            unit_price: unitPrice,
            amount,
            remark,
          })
        }
      }
    }
  }

  return {
    header: {
      quote_no: quoteNo,
      customer_name: customerName,
      quote_date: quoteDate || null,
      valid_until: validUntil || null,
      status: "draft",
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
  console.log("🚀 開始匯入報價單 PDF...")

  const data = new Uint8Array(fs.readFileSync(PDF_PATH))
  const doc = await getDocument({ data }).promise
  console.log(`📄 PDF 共 ${doc.numPages} 頁`)

  // Get existing quote numbers
  const { data: existing } = await supabase.from("quotations").select("quote_no")
  const existingNos = new Set((existing || []).map(q => q.quote_no))
  console.log(`📋 資料庫已有 ${existingNos.size} 筆報價單`)

  // Group pages by quote_no (some quotes span multiple pages)
  const quotations = new Map() // quote_no -> { header, items[] }

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const lines = await getPageLines(page)
    const parsed = parseQuotation(lines)

    if (!parsed.header.quote_no) {
      console.log(`  ⚠️ 第 ${p} 頁無法解析單號，跳過`)
      continue
    }

    const qno = parsed.header.quote_no
    if (quotations.has(qno)) {
      // Multi-page quote - append items
      quotations.get(qno).items.push(...parsed.items)
    } else {
      quotations.set(qno, parsed)
    }
  }

  console.log(`\n📝 解析出 ${quotations.size} 張報價單`)

  let inserted = 0, skipped = 0, errors = 0
  for (const [qno, qt] of quotations) {
    if (existingNos.has(qno)) {
      skipped++
      continue
    }

    // Insert header
    const { data: quote, error } = await supabase
      .from("quotations")
      .insert([qt.header])
      .select()
      .single()

    if (error) {
      console.log(`  ❌ ${qno} (${qt.header.customer_name}): ${error.message}`)
      errors++
      continue
    }

    // Insert items
    if (qt.items.length > 0) {
      const itemRows = qt.items.map((item, i) => ({
        quote_id: quote.id,
        product_code: item.product_code,
        product_name: item.product_name,
        unit: item.unit,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: 100,
        amount: item.amount,
        remark: item.remark,
        sort_order: i,
      }))

      const { error: itemErr } = await supabase.from("quotation_items").insert(itemRows)
      if (itemErr) {
        console.log(`  ⚠️ ${qno} 品項匯入失敗: ${itemErr.message}`)
      }
    }

    inserted++
    if (inserted % 10 === 0) console.log(`  ✅ 已匯入 ${inserted} 筆...`)
  }

  console.log(`\n🎉 匯入完成！`)
  console.log(`  ✅ 新增 ${inserted} 筆`)
  console.log(`  ⏭️ 跳過 ${skipped} 筆（已存在）`)
  if (errors > 0) console.log(`  ❌ 失敗 ${errors} 筆`)
}

main().catch(err => {
  console.error("匯入失敗:", err)
  process.exit(1)
})
