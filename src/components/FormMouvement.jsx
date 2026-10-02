import { useState } from 'react'
import { db, TYPES_MOUVEMENT } from '../db'
import { aujourdhui, ar } from '../format'
import { Bouton, Champ, Fenetre, classeInput } from './ui'

const AIDES = {
  paiement: 'Le client te donne de l’argent pour rembourser son crédit.',
  reste: 'Le client te doit un montant (ex. « 400 Ar » qu’il n’a pas fini de payer).',
  monnaie: 'Tu n’avais pas de monnaie : c’est toi qui lui dois cet argent.',
  rendu: 'Tu lui as rendu la monnaie que tu lui devais.',
}

export default function FormMouvement({ clientId, type, montantSuggere, onFermer }) {
  const [date, setDate] = useState(aujourdhui())
  const [montant, setMontant] = useState(type === 'rendu' && montantSuggere > 0 ? String(montantSuggere) : '')
  const [libelle, setLibelle] = useState('')
  const valeur = Number(montant)

  async function enregistrer() {
    await db.mouvements.add({ date, clientId, type, montant: valeur, libelle: libelle.trim(), creeLe: Date.now() })
    onFermer()
  }

  return (
    <Fenetre titre={TYPES_MOUVEMENT[type].label} onFermer={onFermer}>
      <p className="mb-4 text-sm text-gray-500">{AIDES[type]}</p>
      <Champ label="Montant (Ar)">
        <input
          autoFocus
          type="number"
          inputMode="numeric"
          min="0"
          step="100"
          className={classeInput}
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
        />
      </Champ>
      {montantSuggere > 0 && type === 'paiement' && (
        <button
          type="button"
          onClick={() => setMontant(String(montantSuggere))}
          className="-mt-2 mb-4 text-sm font-medium text-orange-700 underline"
        >
          Tout payé ({ar(montantSuggere)})
        </button>
      )}
      <Champ label="Note (facultatif)">
        <input
          className={classeInput}
          placeholder="ex. Cagoule, Fromage 2…"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
        />
      </Champ>
      <Champ label="Date">
        <input type="date" className={classeInput} value={date} onChange={(e) => setDate(e.target.value)} />
      </Champ>
      <Bouton className="w-full" disabled={!(valeur > 0) || !date} onClick={enregistrer}>
        Enregistrer
      </Bouton>
    </Fenetre>
  )
}
