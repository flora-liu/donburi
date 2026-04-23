import { Redis } from '@upstash/redis'
import { Room } from '@/types/game'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const ROOM_TTL = 60 * 60 * 4 // 4 hours

export async function getRoom(code: string) {
  return redis.get<Room>(`room:${code}`)
}

export async function setRoom(room: Room) {
  await redis.set(`room:${room.code}`, room, { ex: ROOM_TTL })
}
