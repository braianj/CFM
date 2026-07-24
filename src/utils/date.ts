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
