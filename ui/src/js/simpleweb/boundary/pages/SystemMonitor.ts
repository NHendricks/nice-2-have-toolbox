import * as d3 from 'd3'
import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

type Metric = 'cpu' | 'memory' | 'io'

interface UsageEntry {
  pid: number
  name: string
  command?: string
  cpu: number
  memoryMB: number
  ioMB?: number
}

interface ResourceAvailability {
  cpuFreePercent?: number | null
  memoryFreeMB?: number | null
  diskFreeGB?: number | null
}

@customElement('nh-system-monitor')
export class SystemMonitor extends LitElement {
  @state() private metric: Metric = 'cpu'
  @state() private entries: UsageEntry[] = []
  @state() private loading = false
  @state() private error = ''
  @state() private updatedAt = ''
  @state() private diskIoMBps: number | null = null
  @state() private resources: ResourceAvailability | null = null
  @state() private liveMode = false
  private refreshTimer: number | null = null

  static styles = css`
    :host {
      display: block;
      height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #eaeaea;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
    }

    .container {
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      box-sizing: border-box;
    }

    .panel {
      background: rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 0.9rem;
      backdrop-filter: blur(8px);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .title {
      font-size: 1.45rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    button {
      border: none;
      border-radius: 8px;
      padding: 0.5rem 0.85rem;
      font-weight: 600;
      cursor: pointer;
      background: rgba(148, 163, 184, 0.25);
      color: #e2e8f0;
      transition: all 0.15s ease;
    }

    button:hover {
      transform: translateY(-1px);
      filter: brightness(1.08);
    }

    button.active {
      background: rgba(59, 130, 246, 0.65);
      color: #ffffff;
    }

    .meta {
      font-size: 0.85rem;
      color: #cbd5e1;
    }

    .content {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .chart-wrap {
      position: relative;
      min-height: 320px;
      flex: 1 1 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 20;
    }

    svg {
      width: min(100%, 640px);
      height: min(100%, 640px);
    }

    .tooltip {
      position: fixed;
      pointer-events: none;
      background: rgba(15, 23, 42, 0.95);
      color: #e2e8f0;
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 8px;
      padding: 0.45rem 0.55rem;
      font-size: 0.78rem;
      max-width: 80vw;
      opacity: 0;
      transform: none;
      transition: opacity 0.12s ease;
      z-index: 9999;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
      line-height: 1.35;
    }

    .tooltip.visible {
      opacity: 1;
    }

    .list {
      position: relative;
      z-index: 1;
      min-height: 160px;
      max-height: 240px;
      flex: 0 0 auto;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .row {
      display: grid;
      grid-template-columns: 1fr auto auto auto;
      gap: 0.65rem;
      align-items: center;
      background: rgba(15, 23, 42, 0.45);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      padding: 0.5rem 0.6rem;
    }

    .copy-btn {
      background: transparent;
      border: 1px solid rgba(148, 163, 184, 0.25);
      color: #94a3b8;
      padding: 0.2rem 0.4rem;
      font-size: 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .copy-btn:hover {
      background: rgba(148, 163, 184, 0.15);
      color: #e2e8f0;
      transform: none;
    }

    .kill-btn {
      background: transparent;
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #f87171;
      padding: 0.2rem 0.4rem;
      font-size: 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .kill-btn:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
      transform: none;
    }

    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #f8fafc;
      font-size: 0.88rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    .value {
      color: #93c5fd;
      font-size: 0.84rem;
      font-weight: 600;
    }

    .state {
      color: #cbd5e1;
      font-size: 0.9rem;
      text-align: center;
      padding: 1.2rem;
    }

    @media (max-width: 980px) {
      .chart-wrap {
        min-height: 300px;
      }

      .list {
        max-height: 220px;
      }
    }
  `

  connectedCallback() {
    super.connectedCallback()
    this.refreshData()
  }

  disconnectedCallback() {
    this.stopLiveUpdates()
    super.disconnectedCallback()
  }

  protected updated(changedProps: Map<string, unknown>) {
    if (changedProps.has('entries') || changedProps.has('metric')) {
      this.renderChart()
    }
  }

  private async refreshData() {
    this.loading = true
    this.error = ''

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'system-monitor',
        {
          action: 'top-processes',
          metric: this.metric,
          limit: 8,
        },
      )

      const result = response.data || response
      if (!result?.success) {
        this.error = result?.error || 'Failed to load system usage'
        this.entries = []
        this.diskIoMBps = null
        this.resources = null
      } else {
        this.error = result?.warning || ''
        this.entries = Array.isArray(result.entries) ? result.entries : []
        this.updatedAt = result.updatedAt || new Date().toISOString()
        this.diskIoMBps =
          typeof result.diskIoMBps === 'number' &&
          Number.isFinite(result.diskIoMBps)
            ? result.diskIoMBps
            : null
        this.resources = result.resources || null
      }
    } catch (error: any) {
      this.error = error?.message || 'Failed to load system usage'
      this.entries = []
      this.diskIoMBps = null
      this.resources = null
    } finally {
      this.loading = false
    }
  }

  private formatFreeMemory(): string {
    const freeMB = this.resources?.memoryFreeMB
    if (typeof freeMB !== 'number' || !Number.isFinite(freeMB)) {
      return 'n/a'
    }
    return `${(freeMB / 1024).toFixed(1)} GB`
  }

  private startLiveUpdates() {
    if (this.refreshTimer !== null) return
    this.refreshTimer = window.setInterval(() => {
      this.refreshData()
    }, 4000)
  }

  private stopLiveUpdates() {
    if (this.refreshTimer === null) return
    window.clearInterval(this.refreshTimer)
    this.refreshTimer = null
  }

  private toggleLiveMode() {
    this.liveMode = !this.liveMode
    if (this.liveMode) {
      this.refreshData()
      this.startLiveUpdates()
    } else {
      this.stopLiveUpdates()
    }
  }

  private getValue(entry: UsageEntry): number {
    if (this.metric === 'cpu') {
      return Math.max(0.0001, entry.cpu || 0)
    }
    if (this.metric === 'memory') {
      return Math.max(0.0001, entry.memoryMB || 0)
    }
    return Math.max(0.0001, entry.ioMB || 0)
  }

  private formatValue(entry: UsageEntry): string {
    if (this.metric === 'cpu') {
      return `${(entry.cpu || 0).toFixed(1)} %`
    }
    if (this.metric === 'memory') {
      return `${(entry.memoryMB || 0).toFixed(1)} MB`
    }
    return `${(entry.ioMB || 0).toFixed(1)} MB I/O`
  }

  private getDisplayProcessName(nameOrCommand: string): string {
    const normalized = (nameOrCommand || '').trim()
    if (!normalized) return 'unknown'

    const firstToken = normalized.split(/\s+/)[0] || normalized
    const parts = firstToken.split(/[\\/]/).filter(Boolean)
    const lastPart = parts.length > 0 ? parts[parts.length - 1] : firstToken
    return lastPart || normalized
  }

  private getCommandText(entry: UsageEntry): string {
    return (entry.command || entry.name || 'unknown').trim() || 'unknown'
  }

  private truncateFromStart(value: string, maxLength: number): string {
    if (!value || value.length <= maxLength) return value
    return `…${value.slice(-(maxLength - 1))}`
  }

  private async killProcess(entry: UsageEntry, event: Event) {
    const btn = event.currentTarget as HTMLButtonElement
    if (
      !confirm(
        `Kill process "${this.getDisplayProcessName(this.getCommandText(entry))}" (PID ${entry.pid})?`,
      )
    )
      return
    btn.disabled = true
    btn.textContent = '...'
    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'system-monitor',
        { action: 'kill-process', pid: entry.pid },
      )
      const result = response.data || response
      if (result?.success) {
        btn.textContent = 'Killed'
        setTimeout(() => this.refreshData(), 800)
      } else {
        btn.textContent = 'Error'
        btn.disabled = false
        setTimeout(() => (btn.textContent = 'Kill'), 1500)
      }
    } catch {
      btn.textContent = 'Error'
      btn.disabled = false
      setTimeout(() => (btn.textContent = 'Kill'), 1500)
    }
  }

  private async copyCommand(entry: UsageEntry, event: Event) {
    const text = this.getCommandText(entry)
    const btn = event.currentTarget as HTMLButtonElement
    try {
      await navigator.clipboard.writeText(text)
      btn.textContent = 'Copied!'
      setTimeout(() => (btn.textContent = 'Copy'), 1200)
    } catch {
      btn.textContent = 'Failed'
      setTimeout(() => (btn.textContent = 'Copy'), 1200)
    }
  }

  private renderChart() {
    const svgEl = this.shadowRoot?.querySelector(
      '#resource-pie',
    ) as SVGSVGElement | null
    const tooltipEl = this.shadowRoot?.querySelector(
      '#pie-tooltip',
    ) as HTMLDivElement | null

    if (!svgEl || !tooltipEl) return

    const rect = svgEl.getBoundingClientRect()
    const width = Math.max(320, rect.width || 520)
    const height = Math.max(320, rect.height || 520)
    const radius = Math.min(width, height) / 2 - 16

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    if (!this.entries.length) return

    const values = this.entries.map((entry) => ({
      ...entry,
      value: this.getValue(entry),
    }))

    const color = d3
      .scaleOrdinal<string, string>()
      .domain(values.map((entry) => String(entry.pid)))
      .range([
        '#3b82f6',
        '#22c55e',
        '#f59e0b',
        '#8b5cf6',
        '#ec4899',
        '#06b6d4',
        '#f97316',
        '#14b8a6',
      ])

    const pie = d3
      .pie<(typeof values)[number]>()
      .sort(null)
      .value((d) => d.value)

    const arc = d3
      .arc<d3.PieArcDatum<(typeof values)[number]>>()
      .innerRadius(radius * 0.45)
      .outerRadius(radius)

    const labelArc = d3
      .arc<d3.PieArcDatum<(typeof values)[number]>>()
      .innerRadius(radius * 1.05)
      .outerRadius(radius * 1.05)

    const connectorArc = d3
      .arc<d3.PieArcDatum<(typeof values)[number]>>()
      .innerRadius(radius * 0.95)
      .outerRadius(radius * 0.95)

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`)

    const slices = g
      .selectAll('path')
      .data(pie(values))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d) => color(String(d.data.pid)))
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')

    slices
      .on('mousemove', (event, d) => {
        const fullCommand = d.data.command || d.data.name || 'unknown'
        tooltipEl.innerHTML = `<strong>${this.getDisplayProcessName(fullCommand)}</strong><br/>PID: ${d.data.pid}<br/>CPU: ${(d.data.cpu || 0).toFixed(1)} %<br/>Memory: ${(d.data.memoryMB || 0).toFixed(1)} MB<br/>File I/O: ${(d.data.ioMB || 0).toFixed(1)} MB<br/>Command: ${fullCommand}`
        tooltipEl.classList.add('visible')

        const margin = 12
        const cursorGap = 12
        const tooltipWidth = tooltipEl.offsetWidth || 0
        const tooltipHeight = tooltipEl.offsetHeight || 0
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        const left = Math.max(
          margin,
          Math.min(
            event.clientX + cursorGap,
            viewportWidth - tooltipWidth - margin,
          ),
        )

        let top = event.clientY - tooltipHeight - cursorGap
        if (
          top < margin ||
          top + tooltipHeight > viewportHeight - margin ||
          tooltipHeight > viewportHeight - margin * 2
        ) {
          top = margin
        }

        tooltipEl.style.left = `${left}px`
        tooltipEl.style.top = `${top}px`
      })
      .on('mouseleave', () => {
        tooltipEl.classList.remove('visible')
      })

    const pieData = pie(values)

    g.selectAll('.label-line')
      .data(pieData)
      .enter()
      .append('polyline')
      .attr('class', 'label-line')
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-opacity', 0.7)
      .attr('stroke-width', 1)
      .attr('points', (d) => {
        const start = connectorArc.centroid(d)
        const mid = labelArc.centroid(d)
        const endX = mid[0] + (mid[0] >= 0 ? 14 : -14)
        return `${start[0]},${start[1]} ${mid[0]},${mid[1]} ${endX},${mid[1]}`
      })

    g.selectAll('.slice-label')
      .data(pie(values))
      .enter()
      .append('text')
      .attr('class', 'slice-label')
      .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => {
        const [x] = labelArc.centroid(d)
        return x >= 0 ? 'start' : 'end'
      })
      .attr('fill', '#f8fafc')
      .attr('font-size', 10)
      .text((d) => {
        const name = this.getDisplayProcessName(d.data.command || d.data.name)
        return name.length > 18 ? `${name.slice(0, 18)}…` : name
      })

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', '#cbd5e1')
      .attr('font-size', 12)
      .text(
        this.metric === 'cpu'
          ? 'CPU'
          : this.metric === 'memory'
            ? 'Memory'
            : 'File I/O',
      )

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 18)
      .attr('fill', '#f8fafc')
      .attr('font-size', 14)
      .attr('font-weight', 700)
      .text('Top Processes')
  }

  private switchMetric(metric: Metric) {
    if (this.metric === metric) return
    this.metric = metric
    this.refreshData()
  }

  render() {
    return html`
      <div class="container">
        <div class="panel header">
          <div class="title">📊 System Monitor</div>
          <div class="controls">
            <button
              class=${this.metric === 'cpu' ? 'active' : ''}
              @click=${() => this.switchMetric('cpu')}
            >
              CPU
            </button>
            <button
              class=${this.metric === 'memory' ? 'active' : ''}
              @click=${() => this.switchMetric('memory')}
            >
              Memory
            </button>
            <button
              class=${this.metric === 'io' ? 'active' : ''}
              @click=${() => this.switchMetric('io')}
            >
              File I/O
            </button>
            <button
              class=${this.liveMode ? 'active' : ''}
              @click=${() => this.toggleLiveMode()}
            >
              Live ${this.liveMode ? 'On' : 'Off'}
            </button>
            <button @click=${() => this.refreshData()}>Refresh</button>
          </div>
          <div class="meta">
            ${this.updatedAt
              ? `Updated: ${new Date(this.updatedAt).toLocaleTimeString()}`
              : ''}
            ${typeof this.resources?.cpuFreePercent === 'number'
              ? ` • CPU frei: ${this.resources.cpuFreePercent.toFixed(1)} %`
              : ''}
            ${this.resources?.memoryFreeMB != null
              ? ` • MEM frei: ${this.formatFreeMemory()}`
              : ''}
            ${typeof this.resources?.diskFreeGB === 'number'
              ? ` • Disk frei: ${this.resources.diskFreeGB.toFixed(1)} GB`
              : ''}
            ${typeof this.diskIoMBps === 'number'
              ? ` • Disk I/O: ${this.diskIoMBps.toFixed(2)} MB/s`
              : ''}
          </div>
        </div>

        <div class="content">
          <div class="panel chart-wrap">
            ${this.loading && !this.entries.length
              ? html`<div class="state">Loading…</div>`
              : this.error
                ? html`<div class="state">${this.error}</div>`
                : html`
                    <svg id="resource-pie"></svg>
                    <div id="pie-tooltip" class="tooltip"></div>
                  `}
          </div>

          <div class="panel list">
            ${this.entries.map(
              (entry) => html`
                <div class="row">
                  <div class="name" title=${this.getCommandText(entry)}>
                    ${this.getDisplayProcessName(this.getCommandText(entry))}
                  </div>
                  <div class="value">${this.formatValue(entry)}</div>
                  <button
                    class="copy-btn"
                    @click=${(e: Event) => this.copyCommand(entry, e)}
                  >
                    Copy
                  </button>
                  <button
                    class="kill-btn"
                    @click=${(e: Event) => this.killProcess(entry, e)}
                  >
                    Kill
                  </button>
                </div>
              `,
            )}
          </div>
        </div>
      </div>
    `
  }
}
