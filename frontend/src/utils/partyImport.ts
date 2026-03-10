import type { PartyMember } from '../types'

export const PARTY_EXPORT_VERSION = 1

export interface VersionedPartyExport {
  version: number
  members: PartyMember[]
}

export function createVersionedPartyExport(members: PartyMember[]): VersionedPartyExport {
  return {
    version: PARTY_EXPORT_VERSION,
    members,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function extractImportedMemberEntries(data: unknown): unknown[] | null {
  if (Array.isArray(data)) {
    return data
  }

  if (!isRecord(data)) {
    return null
  }

  const maybeMembers = data.members
  if (!Array.isArray(maybeMembers)) {
    return null
  }

  return maybeMembers
}
