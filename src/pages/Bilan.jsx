import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, montantVente } from '../db'
import {
  ajouterJours,
  ajouterMois,
  ar,
  aujourdhui,
  dateCourte,
  debutMois,
  debutSemaine,
  finMois,
  nomMois,
} from '../format'
import { Carte, Choix } from '../components/ui'

function periode(mode, ref) {
  if (mode === 'semaine') {
    const debut = debutSemaine(ref)
    const fin = ajouterJours(debut, 6)
    return { debut, fin, titre: `${dateCourte(debut)} → ${dateCourte(fin)}` }
  }
  return { debut: debutMois(ref), fin: finMois(ref), titre: nomMois(ref) }
}

export default function Bilan() {
  const [mode, setMode] = useState('mois')
  const [ref, setRef] = useState(aujourdhui())
  const { debut, fin, titre } = periode(mode, ref)
  const entre = (t) => db.table(t).where('date').between(debut, fin, true, true).toArray()
  const produits = useLiveQuery(() => db.produits.toArray(), [])
  const ventes = useLiveQuery(() => entre('ventes'), [debut, fin])
  const conso = useLiveQuery(() => entre('conso'), [debut, fin])
  const jours = useLiveQuery(() => entre('jours'), [debut, fin])

  if (!produits || !ventes || !conso || !jours) return null

  const decaler = (n) => setRef(mode === 'semaine' ? ajouterJours(ref, 7 * n) : ajouterMois(ref, n))
  const qte = (lignes, pid) => lignes.filter((l) => l.produitId === pid).reduce((s, l) => s + l.qte, 0)
  const vus = produits.filter((p) => p.actif || ventes.some((v) => v.produitId === p.id))
  const total = ventes.reduce((s, v) => s + montantVente(v), 0)
  const credit = ventes.filter((v) => v.clientId).reduce((s, v) => s + montantVente(v), 0)
  const valeurConso = conso.reduce((s, c) => s + montantVente(c), 0)

  // Une ligne par jour qui a de l'activité, comme le tableau de droite du fichier Excel.
  const dates = [...new Set([...ventes, ...conso, ...jours].map((l) => l.date))].sort().reverse()
  const noteDu = Object.fromEntries(jours.map((j) => [j.date, j.note]))
  const joursVente = new Set(ventes.map((v) => v.date)).size

  return (
    <div className="space-y-4">
      <Choix
        options={[
          { valeur: 'semaine', label: 'Semaine' },
          { valeur: 'mois', label: 'Mois' },
        ]}
        valeur={mode}
        onChange={setMode}
      />
      <div className="flex items-center justify-between">
        <button type="button" className="h-10 w-10 rounded-full bg-white text-xl shadow-sm" onClick={() => decaler(-1)} aria-label="Précédent">
          ‹
        </button>
        <span className="font-semibold capitalize">{titre}</span>
        <button type="button" className="h-10 w-10 rounded-full bg-white text-xl shadow-sm" onClick={() => decaler(1)} aria-label="Suivant">
          ›
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {vus.map((p) => (
          <Carte key={p.id}>
            <div className="text-sm text-gray-500">{p.nom} vendus</div>
            <div className="text-2xl font-semibold tabular-nums">{qte(ventes, p.id)}</div>
          </Carte>
        ))}
        <Carte className="col-span-2">
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt>Chiffre d’affaires</dt>
              <dd className="font-semibold tabular-nums">{ar(total)}</dd>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <dt>Dont vendu à crédit</dt>
              <dd className="tabular-nums">{ar(credit)}</dd>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <dt>Ma conso (Ahy)</dt>
              <dd className="tabular-nums">
                {vus.map((p) => `${qte(conso, p.id)} ${p.nom.toLowerCase()}`).join(', ')} · {ar(valeurConso)}
              </dd>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <dt>Jours de vente</dt>
              <dd className="tabular-nums">{joursVente}</dd>
            </div>
          </dl>
        </Carte>
      </div>

      <Carte sansMarge className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-orange-600 text-white">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Date</th>
              {vus.map((p) => (
                <th key={p.id} className="px-2 py-2 text-right font-medium">
                  {p.nom}
                </th>
              ))}
              <th className="px-3 py-2 text-left font-medium">Ahy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {dates.map((d) => {
              const duJour = ventes.filter((v) => v.date === d)
              const consoJour = conso.filter((c) => c.date === d)
              const ahy = vus
                .map((p) => [qte(consoJour, p.id), p.nom.toLowerCase()])
                .filter(([n]) => n > 0)
                .map(([n, nom]) => `${n} ${nom}`)
              if (noteDu[d]) ahy.push(noteDu[d])
              return (
                <tr key={d}>
                  <td className="px-3 py-2 whitespace-nowrap capitalize">{dateCourte(d)}</td>
                  {vus.map((p) => (
                    <td key={p.id} className="px-2 py-2 text-right tabular-nums">
                      {qte(duJour, p.id) || ''}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-gray-600">{ahy.join(', ')}</td>
                </tr>
              )
            })}
            {dates.length === 0 && (
              <tr>
                <td colSpan={vus.length + 2} className="px-3 py-3 text-gray-400">
                  Aucune activité sur cette période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Carte>
    </div>
  )
}
