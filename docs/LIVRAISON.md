# État de livraison

Les routes publiques, espaces de rôles, workflows de démonstration, contrôles serveur, persistance, 21 supports, programme annuel, exports, cotisations, anniversaires et service Mariage sont implémentés. Les téléphones personnels ne sont transmis ni dans les profils ni dans les cartes générées. Les contacts institutionnels sur les affiches demeurent ceux des documents fournis.

Validation : 58 tests API, 15 tests du service Mariage, 8 tests des calculs et conditions d’accès ; compilation TypeScript et build de production réussis. Audit npm : aucune vulnérabilité connue au moment du contrôle. Le navigateur a servi à vérifier filtres, tri, accès fictif, cotisations, profils matrimoniaux et affichage mobile/ordinateur. Les PDF ont été inspectés visuellement et Excel ouvert avec un lecteur de classeur. Le rendu Word reste non vérifié, sa structure est valide.

Limites de mise en service : SMS et antivirus externes non configurés ; accès Sites initialement privé ; domaine `.civ` invalide ; sauvegardes automatiques et test de restauration non provisionnés ; politique juridique et conservation à valider. Les vidéos/audio sont référencés dans les comptes rendus, pas hébergés comme flux médias dédiés. Pas de notification SMS métier hors activation ; les autres notifications sont internes. Pas d’intégration de paiement avec opérateur, conformément au parcours de preuves externes.

Les tests réduisent le risque de défaut mais ne démontrent pas une absence universelle de bugs ni une conformité WCAG certifiée ou une disponibilité contractuelle. Les données et portraits de démonstration sont entièrement fictifs.
