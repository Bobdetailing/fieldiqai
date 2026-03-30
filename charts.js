/**
 * renderChart(containerId, chartData, forceValue?)
 *
 * forceValue — pass the actual stat value (e.g. totals.monthly) so the chart
 * color always matches the number shown above it, regardless of the last two
 * data points. If omitted, color is inferred from the last vs previous point.
 */
export function renderChart(containerId, chartData, forceValue) {
  const container = document.getElementById(containerId)
  if (!container) return

  if (!chartData || chartData.length === 0) {
    container.innerHTML = ""
    return
  }

  // ── Sample to max 50 points to kill lag ────────────────────────────────────
  const MAX_POINTS = 50
  const sampled = sampleData(chartData, MAX_POINTS)

  // ── Dimensions ─────────────────────────────────────────────────────────────
  const width  = 260
  const height = 70
  const pad    = 8

  const values = sampled.map(d => Number(d.profit) || 0)

  // ── Color: respect forceValue if provided ──────────────────────────────────
  let trending
  if (forceValue !== undefined) {
    trending = Number(forceValue) >= 0
  } else {
    const lastVal = values[values.length - 1] ?? 0
    const prevVal = values.length > 1 ? values[values.length - 2] ?? 0 : lastVal
    trending = lastVal >= prevVal
  }

  const stroke = trending ? "#22c55e" : "#ef4444"
  const gradId = `grad-${containerId}`

  const max   = Math.max(...values,  1)
  const min   = Math.min(...values,  0)
  const range = Math.max(max - min,  1)

  // ── Coordinates ────────────────────────────────────────────────────────────
  let pts = []

  if (values.length === 1) {
    const y = toY(values[0], min, range, height, pad)
    pts = [`${pad},${y}`, `${width - pad},${y}`]
  } else {
    const stepX = (width - pad * 2) / (values.length - 1)
    pts = values.map((v, i) => {
      const x = pad + i * stepX
      const y = toY(v, min, range, height, pad)
      return `${x},${y}`
    })
  }

  const pathD = buildSmoothPath(pts)
  const areaD = buildAreaPath(pts, height, pad)
  const [ex, ey] = pts[pts.length - 1].split(",").map(Number)

  container.innerHTML = `
    <svg
      viewBox="0 0 ${width} ${height}"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style="overflow:visible"
    >
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${stroke}" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="${stroke}" stop-opacity="0"/>
        </linearGradient>
      </defs>

      <path d="${areaD}" fill="url(#${gradId})" stroke="none"/>

      <path
        d="${pathD}"
        fill="none"
        stroke="${stroke}"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- glowing endpoint dot -->
      <circle cx="${ex}" cy="${ey}" r="4.5" fill="${stroke}" opacity="0.18"/>
      <circle cx="${ex}" cy="${ey}" r="2.8" fill="${stroke}"/>
    </svg>
  `
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toY(value, min, range, height, pad) {
  return height - pad - ((value - min) / range) * (height - pad * 2)
}

function sampleData(data, maxPoints) {
  if (data.length <= maxPoints) return data
  const result = []
  const step   = (data.length - 1) / (maxPoints - 1)
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round(i * step)
    result.push(data[Math.min(idx, data.length - 1)])
  }
  result[result.length - 1] = data[data.length - 1]
  return result
}

function buildSmoothPath(pts) {
  if (pts.length < 2) return ""
  const coords = pts.map(p => p.split(",").map(Number))
  let d = `M ${coords[0][0]},${coords[0][1]}`
  const t = 0.18
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(i - 1, 0)]
    const p1 = coords[i]
    const p2 = coords[i + 1]
    const p3 = coords[Math.min(i + 2, coords.length - 1)]
    const cp1x = p1[0] + (p2[0] - p0[0]) * t
    const cp1y = p1[1] + (p2[1] - p0[1]) * t
    const cp2x = p2[0] - (p3[0] - p1[0]) * t
    const cp2y = p2[1] - (p3[1] - p1[1]) * t
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`
  }
  return d
}

function buildAreaPath(pts, height, pad) {
  if (pts.length < 2) return ""
  const coords   = pts.map(p => p.split(",").map(Number))
  const baseline = height - pad
  const firstX   = coords[0][0]
  const lastX    = coords[coords.length - 1][0]
  const t = 0.18
  let d = `M ${firstX},${baseline} L ${coords[0][0]},${coords[0][1]}`
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(i - 1, 0)]
    const p1 = coords[i]
    const p2 = coords[i + 1]
    const p3 = coords[Math.min(i + 2, coords.length - 1)]
    const cp1x = p1[0] + (p2[0] - p0[0]) * t
    const cp1y = p1[1] + (p2[1] - p0[1]) * t
    const cp2x = p2[0] - (p3[0] - p1[0]) * t
    const cp2y = p2[1] - (p3[1] - p1[1]) * t
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`
  }
  d += ` L ${lastX},${baseline} Z`
  return d
}