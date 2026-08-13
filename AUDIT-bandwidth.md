# Audit bande passante — A1 (2026-08-13)

## Méthode et limite importante

Cet audit a été fait **en local**, sans accès au disque persistant ni aux métriques Render/Railway en production. Le disque d'uploads local (`public/uploads/`) ne contient que 5 fichiers de test (298 Ko au total) — **ce n'est pas représentatif de la production** et ne permet pas de mesurer le vrai volume transféré.

Ce qui suit combine :
- des mesures locales fiables (poids des chunks JS buildés, en-têtes de cache actuels, présence/absence de lazy loading) ;
- une lecture du code pour savoir quelles pages chargent quelles images et combien ;
- une commande prête à l'emploi à lancer sur le disque Render pour obtenir les vrais chiffres du disque de production (section « À exécuter sur Render »).

## Correspondance TODO → routes réelles de l'app

L'app AJVT est une plateforme d'association (adhésions, tournois sportifs, dons), pas une app à quiz. Il n'existe **aucune fonctionnalité "quiz"** dans le code (`grep -ri quiz` sur `src/` et `prisma/schema.prisma` : 0 résultat). J'ai fait correspondre les 5 pages demandées à leurs équivalents réels :

| Demandé dans le TODO | Route réelle |
|---|---|
| Accueil | `src/app/page.tsx` (`/`) |
| Inscription | `src/app/register/page.tsx` (`/register`, création de compte) → `src/app/form/page.tsx` (`/form`, formulaire d'adhésion + preuve de paiement) |
| Profil / carte de membre | `src/app/home/page.tsx` (`/home`, tableau de bord membre + `MemberCard`) |
| Liste admin des adhésions / preuves de paiement | `src/app/admin/payments/page.tsx` (`/admin/payments`) |
| Classement (« quiz ») | `src/app/leaderboard/page.tsx` (`/leaderboard`, classement des donateurs) |

## Disque d'uploads — état local (non représentatif)

| Fichier | Poids |
|---|---|
| `5851a831-...jpeg` | 190 425 o |
| `6cb6887b-...jpeg` | 105 428 o |
| `4c2e15c1-...png` | 8 o (vide/placeholder de test) |
| `c983cf01-...png` | 8 o (vide/placeholder de test) |
| **Total (4 fichiers réels)** | **~298 Ko** |

Les deux fichiers JPEG (190 Ko et 105 Ko) sont typiques de photos de téléphone non compressées — c'est exactement le problème visé par A2/A3.

### À exécuter sur Render (shell du service, sur le disque persistant réel)

```bash
# Nombre de fichiers, poids total
find "$UPLOAD_DIR" -type f | wc -l
du -sh "$UPLOAD_DIR"

# Poids moyen
du -sb "$UPLOAD_DIR"/* | awk '{sum+=$1; n++} END {print sum/n, "octets en moyenne,", n, "fichiers"}'

# Top 20 des plus gros fichiers
du -ab "$UPLOAD_DIR"/* | sort -rn | head -20
```

À coller dans ce fichier (section à ajouter) une fois lancé — c'est le chiffre qui manque pour prioriser correctement A3.

## Poids des pages — JS

Build de production (`next build`, Turbopack) : **1,4 Mo** de JS pour l'ensemble des chunks de l'app, tous routes confondues (non gzippé, déjà minifié). C'est petit dans l'absolu — le JS n'est probablement **pas** le principal poste de bande passante ici, contrairement aux images.

Deux points déjà bons, à vérifier avant de retravailler A7 :
- `html2canvas-pro` (génération de la carte de membre, `src/components/MemberCard.tsx`) est **déjà chargé en `import()` dynamique**, uniquement au clic sur le bouton de génération — pas au chargement de la page.
- `jspdf` est dans `package.json` mais **n'est importé nulle part dans `src/`** — dépendance morte. À supprimer (gain sur le temps d'install/build, pas sur la bande passante réseau puisqu'il n'était de toute façon jamais envoyé au client).

→ A7 est probablement déjà largement satisfait ; à confirmer avec une vraie analyse de bundle (`ANALYZE=true` ou équivalent) avant d'y passer du temps — pas de nouvelle dépendance à ajouter sans validation au préalable.

## Poids des pages — images

| Page | Images chargées | Lazy loading | Pagination |
|---|---|---|---|
| `/` (accueil) | Photo par activité (`<img src="/api/files/activity/...">`), en boucle sur toutes les activités actives | ❌ aucun `loading="lazy"` dans tout `src/` (0 occurrence) | N/A (peu d'activités généralement) |
| `/home` (profil + carte) | Photo du membre uniquement (1 image), QR code généré en data-URI côté client (pas de requête réseau) | — | — |
| `/form` (inscription) | Aperçu de la preuve de paiement déjà envoyée (1 image) | — | — |
| `/leaderboard` (classement dons) | Une photo par donateur, en boucle sur tout le classement | ❌ | ❌ pas de pagination visible |
| `/admin/payments` | **Une image par ligne** (`proof`), toutes les preuves de paiement/dons confondues, chargées d'un coup | ❌ | ❌ `filtered.map(...)` sans pagination |

**`/admin/payments` est bien la page identifiée comme prioritaire dans le TODO** : c'est la seule qui affiche potentiellement des dizaines d'images pleine résolution simultanément, sans pagination ni lazy loading.

## En-têtes de cache — état actuel

Les 5 routes qui servent les fichiers uploadés (`/api/files/[filename]`, `/api/files/activity`, `/api/files/member`, `/api/files/team`, `/api/files/donation`) ont **déjà** `Cache-Control: public, max-age=31536000` — il ne manque que `immutable` (facile à ajouter, cf. A4, puisque les noms sont déjà en uuid et jamais réécrits en place).

Point important pour A6 (Cloudflare) : les 5 routes ne sont pas équivalentes côté confidentialité.

- **Publiques, cacheables par un CDN sans risque** : `activity`, `member`, `donation` (photos de profil/activités/donateurs) — chaque route vérifie juste que le nom de fichier correspond à un enregistrement existant, aucune session requise.
- **Privées, à ne jamais mettre en cache partagé** : `/api/files/[filename]` (preuves de paiement, justificatifs de dépenses) — nécessite une session admin ou membre (`getAdminSession`/`getUserSession`). Une règle de cache Cloudflare sur `/uploads/*` ou `/api/files/*` ne doit **pas** inclure cette route sous peine de fuite de documents bancaires entre utilisateurs.

À affiner dans `docs/cloudflare-setup.md` (A6) : la règle de cache doit cibler `/api/files/activity/*`, `/api/files/member/*`, `/api/files/team/*`, `/api/files/donation/*`, mais exclure `/api/files/[filename]` (proofs/expenses).

Corollaire pour `/admin/payments` (page prioritaire) : ses images passent presque toutes par la route protégée `/api/files/[filename]` (proof), donc **Cloudflare ne réduira pas la bande passante Render pour cette page précise** — le levier principal reste la compression (A2/A3) + miniatures/lazy load/pagination (A5), pas le CDN.

## Conclusion — priorités confirmées pour la suite

1. **A2** (compression à l'upload) et **A3** (recompression de l'existant) : impact direct et le plus large, confirmé par les 2 JPEG non compressés trouvés localement (190 Ko et 105 Ko pour des photos qui devraient faire <250 Ko après traitement... en fait déjà proches, donc le vrai gain sera surtout sur les photos plus lourdes du disque de prod — à mesurer via la commande Render ci-dessus).
2. **A5** en priorité sur `/admin/payments` et `/leaderboard` : aucun lazy loading nulle part dans le code, aucune pagination sur ces deux listes.
3. **A4** : petit ajustement (`immutable`), peu de risque, à faire en même temps que A2/A3 puisque les noms de fichiers sont déjà des uuid stables.
4. **A6** : bon gain attendu sur les photos publiques (activités, profils, donateurs) ; sans effet sur les preuves de paiement/dépenses (route protégée par session) — la doc devra le préciser pour ne pas créer une fausse impression de gain uniforme.
5. **A7** : probablement déjà quasi acquis (html2canvas en dynamic import) ; seul reste à faire, supprimer la dépendance `jspdf` inutilisée. Vérifier avec un vrai bundle analyzer avant d'investir plus de temps.

## À faire pour compléter cet audit

- [ ] Lancer les commandes de la section « À exécuter sur Render » sur le disque persistant de production et reporter les chiffres ici.
- [ ] Si possible, consulter le dashboard Render (onglet Metrics/Bandwidth) pour confirmer quelles routes consomment le plus (si Render expose cette répartition).
