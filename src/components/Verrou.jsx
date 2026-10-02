import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { aujourdhui, dateLongue } from '../format'
import { definirMotDePasse, deverrouiller, LONGUEUR_MIN, toutEffacer } from '../securite'
import { Bouton, Champ, classeInput } from './ui'

// Affiche l'application seulement si elle a été déverrouillée aujourd'hui.
export default function Verrou({ children }) {
  const securite = useLiveQuery(() => db.securite.toArray(), [])
  const [jour, setJour] = useState(aujourdhui())
  const [dejaOuvert, setDejaOuvert] = useState(false)

  // Reverrouille après minuit, même si l'application est restée ouverte.
  useEffect(() => {
    const maj = () => setJour(aujourdhui())
    const minuterie = setInterval(maj, 60_000)
    document.addEventListener('visibilitychange', maj)
    return () => {
      clearInterval(minuterie)
      document.removeEventListener('visibilitychange', maj)
    }
  }, [])

  const ouvert = securite?.find((s) => s.cle === 'session')?.jour === jour
  useEffect(() => {
    if (ouvert) setDejaOuvert(true)
  }, [ouvert])

  if (!securite) return null
  const aUnMotDePasse = securite.some((s) => s.cle === 'motDePasse')

  return (
    <>
      {!ouvert && (aUnMotDePasse ? <EcranSaisie /> : <EcranCreation />)}
      {/* L'application reste montée pendant le verrouillage pour ne pas perdre un brouillon. */}
      {dejaOuvert && <div className={ouvert ? '' : 'hidden'}>{children}</div>}
    </>
  )
}

function Cadre({ titre, children }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-orange-50 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
        <img src="/icon.svg" alt="" className="mx-auto mb-3 h-14 w-14" />
        <h1 className="mb-1 text-center text-xl font-bold">Patte & Fromage</h1>
        <p className="mb-5 text-center text-sm text-gray-500 first-letter:uppercase">{dateLongue(aujourdhui())}</p>
        <h2 className="mb-4 font-semibold">{titre}</h2>
        {children}
      </div>
    </div>
  )
}

function EcranCreation() {
  const [mdp, setMdp] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [enCours, setEnCours] = useState(false)
  const tropCourt = mdp.length < LONGUEUR_MIN
  const different = confirmation !== '' && confirmation !== mdp

  async function valider(e) {
    e.preventDefault()
    setEnCours(true)
    await definirMotDePasse(mdp)
  }

  return (
    <Cadre titre="Crée ton mot de passe">
      <form onSubmit={valider}>
        <p className="mb-4 text-sm text-gray-500">
          Il sera demandé une fois par jour. Note-le bien : il n’y a aucun moyen de le récupérer.
        </p>
        <Champ label={`Mot de passe (${LONGUEUR_MIN} caractères minimum)`}>
          <input type="password" autoFocus autoComplete="new-password" className={classeInput} value={mdp} onChange={(e) => setMdp(e.target.value)} />
        </Champ>
        <Champ label="Retape le mot de passe">
          <input type="password" autoComplete="new-password" className={classeInput} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          {different && <span className="mt-1 block text-sm text-red-600">Les deux mots de passe sont différents.</span>}
        </Champ>
        <Bouton type="submit" className="w-full" disabled={tropCourt || confirmation !== mdp || enCours}>
          {enCours ? '…' : 'Créer le mot de passe'}
        </Bouton>
      </form>
    </Cadre>
  )
}

function EcranSaisie() {
  const [mdp, setMdp] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [oubli, setOubli] = useState(false)

  async function valider(e) {
    e.preventDefault()
    setEnCours(true)
    setErreur('')
    const ok = await deverrouiller(mdp)
    if (!ok) {
      // Petite attente pour ralentir les essais au hasard.
      await new Promise((r) => setTimeout(r, 1000))
      setErreur('Mot de passe incorrect.')
      setMdp('')
      setEnCours(false)
    }
  }

  if (oubli) return <EcranOubli onRetour={() => setOubli(false)} />

  return (
    <Cadre titre="Entre ton mot de passe">
      <form onSubmit={valider}>
        <Champ label="Mot de passe">
          <input type="password" autoFocus autoComplete="current-password" className={classeInput} value={mdp} onChange={(e) => setMdp(e.target.value)} />
          {erreur && <span className="mt-1 block text-sm text-red-600">{erreur}</span>}
        </Champ>
        <Bouton type="submit" className="w-full" disabled={!mdp || enCours}>
          {enCours ? '…' : 'Ouvrir'}
        </Bouton>
      </form>
      <button type="button" onClick={() => setOubli(true)} className="mt-4 w-full text-sm text-gray-500 underline">
        Mot de passe oublié ?
      </button>
    </Cadre>
  )
}

function EcranOubli({ onRetour }) {
  const [texte, setTexte] = useState('')
  return (
    <Cadre titre="Mot de passe oublié">
      <p className="mb-4 text-sm text-gray-600">
        Le mot de passe ne peut pas être récupéré. La seule solution est d’<strong>effacer toutes les données</strong> de ce
        téléphone, puis de créer un nouveau mot de passe et de restaurer ta dernière sauvegarde (Réglages → Restaurer).
      </p>
      <Champ label="Écris EFFACER pour confirmer">
        <input className={classeInput} value={texte} onChange={(e) => setTexte(e.target.value)} />
      </Champ>
      <Bouton variante="danger" className="mb-2 w-full" disabled={texte.trim().toUpperCase() !== 'EFFACER'} onClick={toutEffacer}>
        Tout effacer
      </Bouton>
      <Bouton variante="secondaire" className="w-full" onClick={onRetour}>
        Retour
      </Bouton>
    </Cadre>
  )
}
