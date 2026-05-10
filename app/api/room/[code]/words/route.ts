import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { Word } from '@/types/game'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const words = await redis.get<Word[]>(`room:${code.toUpperCase()}:originalBowl`)
  if (!words) return NextResponse.json({ error: 'Words not found' }, { status: 404 })
  return NextResponse.json({ words })
}
