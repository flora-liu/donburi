import { NextRequest, NextResponse } from 'next/server'
import { getRoom, setRoom } from '@/lib/redis'
import { pusherServer, roomChannel, privatePlayerChannel } from '@/lib/pusher'
import { getCurrentActivePlayer, drawWord } from '@/lib/game-logic'

export async function POST(req: NextRequest) {
  const { code, playerId } = await req.json()

  const room = await getRoom(code)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.status !== 'playing') return NextResponse.json({ error: 'Not playing' }, { status: 400 })
  if (room.activePlayerId) return NextResponse.json({ error: 'Turn already active' }, { status: 400 })

  const activePlayer = getCurrentActivePlayer(room)
  if (!activePlayer || activePlayer.id !== playerId)
    return NextResponse.json({ error: 'Not your turn' }, { status: 403 })

  if (room.bowl.length === 0)
    return NextResponse.json({ error: 'Bowl is empty' }, { status: 400 })

  const TURN_DURATION = 60
  const carryOver = room.carryOverTime
  // Backdate turnStartedAt so the client's existing TURN_DURATION-based math yields the carry-over remaining seconds.
  const turnStartedAt = carryOver != null
    ? Date.now() - (TURN_DURATION - carryOver) * 1000
    : Date.now()

  room.activePlayerId = playerId
  room.turnStartedAt = turnStartedAt
  room.carryOverTime = null
  room.skippedWordId = null

  await setRoom(room)

  await pusherServer.trigger(roomChannel(code), 'turn-started', {
    activePlayerId: playerId,
    teamIndex: room.currentTeamIndex,
    roundIndex: room.currentRoundIndex,
    timerDuration: carryOver ?? TURN_DURATION,
  })

  const word = drawWord(room.bowl, null)
  if (word) {
    await pusherServer.trigger(privatePlayerChannel(playerId), 'word-drawn', { word })
  }

  await pusherServer.trigger(roomChannel(code), 'room-updated', room)

  return NextResponse.json({ ok: true })
}
