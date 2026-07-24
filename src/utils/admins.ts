// An administrator's document ID is their email in lower case. Firestore rules
// compare it against `request.auth.token.email.lower()`, so both sides must agree.
export const adminDocId = (email: string) => email.trim().toLowerCase()

export const isValidAdminEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())

export const sortAdminEmails = (emails: string[]) => [...emails].sort((a, b) => a.localeCompare(b, 'es'))
