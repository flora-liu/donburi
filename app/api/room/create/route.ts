import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { redis, setRoom } from '@/lib/redis'
import { generateRoomCode, createInitialScores, DEFAULT_ROUND_TYPES } from '@/lib/game-logic'
import { Room } from '@/types/game'

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const playerId = uuidv4()
  let code = generateRoomCode()
  let attempts = 0
  while (attempts < 10) {
    const existing = await redis.get(`room:${code}`)
    if (!existing) break
    code = generateRoomCode()
    attempts++
  }

  const room: Room = {
    code,
    hostId: playerId,
    status: 'lobby',
    wordsPerPerson: 5,
    players: [{ id: playerId, name: name.trim(), teamIndex: 0 }],
    bowl: [],
    enabledRoundTypes: [...DEFAULT_ROUND_TYPES],
    currentRoundIndex: 0,
    currentTeamIndex: 0,
    teamTurnIndices: [0, 0],
    activePlayerId: null,
    turnStartedAt: null,
    scores: createInitialScores(2, DEFAULT_ROUND_TYPES.length),
    submittedPlayerIds: [],
    skippedWordId: null,
  }

  await setRoom(room)
  return NextResponse.json({ code, playerId })
}
