import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, enregistrerJour, montantVente, NOTES_JOUR } from '../db'
import { ajouterJours, ar, aujourdhui, dateLongue } from '../format'
import { Bouton, Carte, Compteur } from '../components/ui'
import FormVenteCredit from '../components/FormVenteCredit'

const somme = (lignes, produitId) => lignes.filter((l) => l.produitId === produitId).reduce((s, l) => s + l.qte, 0)
const VIDE = { ventes: {}, conso: {}, credits: {} }
export const MESSAGE_NON_ENREGISTRE = 'Les modifications non enregistrées seront perdues. Continuer ?'

export default function Jour({ onOuvrirClient, onModifie }) {
  const [date, setDateBrute] = useState(aujourdhui())
  const [formCredit, setFormCredit] = useState(false)
  // Changements faits avec les boutons − / +, pas encore enregistrés.
  const [brouillon, setBrouillon] = useState(VIDE)
  const [enCours, setEnCours] = useState(false)
  const nbModifs = Object.values(brouillon).flatMap(Object.values).filter(Boolean).length

  useEffect(() => {
    onModifie(nbModifs > 0)
    if (!nbModifs) return
    const avertir = (e) => e.preventDefault()
    window.addEventListener('beforeunload', avertir)
    return () => window.removeEventListener('beforeunload', avertir)
  }, [nbModifs, onModifie])

  const produits = useLiveQuery(() => db.produits.toArray(), [])
  const clients = useLiveQuery(() => db.clients.toArray(), [])
  const ventes = useLiveQuery(() => db.ventes.where('date').equals(date).toArray(), [date])
  const conso = useLiveQuery(() => db.conso.where('date').equals(date).toArray(), [date])
  const jour = useLiveQuery(() => db.jours.get(date), [date])

  if (!produits || !clients || !ventes || !conso) return null

  const nomClient = Object.fromEntries(clients.map((c) => [c.id, c.nom]))
  const prixDe = (produitId) => produits.find((p) => p.id === Number(produitId))?.prix ?? 0
  // Ce qui est affiché = ce qui est enregistré + le brouillon.
  const ventesAffichees = [
    ...ventes.map((v) => (v.clientId ? { ...v, qte: v.qte + (brouillon.credits[v.id] ?? 0) } : v)),
    ...Object.entries(brouillon.ventes).map(([pid, qte]) => ({ produitId: Number(pid), qte, prix: prixDe(pid), clientId: null })),
  ]
  const consoAffichee = [
    ...conso,
    ...Object.entries(brouillon.conso).map(([pid, qte]) => ({ produitId: Number(pid), qte })),
  ]
  const comptant = ventesAffichees.filter((v) => !v.clientId)
  const aCredit = ventesAffichees.filter((v) => v.clientId)
  // On affiche aussi un produit désactivé s'il a des ventes ce jour-là.
  const visibles = produits.filter((p) => p.actif || ventes.some((v) => v.produitId === p.id))
  const total = ventesAffichees.reduce((s, v) => s + montantVente(v), 0)
  const totalCredit = aCredit.reduce((s, v) => s + montantVente(v), 0)

  const changer = (groupe, cle, delta) =>
    setBrouillon((b) => ({ ...b, [groupe]: { ...b[groupe], [cle]: (b[groupe][cle] ?? 0) + delta } }))
  const modifie = (groupe, cle) => !!brouillon[groupe][cle]

  function setDate(nouvelle) {
    if (nbModifs && !confirm(MESSAGE_NON_ENREGISTRE)) return
    setBrouillon(VIDE)
    setDateBrute(nouvelle)
  }

  async function enregistrer() {
    setEnCours(true)
    try {
      await enregistrerJour(date, brouillon)
      setBrouillon(VIDE)
    } catch (err) {
      alert(`Erreur, rien n’a été enregistré : ${err.message}`)
    } finally {
      setEnCours(false)
    }
  }

  async function changerNote(note) {
    if (jour?.note === note) await db.jours.delete(date)
    else await db.jours.put({ date, note })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="h-10 w-10 rounded-full bg-white text-xl shadow-sm" onClick={() => setDate(ajouterJours(date, -1))} aria-label="Jour précédent">
          ‹
        </button>
        <label className="relative flex-1 text-center">
          <span className="block font-semibold capitalize">{dateLongue(date)}</span>
          {date !== aujourdhui() && <span className="text-xs text-orange-700">Toucher pour changer</span>}
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="absolute inset-0 opacity-0" />
        </label>
        <button type="button" className="h-10 w-10 rounded-full bg-white text-xl shadow-sm" onClick={() => setDate(ajouterJours(date, 1))} aria-label="Jour suivant">
          ›
        </button>
      </div>
      {date !== aujourdhui() && (
        <button type="button" className="w-full text-sm font-medium text-orange-700" onClick={() => setDate(aujourdhui())}>
          Revenir à aujourd’hui
        </button>
      )}

      <div className="flex gap-2">
        {NOTES_JOUR.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => changerNote(n)}
            className={`rounded-full px-4 py-1.5 text-sm ring-1 ${jour?.note === n ? 'bg-gray-800 text-white ring-gray-800' : 'bg-white text-gray-600 ring-gray-300'}`}
          >
            {n}
          </button>
        ))}
      </div>

      <Carte>
        <h2 className="mb-3 font-semibold">Vendu payé comptant</h2>
        <div className="space-y-3">
          {visibles.map((p) => (
            <div key={p.id} className="flex items-center justify-between">
              <div>
                <div className="font-medium">{p.nom}</div>
                <div className="text-sm text-gray-500">{ar(p.prix)}</div>
              </div>
              <Compteur
                taille="grand"
                valeur={somme(comptant, p.id)}
                modifie={modifie('ventes', p.id)}
                onMoins={() => changer('ventes', p.id, -1)}
                onPlus={() => changer('ventes', p.id, 1)}
              />
            </div>
          ))}
        </div>
      </Carte>

      <Carte>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Crédits du jour</h2>
          <Bouton className="py-1.5 text-sm" onClick={() => setFormCredit(true)}>
            + Crédit
          </Bouton>
        </div>
        {aCredit.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun crédit ce jour.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {aCredit.map((v) => (
              <li key={v.id} className={`flex items-center gap-3 py-2 ${v.qte === 0 ? 'opacity-50' : ''}`}>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => (!nbModifs || confirm(MESSAGE_NON_ENREGISTRE)) && onOuvrirClient(v.clientId)}>
                  <span className="block font-medium text-orange-800">{nomClient[v.clientId] ?? '?'}</span>
                  <span className="block text-sm text-gray-600">
                    {produits.find((p) => p.id === v.produitId)?.nom} ·{' '}
                    {v.qte === 0 ? <span className="text-red-600">sera supprimé</span> : ar(montantVente(v))}
                  </span>
                </button>
                <Compteur
                  valeur={v.qte}
                  modifie={modifie('credits', v.id)}
                  onMoins={() => changer('credits', v.id, -1)}
                  onPlus={() => changer('credits', v.id, 1)}
                />
              </li>
            ))}
          </ul>
        )}
      </Carte>

      <Carte>
        <h2 className="mb-3 font-semibold">Ma conso (Ahy)</h2>
        <div className="space-y-3">
          {visibles.map((p) => (
            <div key={p.id} className="flex items-center justify-between">
              <span className="font-medium">{p.nom}</span>
              <Compteur
                valeur={somme(consoAffichee, p.id)}
                modifie={modifie('conso', p.id)}
                onMoins={() => changer('conso', p.id, -1)}
                onPlus={() => changer('conso', p.id, 1)}
              />
            </div>
          ))}
        </div>
      </Carte>

      <Carte className="bg-orange-50">
        <h2 className="mb-2 font-semibold">Total du jour</h2>
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {visibles.map((p) => (
            <span key={p.id}>
              {p.nom} : <strong className="tabular-nums">{somme(ventesAffichees, p.id)}</strong>
            </span>
          ))}
        </div>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Chiffre du jour</dt>
            <dd className="font-semibold tabular-nums">{ar(total)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>Dont à crédit</dt>
            <dd className="tabular-nums">{ar(totalCredit)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Argent reçu (comptant)</dt>
            <dd className="font-semibold tabular-nums">{ar(total - totalCredit)}</dd>
          </div>
        </dl>
      </Carte>

      {nbModifs > 0 && (
        <>
          <div className="h-20" />
          <div className="fixed inset-x-0 bottom-[60px] z-30 mx-auto max-w-md px-3 pb-2">
            <div className="flex items-center gap-2 rounded-2xl bg-gray-900 p-2 pl-4 text-white shadow-lg">
              <span className="flex-1 text-sm">
                {nbModifs} modification{nbModifs > 1 ? 's' : ''} non enregistrée{nbModifs > 1 ? 's' : ''}
              </span>
              <button type="button" className="rounded-xl px-3 py-2 text-sm text-gray-300" disabled={enCours} onClick={() => setBrouillon(VIDE)}>
                Annuler
              </button>
              <Bouton className="py-2" disabled={enCours} onClick={enregistrer}>
                {enCours ? '…' : 'Enregistrer'}
              </Bouton>
            </div>
          </div>
        </>
      )}

      {formCredit && <FormVenteCredit date={date} onFermer={() => setFormCredit(false)} />}
    </div>
  )
}
