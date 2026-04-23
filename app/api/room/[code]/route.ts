import { NextRequest, NextResponse } from 'next/server'
import { getRoom } from '@/lib/redis'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const room = await getRoom(code.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  return NextResponse.json(room)
}
