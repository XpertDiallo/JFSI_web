# JFSI · plateforme communautaire

Application française du Jardin des Frères et Sœurs en Islam, réalisée à partir du cahier des charges V3, des statuts, du plan opérationnel et des supports transmis.

## Fonctions

- Actualités et forum alimentés par 21 supports, archives datées, recherche, filtres mois/année et tri. Les dates inconnues ne sont pas inventées.
- Programme de 20 activités, événements, comptes rendus, ressources privées, présences, exports PDF et Word.
- Inscription soumise au bureau, activation par l’administration ou un modérateur habilité, sympathisants, adhérents, carte PDF/PNG et vérification minimale par QR.
- Cotisations avec justificatifs privés, validation comptable séparée, reçus, relevé mensuel personnel, arriérés et avances. Exports financiers Excel, CSV et PDF.
- Anniversaires du jour réservés aux membres, sans coordonnées ; option de retrait dans le profil.
- Mariage : adhérents majeurs déclarés, six mois calendaires d’ancienneté et cotisations à jour. Photo et nationalité obligatoires, consentements distincts, validation humaine, recherche privée et mise en relation administrative avec accord du destinataire. Aucun téléphone, e-mail ou message direct.
- Administration, communication, audit, modération déléguée, suggestions et notifications internes.
- Huit profils de démonstration isolés des données réelles. Deux profils Mariage avec portraits générés de personnes entièrement fictives.

## Développement

Node 24 recommandé, npm et Git. Le rendu utilise React/Vinext et Cloudflare Workers ; D1 contient les données, R2 les pièces privées. Authentification ChatGPT côté serveur, MFA TOTP pour les responsables et pour les membres qui l’activent.

```sh
npm run install:ci
npm run dev
npm run db:generate
npm run build
```

Le serveur local démarre sur `http://localhost:5173`. Son identité ChatGPT simulée ne fonctionne que dans le développement. Les migrations SQL versionnées sont dans `drizzle/` ; elles doivent être appliquées à la base locale pour la recette. Le déploiement Sites applique les migrations à sa base dédiée.

Les originaux fournis, les portraits et la carte personnelle de référence sont dans `resources-private/`, exclus du dépôt public. `scripts/prepare-private-assets.mjs` produit les modules serveur ignorés dans `.sites-private/`. **Pour une reconstruction complète après clonage, restaurer ces ressources depuis la livraison privée avant le build.** Sans elles, le code compile mais les médias correspondants ne sont pas disponibles. Les médias du fil sont servis par une route qui vérifie le statut et la visibilité actuels de leur publication.

## Tests

Les tests de mutation refusent toute destination autre que localhost. Ils utilisent uniquement les profils fictifs ; les codes privés restent dans `work/access.json`, exclu de Git. Réinitialiser les fixtures de démonstration locales avant de rejouer les scénarios de validation et de mise en relation.

```sh
node scripts/test-api.mjs
node scripts/test-admissions.mjs
node scripts/test-marriage.mjs
node scripts/test-domain.mjs
npx tsc --noEmit
npm audit
```

Résultats datés dans `docs/tests-*.json`. Les fichiers Word ont fait l’objet d’une validation structurelle ; le rendu Word n’a pas été vérifié faute de LibreOffice sur cette machine. Les PDF et le classeur Excel ont été contrôlés. Aucune garantie universelle d’absence de défaut n’est revendiquée.

## Mise en service et exploitation

Lire [le guide d’exploitation](docs/EXPLOITATION.md) et [la couverture de livraison](docs/LIVRAISON.md). Les codes de test et la clé d’installation du premier administrateur sont fournis séparément dans le document privé, jamais dans le dépôt GitHub.

L’activation est manuelle et ne nécessite aucun SMS. L’analyse antivirus exige un service externe ; sans ce service, les fichiers réels restent en quarantaine. Aucun paiement fictif n’est présenté comme réel. Le site est initialement publié avec l’accès privé du propriétaire Sites.
