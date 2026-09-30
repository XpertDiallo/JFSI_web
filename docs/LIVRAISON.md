# Livraison JFSI — 30 septembre 2026

## Modifications livrées

Le rôle **Auditeur / Commissaire aux comptes** possède un menu distinct de la **Trésorerie**. Il consulte les écritures et pièces, ajoute des observations datées et signées, et exporte les tableaux filtrés par mois, année, type, événement et état. Il ne saisit pas d’écriture et ne valide pas de paiement. Les observations sont visibles uniquement par les responsables comptables et le membre concerné. L’affectation d’un justificatif à une seule écriture est protégée, y compris lors de requêtes simultanées.

La bibliothèque contient **95 livres uniques**, après exclusion de **4 doublons exacts** du ZIP fourni : **12 605 pages**, en français (92 livres) et anglais (3). Les titres et auteurs ont été relus ; l’auteur reste vide lorsqu’il n’est pas confirmé. Les ressources de lecture pèsent environ 435 Mo au total et se chargent à la demande par section PDF ou page WebP. Recherche, catégories, langues, pagination et zoom sont disponibles. Aucun bouton de téléchargement n’apparaît dans la bibliothèque et la médiathèque ; cela ne constitue pas une protection technique contre toute copie ou capture.

Trois nouvelles actualités avec affiche ont été ajoutées : rencontre trimestrielle du Bureau exécutif le **4 octobre 2026 à 8 h**, participation des hommes à la sensibilisation Octobre Rose, mobilisation collective contre le cancer du sein. L’affiche Octobre Rose déjà présente est conservée une seule fois. Le site intègre désormais **24 supports éditoriaux** transmis.

Les améliorations comprennent aussi la publication unifiée (actualité, événement, discussion et affiche facultative), les délégations distinctes, les dossiers administratifs privés ouverts depuis un nom, les statistiques filtrées, la transparence financière mensuelle, les photos facultatives et les pièces comptables. L’espace membre reste vert, les rôles orange et la déconnexion rose. La bibliothèque et la médiathèque sont accessibles depuis l’accueil.

Les parcours antérieurs restent présents : activation administrative sans SMS, carte et cotisations depuis l’adhésion, anniversaires du jour, service Mariage avec ancienneté et cotisations à jour, présences et comptes rendus. Les numéros personnels restent absents des profils ordinaires ; seuls les responsables autorisés les consultent dans le dossier administratif privé.

## Vérifications

**135/135 contrôles de recette réussis** : API 58, inscriptions 17, Mariage 15, règles métier 8, fonctions professionnelles 24, Auditeur 9, nouveaux contenus 4. Les rapports JSON datés sont conservés dans `docs/`. Les 3 064 fichiers de lecture ont été vérifiés, ainsi que les originaux et les doublons par empreinte SHA-256. Les deux exports Excel filtrés ont été ouverts et leur contenu comparé aux périodes et types demandés.

Compilation TypeScript vérifiée. La construction de production fait partie de la publication et doit réussir avant la sauvegarde de cette révision. L’audit des dépendances a relevé zéro vulnérabilité connue lors du contrôle. Les lecteurs ont été contrôlés dans le navigateur sur ordinateur et sur mobile. Ces tests ne constituent pas une garantie d’absence universelle de bugs.

## Ressources et accès

Dossier complet : `C:\Users\Lenovo\Desktop\JFSI\JFSI_web`. Dépôt de code : https://github.com/XpertDiallo/JFSI_web. Les originaux, fichiers de lecture, médias générés et secrets restent hors Git. L’archive privée contient le code et les ressources nécessaires à la reconstruction ; les accès de test sont remis dans un document séparé.

## Mise en service

Le site conserve son audience **privée au propriétaire dans Sites**. Le service antivirus externe reste à configurer : les nouveaux dépôts réels sont placés en quarantaine. La démonstration utilise un statut simulé, réservé aux essais fictifs. Les sauvegardes automatiques D1/R2 et leur restauration ne sont pas provisionnées. Le site suit des versements externes et leurs preuves ; il n’exécute pas de paiement opérateur. Aucun SMS n’est envoyé. Le domaine demandé `www.jfsi.civ` n’est pas raccordé ; aucune acquisition de domaine de remplacement n’a été effectuée.

Le résultat effectif du déploiement et le commit synchronisé sont consignés dans le rapport remis avec les livrables.
