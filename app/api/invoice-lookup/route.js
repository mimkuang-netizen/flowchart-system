import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url') || ''

  if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

  // Parse invoice number from common e-invoice URLs
  // Format 1: https://www.einvoice.nat.gov.tw/APCONSUMER/BTC501W?...&invNum=ZJ86347899&...
  // Format 2: URL contains invoice number pattern like XX12345678
  const result = { invoice_no: '', invoice_date: '', invoice_type: '電子發票' }

  // Try to extract invoice number from URL params
  try {
    const parsed = new URL(url)
    const invNum = parsed.searchParams.get('invNum') || parsed.searchParams.get('invoiceNumber') || ''
    if (invNum) result.invoice_no = invNum

    const invDate = parsed.searchParams.get('invDate') || parsed.searchParams.get('invoiceDate') || ''
    if (invDate) {
      // Convert YYYY/MM/DD or YYYYMMDD to YYYY-MM-DD
      const cleaned = invDate.replace(/\//g, '-')
      if (cleaned.length === 8 && !cleaned.includes('-')) {
        result.invoice_date = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`
      } else {
        result.invoice_date = cleaned
      }
    }
  } catch {}

  // Fallback: try to find invoice number pattern in URL itself
  if (!result.invoice_no) {
    const m = url.match(/([A-Z]{2}\d{8})/i)
    if (m) result.invoice_no = m[1].toUpperCase()
  }

  return NextResponse.json(result)
}
