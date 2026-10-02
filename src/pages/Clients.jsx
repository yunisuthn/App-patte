import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, clientParNom, comptesParClient, texteQuantites } from '../db'
import { ar } from '../format'
import { Bouton, Carte, Solde, classeInput } from '../components/ui'

export default function Clients({ onOuvrirClient }) {
  const [recherche, setRecherche] = useState('')
  const clients = useLiveQuery(() => db.clients.orderBy('nom').toArray(), [])
  const ventes = useLiveQuery(() => db.ventes.filter((v) => !!v.clientId).toArray(), [])
  const mouvements = useLiveQuery(() => db.mouvements.toArray(), [])
  const produits = useLiveQuery(() => db.produits.toArray(), [])

  if (!clients || !ventes || !mouvements || !produits) return null

  const comptes = comptesParClient(ventes, mouvements)
  const soldes = Object.fromEntries(Object.entries(comptes).map(([id, c]) => [id, c.solde]))
  const solde = (c) => soldes[c.id] ?? 0
  const onMeDoit = Object.values(soldes).filter((s) => s > 0).reduce((a, b) => a + b, 0)
  const jeDois = Object.values(soldes).filter((s) => s < 0).reduce((a, b) => a - b, 0)
  const filtre = recherche.trim().toLowerCase()
  // Ceux qui ont une dette (dans un sens ou l'autre) en premier.
  const liste = clients
    .filter((c) => c.nom.toLowerCase().includes(filtre))
    .sort((a, b) => Math.abs(solde(b)) - Math.abs(solde(a)) || a.nom.localeCompare(b.nom))

  async function ajouter() {
    const id = await clientParNom(recherche)
    setRecherche('')
    onOuvrirClient(id)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Carte>
          <div className="text-sm text-gray-500">On me doit</div>
          <div className="text-xl font-semibold text-orange-700 tabular-nums">{ar(onMeDoit)}</div>
        </Carte>
        <Carte>
          <div className="text-sm text-gray-500">Je dois</div>
          <div className="text-xl font-semibold text-sky-700 tabular-nums">{ar(jeDois)}</div>
        </Carte>
      </div>

      <div className="flex gap-2">
        <input
          className={classeInput}
          placeholder="Chercher ou ajouter un client"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        {filtre && !clients.some((c) => c.nom.toLowerCase() === filtre) && (
          <Bouton className="shrink-0" onClick={ajouter}>
            Ajouter
          </Bouton>
        )}
      </div>

      <Carte sansMarge>
        <ul className="divide-y divide-gray-100">
          {liste.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-orange-50"
                onClick={() => onOuvrirClient(c.id)}
              >
                <span>
                  <span className="block font-medium">{c.nom}</span>
                  {comptes[c.id] && texteQuantites(comptes[c.id].qtes, produits) && (
                    <span className="block text-xs text-gray-500">{texteQuantites(comptes[c.id].qtes, produits)}</span>
                  )}
                </span>
                <Solde montant={solde(c)} />
              </button>
            </li>
          ))}
          {liste.length === 0 && <li className="px-4 py-3 text-sm text-gray-400">Aucun client trouvé.</li>}
        </ul>
      </Carte>
    </div>
  )
}
