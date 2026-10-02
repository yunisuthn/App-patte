import { pbkdf2Async } from '@noble/hashes/pbkdf2.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js'
import { db } from './db'
import { aujourdhui } from './format'

// Bibliothèque JS plutôt que crypto.subtle : celui-ci n'existe pas quand l'app
// est ouverte en http://192.168… sur le téléphone.
const ITERATIONS = 60_000
export const LONGUEUR_MIN = 4

async function hacher(motDePasse, selHex, iterations) {
  const cle = await pbkdf2Async(sha256, motDePasse, hexToBytes(selHex), { c: iterations, dkLen: 32 })
  return bytesToHex(cle)
}

export async function definirMotDePasse(motDePasse) {
  const sel = bytesToHex(randomBytes(16))
  const hash = await hacher(motDePasse, sel, ITERATIONS)
  await db.securite.bulkPut([
    { cle: 'motDePasse', sel, hash, iterations: ITERATIONS },
    { cle: 'session', jour: aujourdhui() },
  ])
}

export async function verifierMotDePasse(motDePasse) {
  const enregistre = await db.securite.get('motDePasse')
  if (!enregistre) return false
  return (await hacher(motDePasse, enregistre.sel, enregistre.iterations)) === enregistre.hash
}

// Déverrouille pour la journée en cours si le mot de passe est bon.
export async function deverrouiller(motDePasse) {
  const ok = await verifierMotDePasse(motDePasse)
  if (ok) await db.securite.put({ cle: 'session', jour: aujourdhui() })
  return ok
}

export const verrouiller = () => db.securite.delete('session')

// Mot de passe oublié : on efface tout ce qui est sur ce téléphone.
export async function toutEffacer() {
  await db.delete()
  location.reload()
}
