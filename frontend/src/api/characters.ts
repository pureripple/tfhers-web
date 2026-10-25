import { get } from './http'
import type { CharacterDetail, GameCharacter } from './types'

export function fetchCharacters() {
  return get<GameCharacter[]>('/api/characters')
}

export function fetchCharacter(id: number | string) {
  return get<CharacterDetail>(`/api/characters/${id}`)
}
