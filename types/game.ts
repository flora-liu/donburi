export type GameStatus =
  | 'lobby'
  | 'submitting'
  | 'ready'
  | 'playing'
  | 'roundEnd'
  | 'gameOver'

export type RoundType = 'describe' | 'charades' | 'oneWord'

export type Player = {
  id: string
  name: string
  teamIndex: number
}

export type Word = {
  id: string
  text: string
  authorId: string
}

export type Room = {
  code: string
  hostId: string
  status: GameStatus
  wordsPerPerson: number
  players: Player[]
  bowl: Word[]
  enabledRoundTypes: RoundType[]
  currentRoundIndex: number // index into enabledRoundTypes
  currentTeamIndex: number
  teamTurnIndices: [number, number]
  activePlayerId: string | null
  turnStartedAt: number | null
  scores: number[][] // [teamIndex][roundIndex]
  submittedPlayerIds: string[]
  skippedWordId: string | null
}

export type TurnEndReason = 'timeout' | 'bowlEmpty'

export type TurnStartedPayload = {
  activePlayerId: string
  teamIndex: number
  roundIndex: number
  timerDuration: number
}

export type WordDrawnPayload = {
  word: Word
}

export type ScoreUpdatedPayload = {
  scores: number[][]
  bowlCount: number
}

export type TurnEndedPayload = {
  reason: TurnEndReason
}
