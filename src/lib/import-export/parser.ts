import * as XLSX from 'xlsx'
import type { ParseResult } from './types'

export async function parseFile(file: File): Promise<ParseResult> {
  const ext = file.name.toLowerCase().split('.').pop()
  if (ext === 'csv') return parseCSV(file)
  if (ext === 'xlsx' || ext === 'xls') return parseXLSX(file)
  throw new Error(`Formato não suportado: .${ext}`)
}

async function parseXLSX(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })

  // Use first non-meta sheet
  const sheetName = wb.SheetNames.find((n) => !n.startsWith('_')) ?? wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  if (!ws) return { headers: [], rows: [], totalRows: 0 }

  const raw = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, {
    header: 1,
    defval: '',
    blankrows: false,
  })
  if (raw.length === 0) return { headers: [], rows: [], totalRows: 0 }

  // Find the header row — first row with ≥ 2 non-empty cells in the first 6 rows
  // This allows skipping title/branding rows that were added during professional export
  let headerRowIdx = 0
  for (let i = 0; i < Math.min(6, raw.length); i++) {
    const nonEmpty = raw[i].filter((c) => c !== '' && c != null).length
    if (nonEmpty >= 2) {
      headerRowIdx = i
      break
    }
  }

  const headers = (raw[headerRowIdx] as (string | number | null)[])
    .map((h) => String(h ?? '').trim())
    .filter(Boolean)

  const dataRows = raw.slice(headerRowIdx + 1) as (string | number | boolean | null)[][]

  const rows: Record<string, string>[] = dataRows
    .filter((row) => row.some((c) => c !== '' && c != null))
    .map((row) => {
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => {
        obj[h] = String(row[i] ?? '').trim()
      })
      return obj
    })

  return { headers, rows, totalRows: rows.length }
}

async function parseCSV(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()
  // Handle UTF-8 BOM
  const bytes = new Uint8Array(buffer)
  const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
  const text = new TextDecoder('utf-8').decode(hasBom ? buffer.slice(3) : buffer)

  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return { headers: [], rows: [], totalRows: 0 }

  const headers = parseCSVRow(lines[0]).map((h) => h.trim())

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVRow(lines[i])
    if (cells.every((c) => c === '')) continue
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? '').trim()
    })
    rows.push(obj)
  }

  return { headers, rows, totalRows: rows.length }
}

function parseCSVRow(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuote = false
  // Support both comma and semicolon as delimiters
  const delimiter = line.includes(';') && !line.includes(',') ? ';' : ','

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuote = !inQuote
      }
    } else if (ch === delimiter && !inQuote) {
      cells.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current)
  return cells
}
