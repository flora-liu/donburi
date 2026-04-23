import Pusher from 'pusher'
import PusherClient from 'pusher-js'

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})

export function getPusherClient() {
  return new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: '/api/pusher/auth',
  })
}

export function roomChannel(code: string) {
  return `presence-room-${code}`
}

export function privatePlayerChannel(playerId: string) {
  return `private-player-${playerId}`
}
