# Audit d’anonymisation — 30 septembre 2026

## Périmètre et méthode

Les 3 fichiers présents dans l’arbre de main avant le nettoyage ont été examinés : la base d’exemples, le script utilisateurs et le README. Aucun autre fichier, ni AGENTS.md, n’est présent dans cet arbre. Les numéros ci-dessous désignent les lignes de cette version antérieure, et non la nouvelle base.

Le rapport ne reproduit pas les valeurs identifiantes supprimées.

## Constats précis dans la base antérieure

| Catégorie | Localisation avant correction | Constat et correction |
| --- | --- | --- |
| Société cliente dans les objets | exemples-emails-anonymises.txt, lignes 4, 26, 52 | Même raison sociale en clair dans 3 objets d’assurance emprunteur. Remplacés par des objets génériques. |
| Pièce jointe comportant une société cliente | ligne 18 | Titre de document tronqué conservant une partie de la raison sociale. Retiré avec les traces de pièces jointes. |
| Société cliente dans un compte rendu | lignes 1787, 1801 | Même nom commercial en clair à 2 endroits. Comptes rendus individuels retirés. |
| Nom susceptible de désigner une personne | lignes 3289, 3303 | Même nom encore en clair dans un exemple concernant un contrat familial. Retiré, quelle que soit son identité effective. |
| Désignation de société et localisation bancaire | lignes 896, 936 | Localisation d’une agence et désignation pouvant identifier une SCI, avec historique du contrat. Passage remplacé par un modèle générique. |
| Montant propre à une proposition | lignes 50, 60 | Prime totale d’assurance emprunteur conservée dans la demande et la réponse. Montants sources retirés. |
| Combinaisons de cotisations | lignes 2062–2079, 3166–3207 | Anciennes et nouvelles mensualités, coût d’un contrat complémentaire et économie calculée. Combinaisons sources retirées. |
| Dates et âge dans une demande dérogatoire | lignes 2449–2469 | Chronologie de souscription, mois d’anniversaire, âge précis et durée du dépassement. Exemple individuel retiré. |
| Situation familiale détaillée | lignes 1896–1900 | Conflit familial, reprise de contact, décès de proches et nombre de contrats confiés au cabinet. Récit retiré ; seule une réponse d’attente générique est conservée. |
| Revenus et composition du foyer | lignes 2720–2827 | Revenus estimés, célibat, absence d’enfants et choix de garanties associés. Profil individuel retiré. |
| Véhicules, pays et contrats combinés | notamment lignes 674–691, 2272–2287, 3168–3181, 3313–3370, 3404–3709 | Modèles de véhicules, destinations et ensemble de couvertures associés aux dossiers. Remplacés par des catégories générales. |
| Liens et noms de produits | ensemble du fichier | Liens publics et noms de compagnies/produits ne sont pas à eux seuls des données client, mais leurs associations contribuent à reconnaître un dossier. Ils ne figurent plus dans les nouveaux exemples. |
| Identifiants pseudonymisés persistants | ensemble du fichier | 96 marqueurs PERSONNE distincts, 285 occurrences : ils permettaient encore de rapprocher les extraits. Tous retirés, sans table de correspondance. |
| Traces de conversation | ensemble du fichier | Demandes brutes, corrections successives, noms de documents, réflexions, recherches et rapports d’activité mêlés aux modèles. Retirés. |

La base antérieure comportait 67 lignes d’objet explicites, 256 occurrences de montants suivis d’un symbole monétaire ou du mot « euros », et 29 occurrences de formats numériques avec barres obliques. Ces derniers comprennent aussi des franchises : ce n’est pas un décompte de 29 dates personnelles.

Aucune adresse électronique en clair n’a été détectée dans cette base. Les longues suites numériques détectées correspondaient à des plafonds de garanties ; aucun numéro de téléphone, IBAN ou numéro de contrat en clair n’a été confirmé dans la version examinée. Cela ne change pas les oublis identifiants décrits ci-dessus.

## Corrections dans le dépôt courant

- La base est reconstruite en 50 modèles génériques couvrant les mêmes grands usages : devis, relances, souscriptions, règlements, résiliations, sinistres et transmission de pièces.
- Aucun nom de personne, raison sociale cliente, adresse, référence individuelle, date, montant source, modèle de véhicule ou récit familial source n’est repris.
- Les anciennes combinaisons de garanties et de tarifs ne sont pas conservées comme caractéristiques de clients.
- Le script passe de 3.3.16 à 3.3.18.
- La liste de 6 collaborateurs nommés en dur dans le prompt, son exemple de développement d’initiales en identité et la mention d’auteur sont retirés.
- La signature ne peut reprendre que le nom explicitement fourni dans le brouillon actuel. Les initiales seules ne sont plus développées.
- La lecture et le repli réseau utilisent un nouvel espace de cache. Les 4 anciennes entrées persistantes v1 et v2 sont vidées lors du chargement des exemples par la nouvelle version.
- Le README initial ne contenait qu’un titre et aucune donnée client.

La marque publique du cabinet et sa ville dans la configuration du rédacteur, les adresses techniques du dépôt, de Modulr et de l’API restent présentes car elles servent au fonctionnement. Ce ne sont pas des exemples clients.

## Vérifications

Syntaxe JavaScript, extraction des 50 modèles par le sélecteur existant, sélection pertinente dans la limite existante, migration du cache, repli réseau sans réutilisation de l’ancien corpus, et recherche de résidus de données sources ont été contrôlés localement.

## Purge de l’historique — 30 septembre 2026

Sur demande explicite de l’utilisateur, main a été recréée à partir d’un commit racine sans parent contenant seulement les fichiers assainis. Les anciens commits ne sont plus des ancêtres de main. Le dépôt ne présentait qu’une référence de branche (main), aucun tag, aucune pull request et aucune release lors du contrôle.

Deux anciens journaux GitHub Actions contenaient la liste de noms en clair utilisée par le script d’anonymisation. Cette liste permettait notamment de relier certains marqueurs aux identités originales. Les 2 exécutions et leurs journaux ont été supprimés, et leur absence de la liste des exécutions a été vérifiée. Aucun artefact n’était associé à ces exécutions.

La suppression a été effectuée par un workflow temporaire ciblant exclusivement les 2 exécutions identifiées. Son succès a été confirmé. Le fichier temporaire du workflow a ensuite été retiré de l’arbre final, et la branche est recréée sans les commits intermédiaires de nettoyage.

## Ce que le nettoyage retire et ce qui était déjà masqué

Données encore en clair retirées : les sociétés clientes dans les objets, titres de documents et comptes rendus ; le nom résiduel dans un dossier familial ; une désignation de SCI ; une localisation d’agence bancaire ; les identités des collaborateurs et l’auteur codés dans le script ; les listes d’identités dans les journaux Actions ; les dates, montants, revenus, âges, véhicules, destinations et circonstances propres aux dossiers.

Les adresses, références et dates de naissance sous marqueurs étaient déjà masquées dans la base courante avant intervention. Le nettoyage retire aussi ces marqueurs et l’ensemble des échanges bruts. Il ne faut pas présenter les 96 marqueurs PERSONNE comme 96 noms encore en clair dans ce fichier.

Les montants, noms de compagnies et produits publics ne sont pas tous des données personnelles en eux-mêmes. Ils ont aussi été retirés de la base générique pour éliminer les combinaisons propres aux dossiers. Les garanties exactes des propositions sources ne sont plus utilisées comme exemples de caractéristiques client.

## Limites restantes

Une ancienne adresse de commit a été testée après la réinitialisation : elle reste accessible directement par son identifiant. La réinitialisation supprime l’ancien historique des branches, mais ne suffit donc pas à effacer les objets non référencés et les vues conservées par GitHub.

La suppression de ces objets et des vues résiduelles côté serveur nécessite une intervention de GitHub Support, comme décrit dans la documentation officielle :
https://docs.github.com/fr/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository

Aucune demande au support n’a été envoyée. Aucun outil disponible ne permet ici d’effectuer la collecte des objets non référencés sur les serveurs GitHub. Le contrôle des forks externes n’a pas pu être effectué avec les capacités exposées. Les copies tierces et clones existants ne peuvent pas être supprimés depuis ce dépôt.

Les anciennes pages Modulr ouvertes doivent être rechargées après mise à jour vers 3.3.18 pour appliquer le nettoyage des caches v1 et v2. Ne pas réintroduire l’ancien historique par fusion depuis un clone antérieur ; repartir de l’historique nettoyé.

Le brouillon en cours, le nom affiché sur la fiche et le contexte de conversation continuent d’être transmis à Gemini pour assurer la correction. Ils ne sont pas anonymisés par cette intervention. Les données déjà transmises ne sont pas supprimées rétroactivement.

Les éventuels contenus d’issues et commentaires n’ont pas été audités. Aucune anonymisation irréversible de toute l’exposition passée n’est affirmée.
