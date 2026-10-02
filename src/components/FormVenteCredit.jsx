import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ajouterCredit, clientParNom } from '../db'
import { ar } from '../format'
import { Bouton, Champ, Choix, Compteur, Fenetre, classeInput } from './ui'

const NOUVEAU = 'nouveau'

// Vente à crédit (colonne « Ananako ») : le client prend des produits sans payer.
export default function FormVenteCredit({ date: dateInitiale, clientId: clientFixe, onFermer }) {
  const produits = useLiveQuery(() => db.produits.toArray(), [])
  const clients = useLiveQuery(() => db.clients.orderBy('nom').toArray(), [])
  const [date, setDate] = useState(dateInitiale)
  const [clientId, setClientId] = useState(clientFixe ?? '')
  const [nouveauNom, setNouveauNom] = useState('')
  const [produitId, setProduitId] = useState(null)
  const [qte, setQte] = useState(1)

  if (!produits || !clients) return null
  const actifs = produits.filter((p) => p.actif)
  const produit = produits.find((p) => p.id === (produitId ?? actifs[0]?.id))
  const clientOk = clientId === NOUVEAU ? nouveauNom.trim() !== '' : clientId !== ''

  async function enregistrer() {
    const id = clientId === NOUVEAU ? await clientParNom(nouveauNom) : Number(clientId)
    await ajouterCredit({ date, clientId: id, produitId: produit.id, qte })
    onFermer()
  }

  return (
    <Fenetre titre="Vente à crédit" onFermer={onFermer}>
      {!clientFixe && (
        <Champ label="Client">
          <select className={classeInput} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">— Choisir —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
            <option value={NOUVEAU}>+ Nouveau client…</option>
          </select>
          {clientId === NOUVEAU && (
            <input
              autoFocus
              className={`${classeInput} mt-2`}
              placeholder="Nom du client"
              value={nouveauNom}
              onChange={(e) => setNouveauNom(e.target.value)}
            />
          )}
        </Champ>
      )}
      <Champ label="Produit">
        <Choix
          options={actifs.map((p) => ({ valeur: p.id, label: `${p.nom} · ${ar(p.prix)}` }))}
          valeur={produit?.id}
          onChange={setProduitId}
        />
      </Champ>
      <Champ label="Quantité">
        <Compteur valeur={qte} onMoins={() => setQte((q) => Math.max(1, q - 1))} onPlus={() => setQte((q) => q + 1)} />
      </Champ>
      <Champ label="Date">
        <input type="date" className={classeInput} value={date} onChange={(e) => setDate(e.target.value)} />
      </Champ>
      <Bouton className="w-full" disabled={!clientOk || !produit || !date} onClick={enregistrer}>
        Enregistrer · {produit ? ar(qte * produit.prix) : ''}
      </Bouton>
    </Fenetre>
  )
}
