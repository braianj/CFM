import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, deleteDoc, getDoc, getDocs, collection, setDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const OWNER = 'braianj@gmail.com'
const PROMOTED_OWNER = 'segunda.duena@example.com'
const EDITOR = 'planillera@example.com'
const STRANGER = 'curiosa@example.com'

let env: RulesTestEnvironment

const as = (email: string | null) =>
  email === null
    ? env.unauthenticatedContext().firestore()
    : env.authenticatedContext(email, { email }).firestore()

const match = {
  id: 'h-1',
  category: 'men',
  startDateTime: '2026-07-25T21:30:00-03:00',
  stage: 'regular',
  homeTeamId: 'men-cau-2',
  awayTeamId: 'men-cau-1',
  homeScore: null,
  awayScore: null,
  status: 'upcoming',
  countsForStandings: true,
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'cfm-hockey-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})

afterAll(async () => env?.cleanup())

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'admins', EDITOR), { email: EDITOR, role: 'editor' })
    await setDoc(doc(db, 'admins', PROMOTED_OWNER), { email: PROMOTED_OWNER, role: 'owner' })
    await setDoc(doc(db, 'matches', 'h-1'), match)
    await setDoc(doc(db, 'teams', 'men-cau-1'), { id: 'men-cau-1', name: 'CAU Blanco' })
    await setDoc(doc(db, 'players', 'p1'), { id: 'p1', name: 'Alguien', active: true })
  })
})

describe('tournament data', () => {
  describe('when nobody is signed in', () => {
    it('should be readable', async () => {
      await assertSucceeds(getDoc(doc(as(null), 'matches', 'h-1')))
      await assertSucceeds(getDoc(doc(as(null), 'players', 'p1')))
    })

    it('should not be writable', async () => {
      await assertFails(updateDoc(doc(as(null), 'matches', 'h-1'), { homeScore: 9 }))
    })
  })

  describe('when a stranger signs in', () => {
    it('should not be able to write anything', async () => {
      await assertFails(updateDoc(doc(as(STRANGER), 'matches', 'h-1'), { homeScore: 9 }))
      await assertFails(setDoc(doc(as(STRANGER), 'matchEvents', 'e1'), { type: 'goal' }))
    })
  })
})

describe('an editor', () => {
  it('should report a result', async () => {
    await assertSucceeds(
      updateDoc(doc(as(EDITOR), 'matches', 'h-1'), { homeScore: 3, awayScore: 2, resolution: 'overtime', status: 'finished' }),
    )
  })

  it('should report goals and penalties', async () => {
    await assertSucceeds(setDoc(doc(as(EDITOR), 'matchEvents', 'e1'), { type: 'goal', matchId: 'h-1' }))
    await assertSucceeds(deleteDoc(doc(as(EDITOR), 'matchEvents', 'e1')))
  })

  it('should manage who dressed for a match', async () => {
    await assertSucceeds(setDoc(doc(as(EDITOR), 'matchRosters', 'r1'), { matchId: 'h-1', playerId: 'p1' }))
  })

  it('should not move a match to another day or another team', async () => {
    await assertFails(updateDoc(doc(as(EDITOR), 'matches', 'h-1'), { startDateTime: '2026-07-26T21:30:00-03:00' }))
    await assertFails(updateDoc(doc(as(EDITOR), 'matches', 'h-1'), { awayTeamId: 'men-cau-3' }))
  })

  it('should not create or delete a match', async () => {
    await assertFails(setDoc(doc(as(EDITOR), 'matches', 'nuevo'), match))
    await assertFails(deleteDoc(doc(as(EDITOR), 'matches', 'h-1')))
  })

  it('should not touch teams or squads', async () => {
    await assertFails(updateDoc(doc(as(EDITOR), 'teams', 'men-cau-1'), { name: 'Otro' }))
    await assertFails(updateDoc(doc(as(EDITOR), 'players', 'p1'), { active: false }))
  })

  it('should not change the administrator list', async () => {
    await assertFails(setDoc(doc(as(EDITOR), 'admins', STRANGER), { email: STRANGER, role: 'editor' }))
  })

  it('should be able to see the administrator list', async () => {
    await assertSucceeds(getDocs(collection(as(EDITOR), 'admins')))
  })
})

describe('the owner', () => {
  it.each([OWNER, PROMOTED_OWNER])('should run the whole tournament as %s', async (email) => {
    await assertSucceeds(setDoc(doc(as(email), 'matches', 'nuevo'), match))
    await assertSucceeds(deleteDoc(doc(as(email), 'matches', 'nuevo')))
    await assertSucceeds(updateDoc(doc(as(email), 'teams', 'men-cau-1'), { name: 'Otro' }))
    await assertSucceeds(updateDoc(doc(as(email), 'players', 'p1'), { active: false }))
    await assertSucceeds(setDoc(doc(as(email), 'admins', STRANGER), { email: STRANGER, role: 'editor' }))
  })

  it('should keep access even with an empty administrator list', async () => {
    await env.clearFirestore()

    await assertSucceeds(setDoc(doc(as(OWNER), 'admins', EDITOR), { email: EDITOR, role: 'editor' }))
  })

  it('should not be affected by how the address is capitalised', async () => {
    await assertSucceeds(setDoc(doc(as('Braianj@Gmail.com'), 'teams', 'men-cau-1'), { name: 'Otro' }))
  })
})

describe('the administrator list', () => {
  it('should never be public', async () => {
    await assertFails(getDocs(collection(as(null), 'admins')))
    await assertFails(getDocs(collection(as(STRANGER), 'admins')))
  })

  it('should let a signed-in person check their own entry only', async () => {
    await assertSucceeds(getDoc(doc(as(STRANGER), 'admins', STRANGER)))
    await assertFails(getDoc(doc(as(STRANGER), 'admins', EDITOR)))
  })
})

describe('the deployed rules file', () => {
  it('should be the one the site ships', () => {
    expect(readFileSync('firestore.rules', 'utf8')).toContain('onlyResultChanged')
  })
})
