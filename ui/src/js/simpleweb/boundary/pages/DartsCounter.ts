import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

type DartsMode = 'x01' | 'cricket' | 'clock'

interface DartsSnapshot {
  mode: DartsMode
  players: DartsPlayer[]
  activePlayerIndex: number
  winnerMessage: string
  selectedMultiplier: 1 | 2 | 3
  dartsLeft: number
  x01DoubleOut: boolean
  turnLog: string[]
}

interface DartsPlayer {
  name: string
  x01Remaining: number
  cricketMarks: Record<string, number>
  cricketScore: number
  clockTarget: number
}

const CRICKET_TARGETS = [15, 16, 17, 18, 19, 20, 25]
const DART_FIELDS = [
  20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 25,
]
const DARTS_COUNTER_STATE_KEY = 'nh-darts-counter-state-v1'

@customElement('nh-darts-counter')
export class DartsCounter extends LitElement {
  @state() private mode: DartsMode = 'x01'
  @state() private players: DartsPlayer[] = [
    this.createPlayer('Player 1'),
    this.createPlayer('Player 2'),
  ]
  @state() private activePlayerIndex = 0
  @state() private winnerMessage = ''
  @state() private turnLog: string[] = []
  @state() private selectedMultiplier: 1 | 2 | 3 = 1
  @state() private dartsLeft = 3
  private undoStack: DartsSnapshot[] = []
  private isRestoringState = false

  @state() private x01DoubleOut = false

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
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      height: 100%;
      padding: 1rem;
      box-sizing: border-box;
      overflow: hidden;
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

    .mode-row,
    .controls-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .mode-btn,
    .action-btn {
      border: none;
      border-radius: 8px;
      padding: 0.5rem 0.85rem;
      font-weight: 600;
      cursor: pointer;
      background: rgba(148, 163, 184, 0.25);
      color: #e2e8f0;
      transition: all 0.15s ease;
    }

    .mode-btn.active {
      background: rgba(59, 130, 246, 0.65);
      color: #ffffff;
    }

    .mode-btn:hover,
    .action-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.08);
    }

    .action-btn.primary {
      background: rgba(34, 197, 94, 0.7);
    }

    .action-btn.warn {
      background: rgba(239, 68, 68, 0.65);
    }

    .reset {
      width: 10em;
    }

    .status {
      font-size: 0.9rem;
      color: #cbd5e1;
      min-height: 1.2rem;
    }

    .status.win {
      color: #86efac;
      font-weight: 700;
    }

    .layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.9rem;
      flex: 1 1 0;
      min-height: 0;
      overflow: hidden;
    }

    .left {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      min-height: 0;
      overflow: hidden;
    }

    .players-scroll {
      flex: 0 1 auto;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .bottom-log {
      min-height: 120px;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      flex: 1 1 0;
      margin-top: 0.2rem;
      position: relative;
      z-index: 2;
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(148, 163, 184, 0.28);
      overflow: hidden;
      border-radius: 10px;
      padding: 0.55rem;
    }

    .players-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(240px, 1fr));
      gap: 0.75rem;
      align-content: start;
    }

    .player-card {
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 10px;
      padding: 0.75rem;
      background: rgba(15, 23, 42, 0.4);
      cursor: pointer;
    }

    .player-card.active {
      border-color: #60a5fa;
      box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.5);
    }

    .throw-controls {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      margin-top: 0.6rem;
    }

    .multiplier-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      align-items: center;
    }

    .multiplier-btn {
      border: 1px solid rgba(148, 163, 184, 0.45);
      border-radius: 8px;
      padding: 0.4rem 0.75rem;
      background: rgba(15, 23, 42, 0.5);
      color: #e2e8f0;
      font-weight: 700;
      cursor: pointer;
    }

    .multiplier-btn.active {
      background: rgba(59, 130, 246, 0.65);
      border-color: #93c5fd;
      color: #ffffff;
    }

    .field-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(52px, 1fr));
      gap: 0.4rem;
    }

    .field-btn {
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 8px;
      padding: 0.45rem 0.35rem;
      background: rgba(15, 23, 42, 0.58);
      color: #f1f5f9;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.82rem;
    }

    .field-btn:hover {
      background: rgba(51, 65, 85, 0.7);
      transform: translateY(-1px);
    }

    .field-btn.bull {
      background: rgba(168, 85, 247, 0.5);
      border-color: rgba(216, 180, 254, 0.6);
    }

    .player-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.4rem;
    }

    .player-name {
      width: 100%;
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.5);
      color: #e2e8f0;
      padding: 0.35rem 0.5rem;
      font-size: 0.9rem;
      box-sizing: border-box;
    }

    .player-score {
      font-size: 1.45rem;
      font-weight: 700;
      color: #f8fafc;
    }

    .subinfo {
      font-size: 0.82rem;
      color: #94a3b8;
      margin-top: 0.2rem;
    }

    .marks {
      display: grid;
      grid-template-columns: repeat(4, minmax(56px, 1fr));
      gap: 0.35rem;
      margin-top: 0.45rem;
    }

    .mark {
      border-radius: 6px;
      padding: 0.3rem;
      background: rgba(30, 41, 59, 0.7);
      text-align: center;
      font-size: 0.78rem;
    }

    label {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: #cbd5e1;
      font-size: 0.9rem;
    }

    input,
    select {
      border: 1px solid rgba(148, 163, 184, 0.4);
      border-radius: 6px;
      padding: 0.35rem 0.45rem;
      background: rgba(15, 23, 42, 0.6);
      color: #e2e8f0;
      font-size: 0.9rem;
    }

    .log {
      min-height: 0;
      flex: 1 1 auto;
      overflow: auto;
      background: rgba(15, 23, 42, 0.5);
      border-radius: 10px;
      padding: 0.65rem;
      border: 1px solid rgba(148, 163, 184, 0.25);
      max-height: none;
    }

    .log-item {
      font-size: 0.83rem;
      color: #cbd5e1;
      padding: 0.25rem 0;
      border-bottom: 1px solid rgba(148, 163, 184, 0.15);
    }

    .log-item:last-child {
      border-bottom: none;
    }

    .active-line {
      color: #93c5fd;
      font-weight: 600;
      margin-top: 0.2rem;
    }

    @media (max-width: 1100px) {
      .layout {
        grid-template-columns: 1fr;
      }

      .players-grid {
        grid-template-columns: 1fr;
      }
    }
  `

  private createPlayer(name: string): DartsPlayer {
    const marks: Record<string, number> = {}
    for (const target of CRICKET_TARGETS) {
      marks[String(target)] = 0
    }

    return {
      name,
      x01Remaining: 501,
      cricketMarks: marks,
      cricketScore: 0,
      clockTarget: 1,
    }
  }

  connectedCallback() {
    super.connectedCallback()
    this.restoreState()
  }

  protected updated() {
    if (!this.isRestoringState) {
      this.persistState()
    }
  }

  private resetModeState() {
    this.pushUndoSnapshot()
    this.players = this.players.map((player) => ({
      ...this.createPlayer(player.name),
      name: player.name,
    }))
    this.activePlayerIndex = 0
    this.dartsLeft = 3
    this.winnerMessage = ''
    this.turnLog = []
  }

  private switchMode(nextMode: DartsMode) {
    this.pushUndoSnapshot()
    this.mode = nextMode
    this.players = this.players.map((player) => ({
      ...this.createPlayer(player.name),
      name: player.name,
    }))
    this.activePlayerIndex = 0
    this.dartsLeft = 3
    this.winnerMessage = ''
    this.turnLog = []
  }

  private setActivePlayer(index: number) {
    this.pushUndoSnapshot()
    this.activePlayerIndex = index
    this.dartsLeft = 3
  }

  private updatePlayerName(index: number, value: string) {
    const nextName = value.trim() || `Player ${index + 1}`
    this.players = this.players.map((player, playerIndex) =>
      playerIndex === index ? { ...player, name: nextName } : player,
    )
  }

  private advancePlayerTurn() {
    this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length
    this.dartsLeft = 3
  }

  private nextPlayerManually() {
    this.pushUndoSnapshot()
    this.advancePlayerTurn()
  }

  private createSnapshot(): DartsSnapshot {
    return {
      mode: this.mode,
      players: this.players.map((player) => ({
        ...player,
        cricketMarks: { ...player.cricketMarks },
      })),
      activePlayerIndex: this.activePlayerIndex,
      winnerMessage: this.winnerMessage,
      selectedMultiplier: this.selectedMultiplier,
      dartsLeft: this.dartsLeft,
      x01DoubleOut: this.x01DoubleOut,
      turnLog: [...this.turnLog],
    }
  }

  private applySnapshot(snapshot: DartsSnapshot) {
    this.mode = snapshot.mode
    this.players = snapshot.players.map((player) => ({
      ...player,
      cricketMarks: { ...player.cricketMarks },
    }))
    this.activePlayerIndex = snapshot.activePlayerIndex
    this.winnerMessage = snapshot.winnerMessage
    this.selectedMultiplier = snapshot.selectedMultiplier
    this.dartsLeft = snapshot.dartsLeft
    this.x01DoubleOut = snapshot.x01DoubleOut
    this.turnLog = [...snapshot.turnLog]
  }

  private pushUndoSnapshot() {
    if (this.isRestoringState) return
    this.undoStack.push(this.createSnapshot())
    if (this.undoStack.length > 50) {
      this.undoStack.shift()
    }
  }

  private undoLastAction() {
    const snapshot = this.undoStack.pop()
    if (!snapshot) return

    this.isRestoringState = true
    this.applySnapshot(snapshot)
    this.isRestoringState = false
  }

  private persistState() {
    try {
      const snapshot = this.createSnapshot()
      localStorage.setItem(DARTS_COUNTER_STATE_KEY, JSON.stringify(snapshot))
    } catch {
      // ignore persistence errors
    }
  }

  private restoreState() {
    try {
      const raw = localStorage.getItem(DARTS_COUNTER_STATE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw) as Partial<DartsSnapshot>
      if (!parsed || typeof parsed !== 'object') return
      if (!Array.isArray(parsed.players) || parsed.players.length < 2) return

      const mode =
        parsed.mode === 'x01' ||
        parsed.mode === 'cricket' ||
        parsed.mode === 'clock'
          ? parsed.mode
          : 'x01'

      const selectedMultiplier =
        parsed.selectedMultiplier === 2 || parsed.selectedMultiplier === 3
          ? parsed.selectedMultiplier
          : 1

      const snapshot: DartsSnapshot = {
        mode,
        players: parsed.players.map((player, index) => {
          const base = this.createPlayer(`Player ${index + 1}`)
          const safePlayer = player as Partial<DartsPlayer>
          const marks = { ...base.cricketMarks }
          if (
            safePlayer.cricketMarks &&
            typeof safePlayer.cricketMarks === 'object'
          ) {
            for (const target of CRICKET_TARGETS) {
              const value = Number(
                (safePlayer.cricketMarks as Record<string, unknown>)[
                  String(target)
                ] ?? 0,
              )
              marks[String(target)] = Number.isFinite(value)
                ? Math.max(0, Math.min(3, Math.floor(value)))
                : 0
            }
          }

          return {
            name:
              typeof safePlayer.name === 'string' && safePlayer.name.trim()
                ? safePlayer.name
                : base.name,
            x01Remaining: Number.isFinite(Number(safePlayer.x01Remaining))
              ? Math.max(0, Math.floor(Number(safePlayer.x01Remaining)))
              : base.x01Remaining,
            cricketMarks: marks,
            cricketScore: Number.isFinite(Number(safePlayer.cricketScore))
              ? Math.floor(Number(safePlayer.cricketScore))
              : base.cricketScore,
            clockTarget: Number.isFinite(Number(safePlayer.clockTarget))
              ? Math.max(
                  1,
                  Math.min(22, Math.floor(Number(safePlayer.clockTarget))),
                )
              : base.clockTarget,
          }
        }),
        activePlayerIndex: Number.isFinite(Number(parsed.activePlayerIndex))
          ? Math.max(
              0,
              Math.min(
                parsed.players.length - 1,
                Math.floor(Number(parsed.activePlayerIndex)),
              ),
            )
          : 0,
        winnerMessage:
          typeof parsed.winnerMessage === 'string' ? parsed.winnerMessage : '',
        selectedMultiplier,
        dartsLeft: Number.isFinite(Number(parsed.dartsLeft))
          ? Math.max(1, Math.min(3, Math.floor(Number(parsed.dartsLeft))))
          : 3,
        x01DoubleOut: !!parsed.x01DoubleOut,
        turnLog: Array.isArray(parsed.turnLog)
          ? parsed.turnLog
              .filter((item): item is string => typeof item === 'string')
              .slice(0, 40)
          : [],
      }

      this.isRestoringState = true
      this.applySnapshot(snapshot)
      this.isRestoringState = false
    } catch {
      // ignore invalid stored state
    }
  }

  private consumeDart(options?: { forceEndTurn?: boolean }) {
    if (this.winnerMessage) return

    if (options?.forceEndTurn) {
      this.advancePlayerTurn()
      return
    }

    const nextDartsLeft = this.dartsLeft - 1
    if (nextDartsLeft <= 0) {
      this.advancePlayerTurn()
      return
    }

    this.dartsLeft = nextDartsLeft
  }

  private addLog(entry: string) {
    this.turnLog = [entry, ...this.turnLog].slice(0, 40)
  }

  private getPlayerName(index: number): string {
    return this.players[index]?.name || `Player ${index + 1}`
  }

  private formatClockTarget(target: number): string {
    if (target <= 20) return String(target)
    if (target === 21) return 'Bull'
    return 'Done'
  }

  private multiplierLabel(multiplier: 1 | 2 | 3): string {
    if (multiplier === 2) return 'Double'
    if (multiplier === 3) return 'Triple'
    return 'Single'
  }

  private getX01ThrowPoints(field: number, multiplier: 1 | 2 | 3): number {
    if (field === 25) {
      return multiplier === 2 ? 50 : 25
    }
    return field * multiplier
  }

  private getFieldLabel(field: number): string {
    return field === 25 ? 'Bull' : String(field)
  }

  private applyX01Throw(field: number, multiplier: 1 | 2 | 3) {
    if (this.winnerMessage) return

    const scored = this.getX01ThrowPoints(field, multiplier)
    const player = this.players[this.activePlayerIndex]
    const remaining = player.x01Remaining
    const nextRemaining = remaining - scored

    if (nextRemaining < 0) {
      this.addLog(
        `${player.name}: bust (${this.multiplierLabel(multiplier)} ${this.getFieldLabel(field)})`,
      )
      this.consumeDart({ forceEndTurn: true })
      return
    }

    if (nextRemaining === 0 && this.x01DoubleOut && multiplier !== 2) {
      this.addLog(`${player.name}: bust (double out required)`)
      this.consumeDart({ forceEndTurn: true })
      return
    }

    this.players = this.players.map((currentPlayer, index) =>
      index === this.activePlayerIndex
        ? { ...currentPlayer, x01Remaining: nextRemaining }
        : currentPlayer,
    )

    this.addLog(
      `${player.name}: ${this.multiplierLabel(multiplier)} ${this.getFieldLabel(field)} = ${scored} → ${nextRemaining}`,
    )

    if (nextRemaining === 0) {
      this.winnerMessage = `🏆 ${player.name} wins 501 (double out)!`
      return
    }

    this.consumeDart()
  }

  private applyCricketThrow(field: number, multiplier: 1 | 2 | 3) {
    if (this.winnerMessage) return

    if (!CRICKET_TARGETS.includes(field)) {
      this.addLog(
        `${this.getPlayerName(this.activePlayerIndex)}: ${this.multiplierLabel(multiplier)} ${this.getFieldLabel(field)} (no cricket mark)`,
      )
      this.consumeDart()
      return
    }

    const hits = multiplier
    const targetKey = String(field)
    const targetValue = field
    const activeIndex = this.activePlayerIndex
    const activePlayer = this.players[activeIndex]

    const currentMarks = activePlayer.cricketMarks[targetKey] || 0
    const totalMarks = currentMarks + hits
    const updatedMarks = Math.min(3, totalMarks)
    const extraHits = Math.max(0, totalMarks - 3)

    const updatedPlayers = this.players.map((player, index) => {
      if (index === activeIndex) {
        return {
          ...player,
          cricketMarks: {
            ...player.cricketMarks,
            [targetKey]: updatedMarks,
          },
        }
      }

      if (extraHits > 0 && (player.cricketMarks[targetKey] || 0) < 3) {
        return {
          ...player,
          cricketScore: player.cricketScore - targetValue * extraHits,
        }
      }

      return player
    })

    this.players = updatedPlayers

    if (extraHits > 0) {
      this.addLog(
        `${activePlayer.name}: ${this.multiplierLabel(multiplier)} ${this.getFieldLabel(field)} (cut-throat: -${extraHits * targetValue} to open opponents)`,
      )
    } else {
      this.addLog(
        `${activePlayer.name}: ${this.multiplierLabel(multiplier)} ${this.getFieldLabel(field)}`,
      )
    }

    const postTurnPlayer = updatedPlayers[activeIndex]
    const closedAll = CRICKET_TARGETS.every(
      (field) => (postTurnPlayer.cricketMarks[String(field)] || 0) >= 3,
    )
    const scoreAtLeastOpponents = updatedPlayers.every(
      (player, index) =>
        index === activeIndex ||
        postTurnPlayer.cricketScore >= player.cricketScore,
    )

    if (closedAll && scoreAtLeastOpponents) {
      this.winnerMessage = `🏆 ${postTurnPlayer.name} wins Cut-Throat Cricket!`
      return
    }

    this.consumeDart()
  }

  private applyClockThrow(field: number, multiplier: 1 | 2 | 3) {
    if (this.winnerMessage) return

    const hits = multiplier
    const activeIndex = this.activePlayerIndex
    const player = this.players[activeIndex]
    const startTarget = player.clockTarget
    const expectedField = startTarget === 21 ? 25 : startTarget

    if (field !== expectedField) {
      this.addLog(
        `${player.name}: miss (${this.getFieldLabel(field)}; needed ${this.formatClockTarget(startTarget)})`,
      )
      this.consumeDart()
      return
    }

    const endTarget = startTarget + hits

    this.players = this.players.map((currentPlayer, index) =>
      index === activeIndex
        ? { ...currentPlayer, clockTarget: Math.min(22, endTarget) }
        : currentPlayer,
    )

    this.addLog(
      `${player.name}: ${this.multiplierLabel(multiplier)} ${this.formatClockTarget(startTarget)} → ${this.formatClockTarget(Math.min(22, endTarget))}`,
    )

    if (endTarget > 21) {
      this.winnerMessage = `🏆 ${player.name} wins Round the Clock!`
      return
    }

    this.consumeDart()
  }

  private applyThrow(field: number) {
    this.pushUndoSnapshot()

    if (this.mode === 'x01') {
      this.applyX01Throw(field, this.selectedMultiplier)
      return
    }

    if (this.mode === 'cricket') {
      this.applyCricketThrow(field, this.selectedMultiplier)
      return
    }

    this.applyClockThrow(field, this.selectedMultiplier)
  }

  private renderPlayerCard(player: DartsPlayer, index: number) {
    const isActive = index === this.activePlayerIndex

    return html`
      <div
        class="player-card ${isActive ? 'active' : ''}"
        @click=${() => this.setActivePlayer(index)}
      >
        <div class="player-head">
          <input
            class="player-name"
            .value=${player.name}
            @click=${(event: Event) => event.stopPropagation()}
            @input=${(event: Event) =>
              this.updatePlayerName(
                index,
                (event.target as HTMLInputElement).value,
              )}
          />
        </div>

        ${this.mode === 'x01'
          ? html`
              <div class="player-score">${player.x01Remaining}</div>
              <div class="subinfo">Remaining points</div>
            `
          : ''}
        ${this.mode === 'cricket'
          ? html`
              <div class="player-score">${player.cricketScore}</div>
              <div class="subinfo">Score (cut-throat)</div>
              <div class="marks">
                ${CRICKET_TARGETS.map(
                  (target) => html`
                    <div class="mark">
                      ${target}: ${player.cricketMarks[String(target)] || 0}
                    </div>
                  `,
                )}
              </div>
            `
          : ''}
        ${this.mode === 'clock'
          ? html`
              <div class="player-score">
                ${this.formatClockTarget(player.clockTarget)}
              </div>
              <div class="subinfo">Current target</div>
            `
          : ''}
      </div>
    `
  }

  render() {
    const activeName = this.getPlayerName(this.activePlayerIndex)

    return html`
      <div class="container">
        <div class="panel header top-header-panel">
          <div class="title">🎯 Darts Counter</div>
          <div class="mode-row">
            <button
              class="mode-btn ${this.mode === 'x01' ? 'active' : ''}"
              @click=${() => this.switchMode('x01')}
            >
              501 Double Out
            </button>
            <button
              class="mode-btn ${this.mode === 'cricket' ? 'active' : ''}"
              @click=${() => this.switchMode('cricket')}
            >
              Cut-Throat Cricket
            </button>
            <button
              class="mode-btn ${this.mode === 'clock' ? 'active' : ''}"
              @click=${() => this.switchMode('clock')}
            >
              Round the Clock
            </button>
            <button class="action-btn warn reset" @click=${this.resetModeState}>
              Reset
            </button>
          </div>
        </div>

        <div class="panel controls-panel">
          <div class="controls-row">
            ${this.mode === 'x01'
              ? html`
                  <label>
                    <input
                      type="checkbox"
                      .checked=${this.x01DoubleOut}
                      @change=${(event: Event) => {
                        this.x01DoubleOut = (
                          event.target as HTMLInputElement
                        ).checked
                      }}
                    />
                    Double out on finish
                  </label>
                `
              : ''}
            <button class="action-btn" @click=${this.nextPlayerManually}>
              Next player
            </button>
            <button
              class="action-btn"
              @click=${this.undoLastAction}
              ?disabled=${this.undoStack.length === 0}
            >
              Undo
            </button>
          </div>

          <div class="throw-controls">
            <div class="multiplier-row">
              <span>Multiplier first:</span>
              ${([1, 2, 3] as const).map(
                (multiplier) => html`
                  <button
                    class="multiplier-btn ${this.selectedMultiplier ===
                    multiplier
                      ? 'active'
                      : ''}"
                    @click=${() => {
                      this.selectedMultiplier = multiplier
                    }}
                  >
                    ${multiplier === 1
                      ? 'Single'
                      : multiplier === 2
                        ? 'Double'
                        : 'Triple'}
                  </button>
                `,
              )}
            </div>

            <div class="field-grid">
              ${DART_FIELDS.map(
                (field) => html`
                  <button
                    class="field-btn ${field === 25 ? 'bull' : ''}"
                    @click=${() => {
                      this.applyThrow(field)
                    }}
                  >
                    ${field === 25 ? 'Bull' : field}
                  </button>
                `,
              )}
            </div>
          </div>

          <div class="active-line">Active: ${activeName}</div>
          <div class="active-line">Darts left: ${this.dartsLeft}</div>
          <div class="status ${this.winnerMessage ? 'win' : ''}">
            ${this.winnerMessage || ''}
          </div>
        </div>

        <div class="layout">
          <div class="left panel">
            <div class="players-scroll">
              <div class="players-grid">
                ${this.players.map((player, index) =>
                  this.renderPlayerCard(player, index),
                )}
              </div>
            </div>

            <div class="bottom-log">
              <h3 style="margin: 0; font-size: 0.95rem;">Turn Log</h3>
              <div class="log">
                ${this.turnLog.length === 0
                  ? html`<div class="log-item">No turns yet.</div>`
                  : this.turnLog.map(
                      (entry) => html`<div class="log-item">${entry}</div>`,
                    )}
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nh-darts-counter': DartsCounter
  }
}
