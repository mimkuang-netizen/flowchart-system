import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url') || ''

  if (!url) return NextResponse.json({ error: '請提供發票連結' }, { status: 400 })

  const result = { invoice_no: '', invoice_date: '', invoice_type: '電子發票', amount: '', seller_name: '', carrier: '', url }

  try {
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
      const trBlocks = html.match(/<div\s+class="tr"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi)
        || html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi)
        || []

      for (const block of trBlocks) {
        const thMatch = block.match(/<div\s+class="th"[^>]*>([\s\S]*?)<\/div>/i)
          || block.match(/<td[^>]*>([\s\S]*?)<\/td>/i)
        const tdMatches = block.match(/<div\s+class="td"[^>]*>([\s\S]*?)<\/div>/gi)
          || block.match(/<td[^>]*>([\s\S]*?)<\/td>/gi)
        if (!thMatch || !tdMatches || tdMatches.length < 2) continue

        const label = thMatch[1].replace(/<[^>]*>/g, '').trim()
        const value = tdMatches[tdMatches.length - 1].replace(/<[^>]*>/g, '').trim()

        if (label.includes('發票號碼') && /^[A-Z]{2}\d{8}$/i.test(value)) {
          result.invoice_no = value.toUpperCase()
        }
        if (label.includes('開立日期') && /\d{4}[-/]\d{2}[-/]\d{2}/.test(value)) {
          result.invoice_date = value.replace(/\//g, '-')
        }
        if (label.includes('發票金額')) {
          const amt = value.replace(/[$,\s]/g, '')
          if (/^\d+$/.test(amt)) result.amount = amt
        }
        if (label.includes('賣方') && label.includes('名稱')) {
          result.seller_name = value
        }
        if (label.includes('載具')) {
          result.carrier = value
        }
      }

      // Also try regex fallback on raw text
      if (!result.invoice_no) {
        const m = html.match(/([A-Z]{2}\d{8})/i)
        if (m) result.invoice_no = m[1].toUpperCase()
      }
      if (!result.invoice_date) {
        const m = html.match(/開立日期[\s\S]*?(\d{4}[-/]\d{2}[-/]\d{2})/)
        if (m) result.invoice_date = m[1].replace(/\//g, '-')
      }
      if (!result.amount) {
        const m = html.match(/發票金額[\s\S]*?\$?([\d,]+)/)
        if (m) result.amount = m[1].replace(/,/g, '')
      }
    }
  } catch (e) {
    console.error('Invoice fetch error:', e.message)
  }

  return NextResponse.json(result)
}
