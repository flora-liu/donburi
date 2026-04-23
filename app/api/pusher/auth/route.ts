import { NextRequest, NextResponse } from 'next/server'
import { pusherServer } from '@/lib/pusher'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const params = new URLSearchParams(body)
  const socketId = params.get('socket_id')
  const channelName = params.get('channel_name')
  const playerId = params.get('user_id') // sent by client as custom header or form data
  const playerName = params.get('user_name') || 'Unknown'

  if (!socketId || !channelName) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  if (channelName.startsWith('presence-')) {
    const presenceData = {
      user_id: playerId || socketId,
      user_info: { name: playerName },
    }
    const auth = pusherServer.authorizeChannel(socketId, channelName, presenceData)
    return NextResponse.json(auth)
  }

  if (channelName.startsWith('private-')) {
    const auth = pusherServer.authorizeChannel(socketId, channelName)
    return NextResponse.json(auth)
  }

  return NextResponse.json({ error: 'Unknown channel type' }, { status: 400 })
}
