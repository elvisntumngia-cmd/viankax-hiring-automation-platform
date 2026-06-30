const APPLICATIONS_KEY = 'viankax:applications'
const LAST_APPLICATION_KEY = 'viankax:lastApplication'

function readJson(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

export function getStoredApplications() {
  return readJson(APPLICATIONS_KEY, [])
}

export function getLastApplication() {
  return readJson(LAST_APPLICATION_KEY, null)
}

export function saveSubmittedApplication(application) {
  const currentApplications = getStoredApplications()
  const nextApplications = [
    application,
    ...currentApplications.filter((item) => item.id !== application.id),
  ]

  window.localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(nextApplications))
  window.localStorage.setItem(LAST_APPLICATION_KEY, JSON.stringify(application))
}

export function saveLastApplication(application) {
  window.localStorage.setItem(LAST_APPLICATION_KEY, JSON.stringify(application))
}

export function formatAppliedAt(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
