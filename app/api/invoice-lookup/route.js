import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url') || ''

  if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

  const result = { invoice_no: '', invoice_date: '', invoice_type: '電子發票', invoice_amount: '' }

  try {
    // Fetch the invoice page
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-TW,zh;q=0.9',
      },
      redirect: 'follow',
    })

    if (res.ok) {
      const html = await res.text()

      // Parse giveme.com.tw format
      // 發票號碼: TJ04872183
      const noMatch = html.match(/發票號碼[^<]*?<[^>]*>[\s]*([A-Z]{2}\d{8})/i)
        || html.match(/([A-Z]{2}\d{8})/i)
      if (noMatch) result.invoice_no = noMatch[1].toUpperCase()

      // 開立日期: 2025-10-15
      const dateMatch = html.match(/開立日期[^<]*?<[^>]*>[\s]*([\d]{4}-[\d]{2}-[\d]{2})/)
        || html.match(/開立日期[^<]*?<[^>]*>[\s]*([\d]{4}\/[\d]{2}\/[\d]{2})/)
      if (dateMatch) result.invoice_date = dateMatch[1].replace(/\//g, '-')

      // 發票金額: $3760
      const amtMatch = html.match(/發票金額[^<]*?<[^>]*>[\s]*\$?([\d,]+)/)
      if (amtMatch) result.invoice_amount = amtMatch[1].replace(/,/g, '')

      // Try extracting from table rows (giveme format: <td>header</td><td>value</td>)
      if (!result.invoice_no) {
        const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
        for (const row of rows) {
          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []
          if (cells.length >= 2) {
            const label = cells[0].replace(/<[^>]*>/g, '').trim()
            const value = cells[1].replace(/<[^>]*>/g, '').trim()

            if (label.includes('發票號碼') && /^[A-Z]{2}\d{8}$/i.test(value)) {
              result.invoice_no = value.toUpperCase()
            }
            if (label.includes('開立日期') && /\d{4}[-/]\d{2}[-/]\d{2}/.test(value)) {
              result.invoice_date = value.replace(/\//g, '-')
            }
            if (label.includes('發票金額')) {
              const amt = value.replace(/[$,\s]/g, '')
              if (/^\d+$/.test(amt)) result.invoice_amount = amt
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Invoice fetch error:', e.message)
  }

  // Fallback: try to find invoice number pattern in URL itself
  if (!result.invoice_no) {
    const m = url.match(/([A-Z]{2}\d{8})/i)
    if (m) result.invoice_no = m[1].toUpperCase()
  }

  return NextResponse.json(result)
}
