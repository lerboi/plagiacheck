/**
 * Deterministic SVG template builders for the chart, infographic, and thumbnail
 * generators. The LLM emits a structured JSON spec — these functions turn that
 * spec into clean, predictable SVG markup. Never let the LLM write raw SVG; it
 * produces inconsistent results.
 */

// ---------- shared helpers ----------

function escapeXml(s: string): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function wrapText(text: string, maxChars: number): string[] {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = w
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

const BASE_PALETTE = ['#0ea5e9', '#14b8a6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899']

// ---------- chart: bar ----------

interface BarPoint {
  name: string
  value: number
}

function renderBarChart(opts: {
  title: string
  data: BarPoint[]
  width?: number
  height?: number
}): string {
  const W = opts.width ?? 800
  const H = opts.height ?? 500
  const padTop = 70
  const padBottom = 100
  const padLeft = 70
  const padRight = 30
  const chartW = W - padLeft - padRight
  const chartH = H - padTop - padBottom

  const data = opts.data.slice(0, 12)
  const values = data.map((d) => d.value)
  const maxVal = Math.max(...values, 1)
  // round up to a nice top
  const niceMax = niceCeil(maxVal)
  const barGap = 12
  const barW = data.length > 0 ? (chartW - barGap * (data.length - 1)) / data.length : chartW

  const yTicks = 5
  const tickStep = niceMax / yTicks

  let svg = ''
  svg += `<text x="${W / 2}" y="36" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" text-anchor="middle" fill="#0f172a">${escapeXml(opts.title)}</text>`

  // grid + y-axis labels
  for (let i = 0; i <= yTicks; i++) {
    const y = padTop + chartH - (i / yTicks) * chartH
    const v = formatNum(i * tickStep)
    svg += `<line x1="${padLeft}" y1="${y}" x2="${W - padRight}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />`
    svg += `<text x="${padLeft - 10}" y="${y + 4}" font-family="Helvetica, Arial, sans-serif" font-size="11" text-anchor="end" fill="#64748b">${v}</text>`
  }
  // x-axis line
  svg += `<line x1="${padLeft}" y1="${padTop + chartH}" x2="${W - padRight}" y2="${padTop + chartH}" stroke="#94a3b8" stroke-width="1.5" />`

  data.forEach((d, i) => {
    const x = padLeft + i * (barW + barGap)
    const h = niceMax > 0 ? (d.value / niceMax) * chartH : 0
    const y = padTop + chartH - h
    const color = BASE_PALETTE[i % BASE_PALETTE.length]
    svg += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" fill="${color}" />`
    // value label on top
    svg += `<text x="${x + barW / 2}" y="${y - 6}" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="600" text-anchor="middle" fill="#0f172a">${formatNum(d.value)}</text>`
    // category label on bottom
    const labelLines = wrapText(d.name, Math.max(10, Math.floor(barW / 7)))
    labelLines.slice(0, 2).forEach((line, j) => {
      svg += `<text x="${x + barW / 2}" y="${padTop + chartH + 18 + j * 13}" font-family="Helvetica, Arial, sans-serif" font-size="11" text-anchor="middle" fill="#475569">${escapeXml(line)}</text>`
    })
  })

  return wrap(svg, W, H)
}

// ---------- chart: line ----------

function renderLineChart(opts: {
  title: string
  data: BarPoint[]
  width?: number
  height?: number
}): string {
  const W = opts.width ?? 800
  const H = opts.height ?? 500
  const padTop = 70
  const padBottom = 90
  const padLeft = 70
  const padRight = 30
  const chartW = W - padLeft - padRight
  const chartH = H - padTop - padBottom

  const data = opts.data.slice(0, 24)
  if (data.length === 0) return wrap(`<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" fill="#64748b">No data</text>`, W, H)

  const values = data.map((d) => d.value)
  const maxVal = Math.max(...values, 1)
  const minVal = Math.min(...values, 0)
  const range = maxVal - minVal || 1
  const niceMax = niceCeil(maxVal)
  const niceMin = minVal < 0 ? -niceCeil(-minVal) : 0
  const niceRange = niceMax - niceMin || 1

  const yTicks = 5
  let svg = ''
  svg += `<text x="${W / 2}" y="36" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" text-anchor="middle" fill="#0f172a">${escapeXml(opts.title)}</text>`

  for (let i = 0; i <= yTicks; i++) {
    const y = padTop + chartH - (i / yTicks) * chartH
    const v = niceMin + (i / yTicks) * niceRange
    svg += `<line x1="${padLeft}" y1="${y}" x2="${W - padRight}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />`
    svg += `<text x="${padLeft - 10}" y="${y + 4}" font-family="Helvetica, Arial, sans-serif" font-size="11" text-anchor="end" fill="#64748b">${formatNum(v)}</text>`
  }
  svg += `<line x1="${padLeft}" y1="${padTop + chartH}" x2="${W - padRight}" y2="${padTop + chartH}" stroke="#94a3b8" stroke-width="1.5" />`

  const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW
  const points = data.map((d, i) => {
    const x = padLeft + i * stepX
    const y = padTop + chartH - ((d.value - niceMin) / niceRange) * chartH
    return { x, y, d }
  })

  // line
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  svg += `<path d="${path}" fill="none" stroke="${BASE_PALETTE[0]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`
  // area fill (subtle)
  const area = `${path} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} Z`
  svg += `<path d="${area}" fill="${BASE_PALETTE[0]}" fill-opacity="0.12" />`

  // points + x labels
  const labelEvery = Math.max(1, Math.floor(data.length / 8))
  points.forEach((p, i) => {
    svg += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="white" stroke="${BASE_PALETTE[0]}" stroke-width="2" />`
    if (i % labelEvery === 0 || i === points.length - 1) {
      const lines = wrapText(p.d.name, 12)
      lines.slice(0, 2).forEach((line, j) => {
        svg += `<text x="${p.x}" y="${padTop + chartH + 18 + j * 12}" font-family="Helvetica, Arial, sans-serif" font-size="10" text-anchor="middle" fill="#475569">${escapeXml(line)}</text>`
      })
    }
  })

  return wrap(svg, W, H)
}

// ---------- chart: pie / donut ----------

function renderPieChart(opts: {
  title: string
  data: BarPoint[]
  width?: number
  height?: number
}): string {
  const W = opts.width ?? 800
  const H = opts.height ?? 500
  const cx = W / 2
  const cy = 60 + (H - 100) / 2
  const r = Math.min(W, H - 100) / 2 - 80
  const data = opts.data.slice(0, 8).filter((d) => d.value > 0)
  const total = data.reduce((a, b) => a + b.value, 0) || 1

  let svg = ''
  svg += `<text x="${W / 2}" y="36" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" text-anchor="middle" fill="#0f172a">${escapeXml(opts.title)}</text>`

  let acc = 0
  const slices = data.map((d, i) => {
    const start = acc
    const end = acc + d.value
    acc = end
    const a0 = (start / total) * Math.PI * 2 - Math.PI / 2
    const a1 = (end / total) * Math.PI * 2 - Math.PI / 2
    const x0 = cx + Math.cos(a0) * r
    const y0 = cy + Math.sin(a0) * r
    const x1 = cx + Math.cos(a1) * r
    const y1 = cy + Math.sin(a1) * r
    const large = end - start > total / 2 ? 1 : 0
    const path = `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`
    const color = BASE_PALETTE[i % BASE_PALETTE.length]
    const midA = (a0 + a1) / 2
    const labelX = cx + Math.cos(midA) * (r * 0.65)
    const labelY = cy + Math.sin(midA) * (r * 0.65)
    const pct = (d.value / total) * 100
    return { path, color, labelX, labelY, pct, name: d.name }
  })

  slices.forEach((s) => {
    svg += `<path d="${s.path}" fill="${s.color}" stroke="white" stroke-width="2" />`
    if (s.pct >= 6) {
      svg += `<text x="${s.labelX.toFixed(1)}" y="${s.labelY.toFixed(1)}" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" text-anchor="middle" fill="white">${s.pct.toFixed(0)}%</text>`
    }
  })

  // legend
  const legY = padForLegend(cy, r, H)
  data.forEach((d, i) => {
    const itemY = legY + i * 20
    const itemX = 40
    const color = BASE_PALETTE[i % BASE_PALETTE.length]
    svg += `<rect x="${itemX}" y="${itemY - 10}" width="14" height="14" rx="3" fill="${color}" />`
    svg += `<text x="${itemX + 22}" y="${itemY + 1}" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#334155">${escapeXml(truncate(d.name, 24))} — ${formatNum(d.value)}</text>`
  })

  return wrap(svg, W, H + Math.max(0, data.length * 20 - 40))
}

function padForLegend(cy: number, r: number, H: number): number {
  return Math.min(H - 40, cy + r + 30)
}

// ---------- chart: flowchart (sequential) ----------

interface FlowNode {
  label: string
}

function renderFlowchart(opts: {
  title: string
  nodes: FlowNode[]
  width?: number
}): string {
  const W = opts.width ?? 800
  const nodes = opts.nodes.slice(0, 10)
  const boxW = 360
  const boxH = 70
  const gap = 28
  const padTop = 70
  const padBottom = 30
  const totalH = padTop + nodes.length * (boxH + gap) - gap + padBottom
  const cx = W / 2

  let svg = ''
  svg += `<text x="${W / 2}" y="36" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" text-anchor="middle" fill="#0f172a">${escapeXml(opts.title)}</text>`

  nodes.forEach((n, i) => {
    const y = padTop + i * (boxH + gap)
    const x = cx - boxW / 2
    const color = BASE_PALETTE[i % BASE_PALETTE.length]
    svg += `<rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="14" fill="white" stroke="${color}" stroke-width="2" />`
    svg += `<rect x="${x}" y="${y}" width="6" height="${boxH}" rx="3" fill="${color}" />`
    const lines = wrapText(n.label, 42).slice(0, 2)
    const startY = y + boxH / 2 - (lines.length - 1) * 9 + 5
    lines.forEach((line, j) => {
      svg += `<text x="${cx + 4}" y="${startY + j * 18}" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="600" text-anchor="middle" fill="#0f172a">${escapeXml(line)}</text>`
    })
    if (i < nodes.length - 1) {
      const ay = y + boxH
      const by = ay + gap
      svg += `<line x1="${cx}" y1="${ay}" x2="${cx}" y2="${by - 8}" stroke="#94a3b8" stroke-width="2" />`
      svg += `<polygon points="${cx},${by} ${cx - 6},${by - 10} ${cx + 6},${by - 10}" fill="#94a3b8" />`
    }
  })

  return wrap(svg, W, totalH)
}

// ---------- chart: mindmap (radial) ----------

function renderMindMap(opts: {
  title: string
  center: string
  branches: string[]
  width?: number
}): string {
  const W = opts.width ?? 800
  const H = 600
  const cx = W / 2
  const cy = H / 2 + 20
  const r = 180
  const branches = opts.branches.slice(0, 8)

  let svg = ''
  svg += `<text x="${W / 2}" y="36" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" text-anchor="middle" fill="#0f172a">${escapeXml(opts.title)}</text>`

  // center node
  svg += `<circle cx="${cx}" cy="${cy}" r="60" fill="${BASE_PALETTE[0]}" />`
  const centerLines = wrapText(opts.center, 14).slice(0, 2)
  const cStartY = cy - (centerLines.length - 1) * 9 + 5
  centerLines.forEach((line, j) => {
    svg += `<text x="${cx}" y="${cStartY + j * 18}" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" text-anchor="middle" fill="white">${escapeXml(line)}</text>`
  })

  // branches arranged around the circle
  branches.forEach((b, i) => {
    const lines = wrapText(b, 18).slice(0, 2)
    if (lines.length === 0) return // skip empty/whitespace-only branches

    const angle = (i / branches.length) * Math.PI * 2 - Math.PI / 2
    const bx = cx + Math.cos(angle) * r
    const by = cy + Math.sin(angle) * r
    const color = BASE_PALETTE[(i + 1) % BASE_PALETTE.length]
    // edge
    svg += `<line x1="${cx + Math.cos(angle) * 60}" y1="${cy + Math.sin(angle) * 60}" x2="${bx}" y2="${by}" stroke="${color}" stroke-width="2" stroke-linecap="round" />`
    // node
    const widestLine = Math.max(...lines.map((l) => l.length))
    const boxW = Math.min(180, Math.max(80, widestLine * 8 + 24))
    const boxH = 22 + lines.length * 18
    svg += `<rect x="${bx - boxW / 2}" y="${by - boxH / 2}" width="${boxW}" height="${boxH}" rx="10" fill="white" stroke="${color}" stroke-width="2" />`
    const startY = by - (lines.length - 1) * 9 + 5
    lines.forEach((line, j) => {
      svg += `<text x="${bx}" y="${startY + j * 18}" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#0f172a">${escapeXml(line)}</text>`
    })
  })

  return wrap(svg, W, H)
}

// ---------- chart: timeline ----------

interface TimelineEvent {
  date: string
  label: string
}

function renderTimeline(opts: {
  title: string
  events: TimelineEvent[]
  width?: number
}): string {
  const W = opts.width ?? 800
  const events = opts.events.slice(0, 6)
  const padTop = 70
  const lineY = 200
  const totalH = 380
  const padX = 70
  const usableW = W - padX * 2

  let svg = ''
  svg += `<text x="${W / 2}" y="36" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" text-anchor="middle" fill="#0f172a">${escapeXml(opts.title)}</text>`
  // central line
  svg += `<line x1="${padX}" y1="${lineY}" x2="${W - padX}" y2="${lineY}" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />`

  if (events.length === 0) return wrap(svg, W, totalH)

  const step = events.length > 1 ? usableW / (events.length - 1) : 0
  events.forEach((e, i) => {
    const x = padX + i * step
    const above = i % 2 === 0
    const color = BASE_PALETTE[i % BASE_PALETTE.length]
    // dot
    svg += `<circle cx="${x}" cy="${lineY}" r="9" fill="${color}" stroke="white" stroke-width="3" />`
    // connector
    const cy = above ? lineY - 50 : lineY + 50
    svg += `<line x1="${x}" y1="${lineY}" x2="${x}" y2="${cy}" stroke="${color}" stroke-width="2" />`
    // date label
    const dateY = above ? cy - 18 : cy + 22
    svg += `<text x="${x}" y="${dateY}" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="700" text-anchor="middle" fill="${color}">${escapeXml(e.date)}</text>`
    // event label
    const labelLines = wrapText(e.label, 22).slice(0, 3)
    const lineStart = above ? dateY - 16 - (labelLines.length - 1) * 13 : dateY + 16
    labelLines.forEach((line, j) => {
      svg += `<text x="${x}" y="${lineStart + j * 13}" font-family="Helvetica, Arial, sans-serif" font-size="11" text-anchor="middle" fill="#334155">${escapeXml(line)}</text>`
    })
  })

  return wrap(svg, W, totalH)
}

// ---------- chart: comparison table ----------

interface ComparisonRow {
  attribute: string
  values: string[]
}

function renderComparison(opts: {
  title: string
  items: string[]
  rows: ComparisonRow[]
  width?: number
}): string {
  const W = opts.width ?? 800
  const items = opts.items.slice(0, 4)
  const rows = opts.rows.slice(0, 8)
  const colCount = items.length + 1
  const colW = W / colCount
  const headerH = 60
  const rowH = 56
  const padTop = 60
  const totalH = padTop + headerH + rows.length * rowH + 30

  let svg = ''
  svg += `<text x="${W / 2}" y="36" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" text-anchor="middle" fill="#0f172a">${escapeXml(opts.title)}</text>`

  // header row
  svg += `<rect x="0" y="${padTop}" width="${W}" height="${headerH}" fill="#0f172a" />`
  items.forEach((it, i) => {
    const x = colW * (i + 1) + colW / 2
    const color = BASE_PALETTE[i % BASE_PALETTE.length]
    svg += `<rect x="${colW * (i + 1)}" y="${padTop}" width="${colW}" height="6" fill="${color}" />`
    svg += `<text x="${x}" y="${padTop + headerH / 2 + 5}" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" text-anchor="middle" fill="white">${escapeXml(truncate(it, Math.floor(colW / 9)))}</text>`
  })

  rows.forEach((r, ri) => {
    const y = padTop + headerH + ri * rowH
    if (ri % 2 === 0) {
      svg += `<rect x="0" y="${y}" width="${W}" height="${rowH}" fill="#f8fafc" />`
    }
    // attribute cell
    svg += `<text x="20" y="${y + rowH / 2 + 5}" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="600" fill="#0f172a">${escapeXml(truncate(r.attribute, Math.floor(colW / 9)))}</text>`
    const values = Array.isArray(r.values) ? r.values : []
    items.forEach((_, ci) => {
      const v = values[ci] ?? '—'
      const x = colW * (ci + 1) + colW / 2
      const lines = wrapText(String(v), Math.max(10, Math.floor(colW / 10))).slice(0, 2)
      const startY = y + rowH / 2 - (lines.length - 1) * 8 + 5
      lines.forEach((line, j) => {
        svg += `<text x="${x}" y="${startY + j * 16}" font-family="Helvetica, Arial, sans-serif" font-size="12" text-anchor="middle" fill="#334155">${escapeXml(line)}</text>`
      })
    })
    // dividers between cols
    for (let c = 1; c < colCount; c++) {
      svg += `<line x1="${colW * c}" y1="${y}" x2="${colW * c}" y2="${y + rowH}" stroke="#e2e8f0" stroke-width="1" />`
    }
  })

  return wrap(svg, W, totalH)
}

// ---------- infographic ----------

interface InfographicSpec {
  title: string
  intro?: string
  stats?: { label: string; value: string }[]
  sections?: { heading: string; body: string }[]
  conclusion?: string
}

function renderInfographic(spec: InfographicSpec): string {
  const W = 800
  const padX = 50
  let y = 0
  let svg = ''

  // header band
  const headerH = 110
  svg += `<rect x="0" y="0" width="${W}" height="${headerH}" fill="${BASE_PALETTE[0]}" />`
  const titleLines = wrapText(spec.title || 'Untitled', 36).slice(0, 2)
  titleLines.forEach((line, i) => {
    svg += `<text x="${W / 2}" y="${50 + i * 30}" font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="800" text-anchor="middle" fill="white">${escapeXml(line)}</text>`
  })
  if (titleLines.length === 1) {
    svg += `<text x="${W / 2}" y="${88}" font-family="Helvetica, Arial, sans-serif" font-size="13" text-anchor="middle" fill="rgba(255,255,255,0.85)">infographic</text>`
  }
  y = headerH

  // intro
  if (spec.intro) {
    const introLines = wrapText(spec.intro, 80).slice(0, 4)
    y += 26
    introLines.forEach((line, i) => {
      svg += `<text x="${padX}" y="${y + i * 18}" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#334155">${escapeXml(line)}</text>`
    })
    y += introLines.length * 18 + 18
  }

  // stats row
  const stats = (spec.stats || []).slice(0, 4).filter((s) => s && s.value)
  if (stats.length > 0) {
    y += 8
    const cellW = (W - padX * 2) / stats.length
    const statH = 100
    stats.forEach((s, i) => {
      const x = padX + i * cellW
      const color = BASE_PALETTE[(i + 1) % BASE_PALETTE.length]
      svg += `<rect x="${x + 6}" y="${y}" width="${cellW - 12}" height="${statH}" rx="14" fill="white" stroke="${color}" stroke-width="2" />`
      svg += `<text x="${x + cellW / 2}" y="${y + 50}" font-family="Helvetica, Arial, sans-serif" font-size="32" font-weight="800" text-anchor="middle" fill="${color}">${escapeXml(truncate(s.value, 10))}</text>`
      const lblLines = wrapText(s.label, Math.max(10, Math.floor(cellW / 8))).slice(0, 2)
      const lblStart = y + 70
      lblLines.forEach((line, j) => {
        svg += `<text x="${x + cellW / 2}" y="${lblStart + j * 13}" font-family="Helvetica, Arial, sans-serif" font-size="11" text-anchor="middle" fill="#475569">${escapeXml(line)}</text>`
      })
    })
    y += statH + 24
  }

  // sections
  const sections = (spec.sections || []).slice(0, 5)
  sections.forEach((s, i) => {
    const headingH = 28
    const bodyLines = wrapText(s.body || '', 80).slice(0, 4)
    const sectionH = headingH + bodyLines.length * 18 + 24
    const color = BASE_PALETTE[(i + 2) % BASE_PALETTE.length]
    // accent dot + number
    svg += `<circle cx="${padX + 12}" cy="${y + 18}" r="14" fill="${color}" />`
    svg += `<text x="${padX + 12}" y="${y + 23}" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="800" text-anchor="middle" fill="white">${i + 1}</text>`
    svg += `<text x="${padX + 36}" y="${y + 23}" font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="#0f172a">${escapeXml(truncate(s.heading || '', 60))}</text>`
    bodyLines.forEach((line, j) => {
      svg += `<text x="${padX + 36}" y="${y + headingH + 14 + j * 18}" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#475569">${escapeXml(line)}</text>`
    })
    y += sectionH
    // separator
    if (i < sections.length - 1) {
      svg += `<line x1="${padX + 36}" y1="${y - 6}" x2="${W - padX}" y2="${y - 6}" stroke="#e2e8f0" stroke-width="1" />`
    }
  })

  // conclusion band
  if (spec.conclusion) {
    y += 12
    const concLines = wrapText(spec.conclusion, 70).slice(0, 4)
    const concH = concLines.length * 19 + 36
    svg += `<rect x="${padX - 10}" y="${y}" width="${W - (padX - 10) * 2}" height="${concH}" rx="14" fill="${BASE_PALETTE[0]}" fill-opacity="0.08" />`
    concLines.forEach((line, i) => {
      svg += `<text x="${W / 2}" y="${y + 24 + i * 19}" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="600" text-anchor="middle" fill="#0f172a">${escapeXml(line)}</text>`
    })
    y += concH
  }

  y += 28

  return wrap(svg, W, y)
}

// ---------- thumbnail (1200x630) ----------

interface ThumbnailSpec {
  title: string
  subtitle?: string
  palette?: { from?: string; to?: string; text?: string; accent?: string }
  vibe?: string
}

function renderThumbnail(spec: ThumbnailSpec): string {
  const W = 1200
  const H = 630
  const palette = sanitizePalette(spec.palette)
  const title = (spec.title || 'Untitled').trim()
  const subtitle = (spec.subtitle || '').trim()

  // title sizing — fit in ~16 chars per line, max 3 lines
  const titleLines = wrapText(title, 22).slice(0, 3)
  const titleSize = titleLines.length === 1 ? 88 : titleLines.length === 2 ? 76 : 64

  let svg = ''
  // gradient bg
  svg += `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${palette.from}" /><stop offset="100%" stop-color="${palette.to}" /></linearGradient></defs>`
  svg += `<rect width="${W}" height="${H}" fill="url(#bg)" />`

  // decorative shapes
  svg += `<circle cx="${W - 60}" cy="${H - 80}" r="180" fill="${palette.accent}" fill-opacity="0.18" />`
  svg += `<circle cx="60" cy="80" r="120" fill="${palette.accent}" fill-opacity="0.12" />`
  svg += `<rect x="${W - 280}" y="-40" width="200" height="200" rx="32" fill="white" fill-opacity="0.08" transform="rotate(15 ${W - 180} 60)" />`

  // accent strip
  svg += `<rect x="80" y="${H / 2 - (titleLines.length * titleSize) / 2 - 50}" width="80" height="6" rx="3" fill="${palette.accent}" />`

  // title
  const totalTitleH = titleLines.length * (titleSize + 6)
  const titleStartY = H / 2 - totalTitleH / 2 + titleSize - 4
  titleLines.forEach((line, i) => {
    svg += `<text x="80" y="${titleStartY + i * (titleSize + 6)}" font-family="Helvetica, Arial, sans-serif" font-size="${titleSize}" font-weight="800" fill="${palette.text}">${escapeXml(line)}</text>`
  })

  // subtitle
  if (subtitle) {
    const subLines = wrapText(subtitle, 60).slice(0, 2)
    subLines.forEach((line, i) => {
      svg += `<text x="80" y="${titleStartY + totalTitleH + 18 + i * 28}" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="500" fill="${palette.text}" opacity="0.85">${escapeXml(line)}</text>`
    })
  }

  // bottom-left brand mark
  svg += `<text x="80" y="${H - 40}" font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="${palette.text}" opacity="0.7" letter-spacing="2">${escapeXml(spec.vibe ? spec.vibe.toUpperCase() : 'PLAGIACHECK')}</text>`

  return wrap(svg, W, H)
}

// ---------- helpers (palette, formatting, math) ----------

function sanitizePalette(p?: { from?: string; to?: string; text?: string; accent?: string }) {
  const isHex = (s?: string) => typeof s === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(s.trim())
  return {
    from: isHex(p?.from) ? p!.from!.trim() : '#0ea5e9',
    to: isHex(p?.to) ? p!.to!.trim() : '#6366f1',
    text: isHex(p?.text) ? p!.text!.trim() : '#ffffff',
    accent: isHex(p?.accent) ? p!.accent!.trim() : '#fbbf24',
  }
}

function niceCeil(n: number): number {
  if (!isFinite(n) || n <= 0) return 1
  const exp = Math.floor(Math.log10(n))
  const mag = Math.pow(10, exp)
  const f = n / mag
  let nf = 1
  if (f <= 1) nf = 1
  else if (f <= 2) nf = 2
  else if (f <= 5) nf = 5
  else nf = 10
  return nf * mag
}

function formatNum(n: number): string {
  if (!isFinite(n)) return '0'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1) + 'M'
  if (abs >= 1_000) return (n / 1_000).toFixed(abs >= 10_000 ? 0 : 1) + 'k'
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(1)
}

function truncate(s: string, max: number): string {
  if (!s) return ''
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

function wrap(inner: string, w: number, h: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"><rect width="${w}" height="${h}" fill="white" />${inner}</svg>`
}

// ---------- chart dispatcher ----------

export type ChartSpec =
  | { chartType: 'bar' | 'line' | 'pie'; title: string; data: BarPoint[]; description?: string }
  | { chartType: 'flowchart'; title: string; nodes: FlowNode[]; description?: string }
  | { chartType: 'mindmap'; title: string; center: string; branches: string[]; description?: string }
  | { chartType: 'timeline'; title: string; events: TimelineEvent[]; description?: string }
  | { chartType: 'comparison'; title: string; items: string[]; rows: ComparisonRow[]; description?: string }

export function buildChartSvg(spec: ChartSpec): string {
  switch (spec.chartType) {
    case 'bar':
      return renderBarChart({ title: spec.title, data: clampPoints(spec.data) })
    case 'line':
      return renderLineChart({ title: spec.title, data: clampPoints(spec.data) })
    case 'pie':
      return renderPieChart({ title: spec.title, data: clampPoints(spec.data) })
    case 'flowchart':
      return renderFlowchart({ title: spec.title, nodes: (spec.nodes || []).filter((n) => n && n.label) })
    case 'mindmap':
      return renderMindMap({
        title: spec.title,
        center: spec.center || spec.title,
        branches: (spec.branches || []).filter(Boolean),
      })
    case 'timeline':
      return renderTimeline({
        title: spec.title,
        events: (spec.events || []).filter((e) => e && e.date && e.label),
      })
    case 'comparison':
      return renderComparison({
        title: spec.title,
        items: (spec.items || []).filter(Boolean),
        rows: (spec.rows || []).filter((r) => r && r.attribute),
      })
    default:
      return renderBarChart({ title: 'Unsupported chart type', data: [] })
  }
}

function clampPoints(data: any): BarPoint[] {
  if (!Array.isArray(data)) return []
  return data
    .map((d: any) => ({
      name: String(d?.name ?? d?.label ?? '').slice(0, 60),
      value: Number(d?.value ?? d?.y ?? 0),
    }))
    .filter((d) => d.name && isFinite(d.value))
    .slice(0, 24)
}

export { renderInfographic, renderThumbnail }
export type { InfographicSpec, ThumbnailSpec }
