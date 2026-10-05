import Dexie from 'dexie'

// Toutes les données restent dans le navigateur du téléphone (IndexedDB).
export const db = new Dexie('app-patte')

db.version(1).stores({
  // { nom, prix, actif }
  produits: '++id, nom',
  // { nom }
  clients: '++id, nom',
  // Ventes du jour. clientId vide = vente payée comptant ; clientId rempli = vente à crédit.
  // { date, produitId, qte, prix, clientId, creeLe }
  ventes: '++id, date, produitId, clientId',
  // Ma propre consommation (colonne « Ahy ») : { date, produitId, qte, prix }
  conso: '++id, date, produitId',
  // Mouvements d'argent avec un client : { date, clientId, type, montant, libelle, creeLe }
  mouvements: '++id, date, clientId, type',
  // Note du jour (congé, absent) : { date, note }
  jours: 'date',
})

// Mot de passe et session du jour. Jamais inclus dans les sauvegardes.
db.version(2).stores({ securite: 'cle' })

db.on('populate', (tx) => {
  tx.table('produits').bulkAdd([
    { nom: 'Patte', prix: 1200, actif: true },
    { nom: 'Fromage', prix: 800, actif: true },
  ])
  tx.table('clients').bulkAdd(['Valério', 'Nash', 'Manda', 'Nomeny', 'Hery'].map((nom) => ({ nom })))
})

// signe > 0 : le client me doit plus ; signe < 0 : le client me doit moins (ou je lui dois).
export const TYPES_MOUVEMENT = {
  paiement: { label: 'Il m’a payé', signe: -1 },
  reste: { label: 'Reste à payer', signe: 1 },
  monnaie: { label: 'Je lui dois (monnaie)', signe: -1 },
  rendu: { label: 'Je lui ai rendu', signe: 1 },
}

export const NOTES_JOUR = ['Congé', 'Absent']

export const montantVente = (v) => v.qte * v.prix
export const montantMouvement = (m) => TYPES_MOUVEMENT[m.type].signe * m.montant

// Rejoue l'historique d'un client dans l'ordre. Après chaque ligne :
// - solde : > 0 le client me doit, < 0 je lui dois ;
// - qtes : produits pas encore payés, par produitId (comme « Total : 12 + fromage 1 » dans l'Excel).
//   L'argent reçu ne règle que des articles entiers ; le surplus attend les prochains articles.
export function rejouerClient(ventes, mouvements) {
  const lignes = [
    ...ventes.map((v) => ({ vente: v, date: v.date, ordre: v.creeLe ?? 0, montant: montantVente(v) })),
    ...mouvements.map((m) => ({ mouvement: m, date: m.date, ordre: m.creeLe ?? 0, montant: montantMouvement(m) })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.ordre - b.ordre)
  let solde = 0
  // Articles non payés, du plus ancien au plus récent : { produitId, montant }
  // (produitId null pour un montant ajouté à la main). Toujours : solde = somme des dus − avance.
  let dus = []
  let avance = 0 // argent reçu (ou monnaie que je dois) pas encore affecté à un article
  for (const l of lignes) {
    solde += l.montant
    if (l.vente) {
      for (let i = 0; i < l.vente.qte; i++) dus.push({ produitId: l.vente.produitId, montant: l.vente.prix })
    } else if (l.montant > 0) {
      dus.push({ produitId: null, montant: l.montant })
    } else {
      avance -= l.montant
    }
    ;[dus, avance] = reglerArticles(dus, avance)
    l.solde = solde
    l.qtes = {}
    for (const d of dus) if (d.produitId != null) l.qtes[d.produitId] = (l.qtes[d.produitId] ?? 0) + 1
  }
  return { lignes, solde, qtes: lignes.at(-1)?.qtes ?? {} }
}

// Avec l'avance, règle les articles dont le total s'en approche le plus sans la dépasser
// (à égalité, les plus anciens). Ex. : 2 patte + 1 fromage, 2 000 Ar payés → reste 1 patte.
function reglerArticles(dus, avance) {
  const total = dus.reduce((s, d) => s + d.montant, 0)
  if (Math.round(avance) >= Math.round(total)) return [[], avance - total]
  if (avance <= 0) return [dus, avance]
  // Sommes atteignables → { precedente, index } de l'article ajouté, pour retrouver la combinaison.
  const sommes = new Map([[0, null]])
  dus.forEach((d, index) => {
    for (const s of [...sommes.keys()]) {
      const t = s + d.montant
      if (t <= avance && !sommes.has(t) && sommes.size < 5000) sommes.set(t, { precedente: s, index })
    }
  })
  const somme = Math.max(...sommes.keys())
  const regles = new Set()
  for (let s = somme; sommes.get(s); s = sommes.get(s).precedente) regles.add(sommes.get(s).index)
  return [dus.filter((_, i) => !regles.has(i)), avance - somme]
}

export function comptesParClient(ventes, mouvements) {
  const ids = new Set([...ventes.map((v) => v.clientId), ...mouvements.map((m) => m.clientId)].filter(Boolean))
  return Object.fromEntries(
    [...ids].map((id) => [
      id,
      rejouerClient(
        ventes.filter((v) => v.clientId === id),
        mouvements.filter((m) => m.clientId === id),
      ),
    ]),
  )
}

// « 19 patte + 1 fromage », dans l'ordre des produits.
export const texteQuantites = (qtes, produits) =>
  produits
    .filter((p) => qtes[p.id])
    .map((p) => `${qtes[p.id]} ${p.nom.toLowerCase()}`)
    .join(' + ')

// Ajoute ou retire une unité sur le compteur comptant (ventes) ou « ma conso » d'un jour.
export async function ajusterCompteur(nomTable, date, produitId, delta) {
  const table = db.table(nomTable)
  await db.transaction('rw', table, db.produits, async () => {
    const [ligne] = await table
      .where('date')
      .equals(date)
      .filter((r) => r.produitId === produitId && !r.clientId)
      .toArray()
    if (!ligne) {
      if (delta > 0) {
        const produit = await db.produits.get(produitId)
        await table.add({ date, produitId, qte: delta, prix: produit.prix, clientId: null })
      }
      return
    }
    const qte = ligne.qte + delta
    if (qte <= 0) await table.delete(ligne.id)
    else await table.update(ligne.id, { qte })
  })
}

// Change la quantité d'une ligne de crédit. Si le client a payé (ou reçu de la monnaie)
// depuis cette ligne, un ajout crée une nouvelle ligne pour garder l'historique dans l'ordre.
export async function ajusterCredit(vente, delta) {
  await db.transaction('rw', db.ventes, db.mouvements, async () => {
    const qte = vente.qte + delta
    if (qte <= 0) return db.ventes.delete(vente.id)
    const mouvementDepuis = await db.mouvements
      .where('clientId')
      .equals(vente.clientId)
      .filter((m) => (m.creeLe ?? 0) > (vente.creeLe ?? 0))
      .count()
    if (delta > 0 && mouvementDepuis > 0) {
      const { id, ...copie } = vente
      return db.ventes.add({ ...copie, qte: delta, creeLe: Date.now() })
    }
    return db.ventes.update(vente.id, { qte })
  })
}

// Enregistre en une seule fois les changements préparés sur la page Jour.
// brouillon = { ventes: {produitId: delta}, conso: {produitId: delta}, credits: {venteId: delta} }
export async function enregistrerJour(date, brouillon) {
  await db.transaction('rw', db.ventes, db.conso, db.produits, db.mouvements, async () => {
    for (const [table, deltas] of [['ventes', brouillon.ventes], ['conso', brouillon.conso]]) {
      for (const [produitId, delta] of Object.entries(deltas)) {
        if (delta) await ajusterCompteur(table, date, Number(produitId), delta)
      }
    }
    for (const [venteId, delta] of Object.entries(brouillon.credits)) {
      const vente = delta && (await db.ventes.get(Number(venteId)))
      if (vente) await ajusterCredit(vente, delta)
    }
  })
}

// Ajoute un crédit sur la ligne du même client, produit, jour et prix si elle existe déjà.
export async function ajouterCredit({ date, clientId, produitId, qte }) {
  const produit = await db.produits.get(produitId)
  const existantes = await db.ventes
    .where('clientId')
    .equals(clientId)
    .filter((v) => v.date === date && v.produitId === produitId && v.prix === produit.prix)
    .sortBy('creeLe')
  const derniere = existantes.at(-1)
  if (derniere) return ajusterCredit(derniere, qte)
  return db.ventes.add({ date, produitId, qte, prix: produit.prix, clientId, creeLe: Date.now() })
}

// Retourne l'id du client, en le créant s'il n'existe pas encore.
export async function clientParNom(nom) {
  const propre = nom.trim()
  const existant = (await db.clients.toArray()).find(
    (c) => c.nom.toLowerCase() === propre.toLowerCase(),
  )
  return existant ? existant.id : db.clients.add({ nom: propre })
}

const tablesDonnees = () => db.tables.filter((t) => t.name !== 'securite')

export async function exporterSauvegarde() {
  const tables = {}
  for (const t of tablesDonnees()) tables[t.name] = await t.toArray()
  return { app: 'app-patte', version: 1, exporteLe: new Date().toISOString(), tables }
}

export async function importerSauvegarde(donnees) {
  if (donnees?.app !== 'app-patte' || !donnees.tables) throw new Error('Fichier de sauvegarde invalide')
  await db.transaction('rw', tablesDonnees(), async () => {
    for (const t of tablesDonnees()) {
      await t.clear()
      if (donnees.tables[t.name]) await t.bulkAdd(donnees.tables[t.name])
    }
  })
}
