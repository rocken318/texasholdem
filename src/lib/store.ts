// src/lib/store.ts
import { createServerClient } from '@/lib/supabase/server'
import type { Room, Player, Hand, HandPlayer, Action } from '@/types/domain'

export const store = {
  // Rooms
  async createRoom(room: Room): Promise<Room> {
    const db = createServerClient()
    const { data, error } = await db.from('rooms').insert(room).select().single()
    if (error) throw error
    return data as Room
  },

  async getRoomByCode(joinCode: string): Promise<Room | null> {
    const db = createServerClient()
    const { data } = await db.from('rooms').select().eq('join_code', joinCode).single()
    return (data as Room) ?? null
  },

  async getRoomById(id: string): Promise<Room | null> {
    const db = createServerClient()
    const { data } = await db.from('rooms').select().eq('id', id).single()
    return (data as Room) ?? null
  },

  async updateRoom(id: string, updates: Partial<Room>): Promise<void> {
    const db = createServerClient()
    const { error } = await db.from('rooms').update(updates).eq('id', id)
    if (error) throw error
  },

  // Players
  async createPlayer(player: Player): Promise<Player> {
    const db = createServerClient()
    const { data, error } = await db.from('players').insert(player).select().single()
    if (error) throw error
    return data as Player
  },

  async getPlayersByRoom(roomId: string): Promise<Player[]> {
    const db = createServerClient()
    const { data } = await db.from('players').select().eq('room_id', roomId).order('joined_at')
    return (data as Player[]) ?? []
  },

  async updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
    const db = createServerClient()
    const { error } = await db.from('players').update(updates).eq('id', id)
    if (error) throw error
  },

  // Hands
  async createHand(hand: Hand): Promise<Hand> {
    const db = createServerClient()
    const { data, error } = await db.from('hands').insert(hand).select().single()
    if (error) throw error
    return data as Hand
  },

  async getCurrentHand(roomId: string): Promise<Hand | null> {
    const db = createServerClient()
    const { data } = await db
      .from('hands').select()
      .eq('room_id', roomId)
      .not('street', 'eq', 'finished')
      .order('hand_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    return (data as Hand) ?? null
  },

  async updateHand(id: string, updates: Partial<Hand>): Promise<void> {
    const db = createServerClient()
    const { error } = await db.from('hands').update(updates).eq('id', id)
    if (error) throw error
  },

  // Hand Players
  async createHandPlayers(handPlayers: HandPlayer[]): Promise<void> {
    const db = createServerClient()
    const { error } = await db.from('hand_players').insert(handPlayers)
    if (error) throw error
  },

  async getHandPlayers(handId: string): Promise<HandPlayer[]> {
    const db = createServerClient()
    const { data } = await db.from('hand_players').select().eq('hand_id', handId)
    return (data as HandPlayer[]) ?? []
  },

  async getHandPlayer(handId: string, playerId: string): Promise<HandPlayer | null> {
    const db = createServerClient()
    const { data } = await db
      .from('hand_players').select()
      .eq('hand_id', handId).eq('player_id', playerId)
      .maybeSingle()
    return (data as HandPlayer) ?? null
  },

  async updateHandPlayer(handId: string, playerId: string, updates: Partial<HandPlayer>): Promise<void> {
    const db = createServerClient()
    const { error } = await db
      .from('hand_players').update(updates)
      .eq('hand_id', handId).eq('player_id', playerId)
    if (error) throw error
  },

  // Actions
  async createAction(action: Action): Promise<void> {
    const db = createServerClient()
    const { error } = await db.from('actions').insert(action)
    if (error) throw error
  },

  async countActionsForHandStreet(handId: string, street: string): Promise<number> {
    const db = createServerClient()
    const { count } = await db
      .from('actions')
      .select('*', { count: 'exact', head: true })
      .eq('hand_id', handId)
      .eq('street', street)
    return count ?? 0
  },
}
