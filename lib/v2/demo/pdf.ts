/**
 * Minimal PDF generator for the demo corpus.
 *
 * Builds a valid, uncompressed PDF (Helvetica, letter pages) from plain
 * page text so the "Original file" view and page-accurate evidence
 * navigation work against the curated corpus. Paragraph text is used
 * verbatim — these are the same canonical blocks the pipeline indexes,
 * so the physical page a citation names actually contains the quoted
 * passage.
 */

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN_X = 72
const MARGIN_TOP = 72
const MARGIN_BOTTOM = 72
const LEADING = 15
const MAX_LINE_CHARS = 88

/** Keep output within WinAnsi-safe ASCII for the built-in fonts. */
function sanitize(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[^\x20-\x7E\n]/g, '')
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function wrapLine(text: string): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (current.length === 0) {
      current = word
    } else if (current.length + 1 + word.length <= MAX_LINE_CHARS) {
      current += ` ${word}`
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current.length > 0) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

export interface PdfPageInput {
  header?: string
  footer?: string
  paragraphs: string[]
}

/**
 * Assemble a PDF from pages of paragraphs. Returns bytes of a valid
 * PDF 1.4 document.
 */
export function generatePdf(title: string, pages: PdfPageInput[]): Uint8Array {
  const objects: string[] = []
  const pageObjectNumbers: number[] = []

  // Object numbering: 1 catalog, 2 pages tree, 3 font, then per page:
  // page object + content object.
  const firstPageObject = 4

  pages.forEach((page, pageIndex) => {
    pageObjectNumbers.push(firstPageObject + pageIndex * 2)
  })

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers
    .map((n) => `${n} 0 R`)
    .join(' ')}] /Count ${pages.length} >>`
  objects[3] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'

  pages.forEach((page, pageIndex) => {
    const pageObjNum = firstPageObject + pageIndex * 2
    const contentObjNum = pageObjNum + 1

    const contentLines: string[] = ['BT']
    let y = PAGE_HEIGHT - MARGIN_TOP

    // Title / running header
    contentLines.push(`/F1 10 Tf`)
    contentLines.push(`1 0 0 1 ${MARGIN_X} ${y} Tm`)
    contentLines.push(`(${escapePdfText(sanitize(page.header ?? title))}) Tj`)
    y -= 8
    contentLines.push(`0.6 0.6 0.6 RG 0.5 w`)
    contentLines.push(`${MARGIN_X} ${y} m ${PAGE_WIDTH - MARGIN_X} ${y} l S`)
    contentLines.push(`0 0 0 RG`)
    y -= LEADING + 5

    for (const paragraph of page.paragraphs) {
      for (const line of wrapLine(sanitize(paragraph))) {
        if (y < MARGIN_BOTTOM + LEADING) break
        contentLines.push(`1 0 0 1 ${MARGIN_X} ${y} Tm`)
        contentLines.push(`(${escapePdfText(line)}) Tj`)
        y -= LEADING
      }
      y -= LEADING * 0.6
    }

    // Footer
    const footer = page.footer ?? `${pageIndex + 1}`
    contentLines.push(
      `1 0 0 1 ${PAGE_WIDTH - MARGIN_X - footer.length * 5} ${MARGIN_BOTTOM - 20} Tm`
    )
    contentLines.push(`(${escapePdfText(footer)}) Tj`)
    contentLines.push('ET')

    const content = contentLines.join('\n')
    objects[pageObjNum] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjNum} 0 R >>`
    objects[contentObjNum] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  })

  // Serialize with exact byte offsets (ASCII only after sanitize).
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = pdf.length
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`
  }

  const xrefStart = pdf.length
  const maxObject = objects.length - 1
  pdf += `xref\n0 ${maxObject + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i <= maxObject; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${maxObject + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`

  const bytes = new Uint8Array(pdf.length)
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 0xff
  }
  return bytes
}
