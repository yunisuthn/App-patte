import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, rejouerClient, texteQuantites, TYPES_MOUVEMENT } from '../db'
import { ar, aujourdhui, dateCourte } from '../format'
import { Bouton, Carte, Solde } from '../components/ui'
import FormVenteCredit from '../components/FormVenteCredit'
import FormMouvement from '../components/FormMouvement'

export default function ClientDetail({ clientId, onRetour }) {
  const [form, setForm] = useState(null) // 'credit' ou un type de mouvement
  const client = useLiveQuery(() => db.clients.get(clientId), [clientId])
  const produits = useLiveQuery(() => db.produits.toArray(), [])
  const ventes = useLiveQuery(() => db.ventes.where('clientId').equals(clientId).toArray(), [clientId])
  const mouvements = useLiveQuery(() => db.mouvements.where('clientId').equals(clientId).toArray(), [clientId])

  if (!client || !produits || !ventes || !mouvements) return null

  const nomProduit = Object.fromEntries(produits.map((p) => [p.id, p.nom]))
  // Historique du plus récent au plus ancien, avec le total cumulé après chaque ligne.
  const compte = rejouerClient(ventes, mouvements)
  const solde = compte.solde
  const historique = compte.lignes
    .map(({ vente: v, mouvement: m, ...l }) => ({
      ...l,
      ...(v
        ? {
            cle: `v${v.id}`,
            texte: `${nomProduit[v.produitId] ?? '?'} ${v.qte}`,
            detail: `${v.qte} × ${ar(v.prix)}`,
            supprimer: () => db.ventes.delete(v.id),
          }
        : {
            cle: `m${m.id}`,
            texte: TYPES_MOUVEMENT[m.type].label,
            detail: m.libelle,
            supprimer: () => db.mouvements.delete(m.id),
          }),
      quantites: texteQuantites(l.qtes, produits),
    }))
    .reverse()

  async function renommer() {
    const nom = prompt('Nouveau nom', client.nom)?.trim()
    if (nom) await db.clients.update(clientId, { nom })
  }

  async function supprimer() {
    const message = historique.length
      ? `Supprimer ${client.nom} et tout son historique (${historique.length} lignes) ?`
      : `Supprimer ${client.nom} ?`
    if (!confirm(message)) return
    await db.transaction('rw', db.clients, db.ventes, db.mouvements, async () => {
      await db.ventes.where('clientId').equals(clientId).delete()
      await db.mouvements.where('clientId').equals(clientId).delete()
      await db.clients.delete(clientId)
    })
    onRetour()
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={onRetour} className="text-sm font-medium text-orange-700">
        ‹ Clients
      </button>

      <Carte>
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold">{client.nom}</h1>
          <button type="button" onClick={renommer} className="text-sm text-gray-500 underline">
            Renommer
          </button>
        </div>
        <div className="mt-1">
          <Solde montant={solde} grand />
        </div>
        {texteQuantites(compte.qtes, produits) && (
          <div className="mt-1 text-gray-600">Non payé : {texteQuantites(compte.qtes, produits)}</div>
        )}
      </Carte>

      <div className="grid grid-cols-2 gap-2">
        <Bouton onClick={() => setForm('credit')}>+ Crédit produit</Bouton>
        <Bouton onClick={() => setForm('paiement')}>Il m’a payé</Bouton>
        <Bouton variante="secondaire" onClick={() => setForm('reste')}>
          Reste à payer
        </Bouton>
        <Bouton variante="secondaire" onClick={() => setForm('monnaie')}>
          Je lui dois
        </Bouton>
        {solde < 0 && (
          <Bouton variante="secondaire" className="col-span-2" onClick={() => setForm('rendu')}>
            Je lui ai rendu la monnaie
          </Bouton>
        )}
      </div>

      <Carte sansMarge>
        <h2 className="px-4 pt-4 pb-2 font-semibold">Historique</h2>
        {historique.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-gray-400">Rien pour le moment.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {historique.map((l) => (
              <li key={l.cle} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-20 shrink-0 text-xs text-gray-500 capitalize">{dateCourte(l.date)}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium break-words">{l.texte}</div>
                  {l.detail && <div className="truncate text-xs text-gray-500">{l.detail}</div>}
                </div>
                <div className="text-right tabular-nums">
                  <div className={l.montant > 0 ? 'text-orange-700' : 'text-sky-700'}>
                    {l.montant > 0 ? '+' : '−'}
                    {ar(Math.abs(l.montant))}
                  </div>
                  <div className="text-xs text-gray-400">Total {ar(l.solde)}</div>
                  {l.quantites && <div className="text-xs text-gray-500">{l.quantites}</div>}
                </div>
                <button
                  type="button"
                  className="text-gray-300 active:text-red-600"
                  aria-label="Supprimer"
                  onClick={() => confirm('Supprimer cette ligne ?') && l.supprimer()}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </Carte>

      <Bouton variante="danger" className="w-full" onClick={supprimer}>
        Supprimer ce client
      </Bouton>

      {form === 'credit' && <FormVenteCredit date={aujourdhui()} clientId={clientId} onFermer={() => setForm(null)} />}
      {form && form !== 'credit' && (
        <FormMouvement
          clientId={clientId}
          type={form}
          montantSuggere={form === 'paiement' ? solde : form === 'rendu' ? -solde : 0}
          onFermer={() => setForm(null)}
        />
      )}
    </div>
  )
}
