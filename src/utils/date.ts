const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

export const formatDay = (dateTime: string, timezone: string) =>
  capitalize(
    new Intl.DateTimeFormat('es-AR', {
      timeZone: timezone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(dateTime)),
  )

export const formatTime = (dateTime: string, timezone: string) =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(dateTime))

// Every kick-off is stored with Ushuaia's offset, so the date and time the rink
// will see are the ones written in the string. Reading them through `Date` would
// shift them to whatever timezone the editor's computer happens to be in.
const WRITTEN_LOCALLY = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}-03:00$/

export const USHUAIA_OFFSET = '-03:00'

export function splitStartDateTime(startDateTime: string) {
  const written = WRITTEN_LOCALLY.exec(startDateTime)
  if (written) return { date: written[1], time: written[2] }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Ushuaia',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(startDateTime))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}`,
  }
}

export const buildStartDateTime = (date: string, time: string) => `${date}T${time}:00${USHUAIA_OFFSET}`

// Compact form for dense lists: "sáb 26/7". Composed by hand because es-AR renders
// a bare day and month as "26-7", which reads like a range.
export function formatShortDay(dateTime: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date(dateTime))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('weekday').replace('.', '')} ${part('day')}/${part('month')}`
}
