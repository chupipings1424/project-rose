import { apiFetch, readJson, requestJson } from '../api/http'

/** The admin part of the ROSE API: only admins get past the server's check. */
export const USERS_API = '/api/admin/users'

interface UserDto {
  id: string
  email: string
  is_admin: boolean
  must_change_password: boolean
  created_at: string
}

/** A ROSE account as the Users page shows it. */
export interface RoseUser {
  id: string
  email: string
  isAdmin: boolean
  /** Still on the temporary password the admin gave them. */
  mustChangePassword: boolean
  createdAt: string
}

const fromDto = (dto: UserDto): RoseUser => ({
  id: dto.id,
  email: dto.email,
  isAdmin: dto.is_admin,
  mustChangePassword: dto.must_change_password,
  createdAt: dto.created_at,
})

const post = (url: string, body: unknown) => requestJson<UserDto>(url, { method: 'POST', body: JSON.stringify(body) })

export const usersApi = {
  list: async () => (await requestJson<UserDto[]>(USERS_API)).map(fromDto),
  add: async (email: string, temporaryPassword: string) =>
    fromDto(await post(USERS_API, { email, temporary_password: temporaryPassword })),
  resetPassword: async (id: string, temporaryPassword: string) =>
    fromDto(await post(`${USERS_API}/${encodeURIComponent(id)}/password`, { temporary_password: temporaryPassword })),
  /** Deletes the login and everything the account owns. */
  remove: async (id: string) => {
    const response = await apiFetch(`${USERS_API}/${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!response.ok) await readJson(response) // throws with the server's message
  },
}

// Letters and digits that can't be mixed up when read aloud or copied by hand (no 0/O, 1/l/I).
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** A random temporary password, e.g. "hT7k-q3Rm-Zp9x". Uses the browser's secure random numbers. */
export function temporaryPassword(): string {
  const chars: string[] = []
  const limit = 256 - (256 % ALPHABET.length) // skip bytes that would favour the first letters
  while (chars.length < 12) {
    for (const byte of crypto.getRandomValues(new Uint8Array(16))) {
      if (byte < limit && chars.length < 12) chars.push(ALPHABET[byte % ALPHABET.length])
    }
  }
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8).join('')}`
}