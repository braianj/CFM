import { describe, expect, it } from 'vitest'
import { adminDocId, isValidAdminEmail, sortAdminEmails } from './admins'

describe('adminDocId', () => {
  describe('when the address is typed with spaces or capitals', () => {
    it('should always resolve to the same document', () => {
      expect(adminDocId('  Jane.Doe@Example.com ')).toBe('jane.doe@example.com')
    })

    it('should match what the Firestore rules compare against', () => {
      // firestore.rules uses request.auth.token.email.lower()
      expect(adminDocId('JANE.DOE@EXAMPLE.COM')).toBe('jane.doe@example.com'.toLowerCase())
    })
  })
})

describe('isValidAdminEmail', () => {
  describe('when the address looks like an email', () => {
    it.each(['jane.doe@example.com', ' john@example.com.ar '])('should accept %s', (email) => {
      expect(isValidAdminEmail(email)).toBe(true)
    })
  })

  describe('when the address is incomplete', () => {
    it.each(['', 'jane', 'jane@', '@example.com', 'jane@example', 'jane doe@example.com'])(
      'should reject %s',
      (email) => {
        expect(isValidAdminEmail(email)).toBe(false)
      },
    )
  })
})

describe('sortAdminEmails', () => {
  it('should list the addresses alphabetically without mutating the input', () => {
    const input = ['zoe@example.com', 'ana@example.com']

    expect(sortAdminEmails(input)).toEqual(['ana@example.com', 'zoe@example.com'])
    expect(input).toEqual(['zoe@example.com', 'ana@example.com'])
  })
})
