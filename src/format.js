const nombre = new Intl.NumberFormat('fr-FR')

export const ar = (n) => `${nombre.format(Math.round(n))} Ar`

// Les dates sont stockées en texte « AAAA-MM-JJ » (heure locale).
export function versIso(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${j}`
}

export function depuisIso(s) {
  const [a, m, j] = s.split('-').map(Number)
  return new Date(a, m - 1, j)
}

export const aujourdhui = () => versIso(new Date())

export function ajouterJours(s, n) {
  const d = depuisIso(s)
  d.setDate(d.getDate() + n)
  return versIso(d)
}

export function ajouterMois(s, n) {
  const d = depuisIso(s)
  return versIso(new Date(d.getFullYear(), d.getMonth() + n, 1))
}

export function debutSemaine(s) {
  const d = depuisIso(s)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return versIso(d)
}

export const debutMois = (s) => `${s.slice(0, 8)}01`

export function finMois(s) {
  const d = depuisIso(s)
  return versIso(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

export const dateLongue = (s) =>
  depuisIso(s).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export const dateCourte = (s) =>
  depuisIso(s).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })

export const nomMois = (s) => depuisIso(s).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
