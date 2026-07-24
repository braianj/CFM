import { beforeEach, describe, expect, it, vi } from 'vitest'

const getDoc = vi.fn()

vi.mock('../firebase', () => ({ db: {}, OWNER_EMAIL: 'owner@example.com' }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: (_db: unknown, _path: string, id: string) => ({ id }),
  getDoc,
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  setDoc: vi.fn(),
  writeBatch: vi.fn(),
}))

const { getAdminRole } = await import('./firestore')

describe('getAdminRole', () => {
  beforeEach(() => {
    getDoc.mockReset()
    getDoc.mockResolvedValue({ exists: () => false })
  })

  describe('when nobody is signed in', () => {
    it.each([null, undefined, ''])('should deny access for %s', async (email) => {
      expect(await getAdminRole(email)).toBeNull()
      expect(getDoc).not.toHaveBeenCalled()
    })
  })

  describe('when the owner signs in', () => {
    it('should grant access without reading the collection', async () => {
      expect(await getAdminRole('owner@example.com')).toBe('owner')
      expect(getDoc).not.toHaveBeenCalled()
    })

    it('should ignore capitals and spaces in the address', async () => {
      expect(await getAdminRole('  Owner@Example.com ')).toBe('owner')
    })
  })

  describe('when somebody else signs in', () => {
    it('should grant access when they are on the list', async () => {
      getDoc.mockResolvedValue({ exists: () => true, data: () => ({ role: 'editor' }) })

      expect(await getAdminRole('jane.doe@example.com')).toBe('editor')
    })

    it('should recognise a promoted owner', async () => {
      getDoc.mockResolvedValue({ exists: () => true, data: () => ({ role: 'owner' }) })

      expect(await getAdminRole('jane.doe@example.com')).toBe('owner')
    })

    it('should default a listed person without a role to editor', async () => {
      getDoc.mockResolvedValue({ exists: () => true, data: () => ({}) })

      expect(await getAdminRole('jane.doe@example.com')).toBe('editor')
    })

    it('should deny access when they are not', async () => {
      expect(await getAdminRole('jane.doe@example.com')).toBeNull()
    })

    it('should look the address up in lower case', async () => {
      await getAdminRole('Jane.Doe@Example.com')

      expect(getDoc).toHaveBeenCalledWith({ id: 'jane.doe@example.com' })
    })
  })
})
