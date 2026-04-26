import type { Language } from './site'

export function formatDate(date: string, lang: Language): string {
  const value = new Date(`${date}T00:00:00`)

  if (lang === 'ko') {
    return `${value.getFullYear()}년 ${value.getMonth() + 1}월 ${value.getDate()}일`
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(value)
}
