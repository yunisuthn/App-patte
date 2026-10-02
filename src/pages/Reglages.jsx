import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exporterSauvegarde, importerSauvegarde } from '../db'
import { aujourdhui } from '../format'
import { definirMotDePasse, LONGUEUR_MIN, verifierMotDePasse } from '../securite'
import { Bouton, Carte, classeInput } from '../components/ui'

export default function Reglages() {
  const produits = useLiveQuery(() => db.produits.toArray(), [])
  const [nom, setNom] = useState('')
  const [prix, setPrix] = useState('')
  const [message, setMessage] = useState('')

  if (!produits) return null

  async function ajouterProduit() {
    await db.produits.add({ nom: nom.trim(), prix: Number(prix), actif: true })
    setNom('')
    setPrix('')
  }

  async function telecharger() {
    const donnees = await exporterSauvegarde()
    const lien = document.createElement('a')
    lien.href = URL.createObjectURL(new Blob([JSON.stringify(donnees)], { type: 'application/json' }))
    lien.download = `patte-sauvegarde-${aujourdhui()}.json`
    lien.click()
    URL.revokeObjectURL(lien.href)
    setMessage('Sauvegarde téléchargée.')
  }

  async function restaurer(e) {
    const fichier = e.target.files[0]
    e.target.value = ''
    if (!fichier || !confirm('Remplacer toutes les données actuelles par cette sauvegarde ?')) return
    try {
      await importerSauvegarde(JSON.parse(await fichier.text()))
      setMessage('Sauvegarde restaurée.')
    } catch (err) {
      setMessage(`Erreur : ${err.message}`)
    }
  }

  return (
    <div className="space-y-4">
      {message && <p className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-700 ring-1 ring-orange-200">{message}</p>}
      <Carte>
        <h2 className="mb-1 font-semibold">Produits et prix</h2>
        <p className="mb-3 text-sm text-gray-500">Un nouveau prix s’applique seulement aux ventes suivantes.</p>
        <ul className="mb-4 space-y-2">
          {produits.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <span className={`flex-1 font-medium ${p.actif ? '' : 'text-gray-400 line-through'}`}>{p.nom}</span>
              <input
                type="number"
                inputMode="numeric"
                className={`${classeInput} w-28 text-right`}
                defaultValue={p.prix}
                onBlur={(e) => Number(e.target.value) > 0 && db.produits.update(p.id, { prix: Number(e.target.value) })}
              />
              <span className="text-sm text-gray-500">Ar</span>
              <button
                type="button"
                className="w-16 text-sm text-gray-500 underline"
                onClick={() => db.produits.update(p.id, { actif: !p.actif })}
              >
                {p.actif ? 'Masquer' : 'Afficher'}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input className={classeInput} placeholder="Nouveau produit" value={nom} onChange={(e) => setNom(e.target.value)} />
          <input
            type="number"
            inputMode="numeric"
            className={`${classeInput} w-28`}
            placeholder="Prix"
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
          />
          <Bouton className="shrink-0" disabled={!nom.trim() || !(Number(prix) > 0)} onClick={ajouterProduit}>
            +
          </Bouton>
        </div>
      </Carte>

      <ChangerMotDePasse />

      <Carte>
        <h2 className="mb-1 font-semibold">Sauvegarde</h2>
        <p className="mb-3 text-sm text-gray-500">
          Les données sont gardées uniquement sur ce téléphone. Télécharge une sauvegarde de temps en temps (par exemple chaque
          vendredi) et garde le fichier ailleurs.
        </p>
        <div className="flex flex-col gap-2">
          <Bouton onClick={telecharger}>Télécharger une sauvegarde</Bouton>
          <label className="rounded-xl bg-orange-50 px-4 py-2.5 text-center font-medium text-orange-800 ring-1 ring-orange-200">
            Restaurer une sauvegarde
            <input type="file" accept="application/json,.json" className="hidden" onChange={restaurer} />
          </label>
        </div>
      </Carte>
    </div>
  )
}

function ChangerMotDePasse() {
  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [enCours, setEnCours] = useState(false)

  async function changer() {
    setEnCours(true)
    setMessage('')
    if (await verifierMotDePasse(ancien)) {
      await definirMotDePasse(nouveau)
      setAncien('')
      setNouveau('')
      setConfirmation('')
      setMessage('Mot de passe changé.')
    } else {
      setMessage('Mot de passe actuel incorrect.')
    }
    setEnCours(false)
  }

  return (
    <Carte>
      <h2 className="mb-1 font-semibold">Mot de passe</h2>
      <p className="mb-3 text-sm text-gray-500">Demandé une fois par jour à l’ouverture de l’application.</p>
      <input type="password" autoComplete="current-password" className={`${classeInput} mb-2`} placeholder="Mot de passe actuel" value={ancien} onChange={(e) => setAncien(e.target.value)} />
      <input type="password" autoComplete="new-password" className={`${classeInput} mb-2`} placeholder={`Nouveau (${LONGUEUR_MIN} caractères min.)`} value={nouveau} onChange={(e) => setNouveau(e.target.value)} />
      <input type="password" autoComplete="new-password" className={`${classeInput} mb-3`} placeholder="Retape le nouveau" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
      <Bouton className="w-full" disabled={!ancien || nouveau.length < LONGUEUR_MIN || nouveau !== confirmation || enCours} onClick={changer}>
        {enCours ? '…' : 'Changer le mot de passe'}
      </Bouton>
      {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
    </Carte>
  )
}
