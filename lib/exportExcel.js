import * as XLSX from 'xlsx'

export function exportToExcel(data, columns, filename) {
  // columns = [{ header: "客戶代號", key: "code" }, ...]
  const headers = columns.map(c => c.header)
  const rows = data.map(row => columns.map(c => {
    const val = row[c.key]
    if (c.format === 'money') return Number(val) || 0
    if (c.format === 'date') return val ? new Date(val).toLocaleDateString('zh-TW') : ''
    return val ?? ''
  }))

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Auto column width
  ws['!cols'] = columns.map((c, i) => {
    const maxLen = Math.max(c.header.length * 2, ...rows.map(r => String(r[i]).length))
    return { wch: Math.min(Math.max(maxLen + 2, 8), 40) }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
