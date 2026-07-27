# Discours de soutenance — TIRAHOU

**Étudiant :** Ali Bréhima Cissé
**Établissement :** Institut Africain de Technologie et de Management (ITMA)
**Filière :** Ingénierie Logiciel et Systèmes d'Information (ILSI) — Master 2
**Directeur de mémoire :** Dr Oumar Maiga

> Ce discours suit exactement la structure de `TIRAHOU_Soutenance_Ali_Cisse.pptx` (25 slides utiles + annexes). Chaque section ci-dessous correspond à un ou plusieurs slides, indiqués entre crochets. Durée visée : 18–20 minutes hors questions. Le texte est écrit pour être **dit**, pas lu mot à mot — appuyez-vous dessus, ne le récitez pas.

---

## Ouverture (avant le slide 1)

Monsieur le Président du jury, Madame, Monsieur les membres du jury, Monsieur mon Directeur de mémoire Dr Oumar Maiga, Mesdames et Messieurs,

C'est avec un grand honneur et une certaine émotion que je me présente devant vous aujourd'hui pour soutenir mon mémoire de fin de cycle Master 2, en Ingénierie Logiciel et Systèmes d'Information, à l'Institut Africain de Technologie et de Management.

Je m'appelle Ali Bréhima Cissé, et le travail que je vais vous présenter porte sur la conception et la réalisation de **TIRAHOU**, une plateforme intégrée de gestion universitaire.

---

## Slide 1 — Page de garde

Avant d'entrer dans le vif du sujet, permettez-moi de vous situer le contexte de ce travail. TIRAHOU n'est pas un projet académique isolé posé sur une étagère : c'est une plateforme que j'ai conçue, développée, testée et déployée en conditions réelles, avec l'objectif explicite qu'elle puisse un jour servir un établissement d'enseignement supérieur concret. Tout ce que je vais vous montrer aujourd'hui — le code, les données, la démonstration — est fonctionnel et accessible en ligne, pas simulé pour l'occasion.

## Slide 2 — Sommaire

Ma présentation s'articule en six chapitres. Je commencerai par poser le contexte et la problématique qui ont motivé ce travail, avant de faire un état de l'art rapide des solutions existantes et des choix technologiques que j'ai retenus. Je détaillerai ensuite la conception du système — ses acteurs, son architecture, sa sécurité — puis sa réalisation concrète à travers les fonctionnalités phares. Je terminerai par les résultats des tests, les chiffres clés du projet, et une conclusion honnête sur ses limites et ses perspectives d'évolution.

---

## CHAPITRE 1 · INTRODUCTION

### Slide 3 — Contexte : une gestion universitaire fragmentée

Le point de départ de ce mémoire est un constat que beaucoup d'entre vous connaissent bien : dans de nombreux établissements d'enseignement supérieur ouest-africains, la gestion administrative et pédagogique repose encore sur des outils disparates — un tableur Excel pour les notes, un cahier ou un registre papier pour les présences, des allers-retours physiques au bureau de la scolarité pour une simple attestation, et des paiements de frais de scolarité qui échappent à tout suivi centralisé. Chaque service travaille avec ses propres outils, souvent sans communication entre eux. Résultat : des ressaisies redondantes, des erreurs, des délais, et surtout une absence de vision d'ensemble pour le pilotage de l'établissement.

### Slide 4 — Problématique

Cela m'amène à la question centrale de ce mémoire : **comment concevoir une plateforme numérique unique, capable de couvrir l'ensemble du cycle de vie universitaire — de la candidature d'un étudiant jusqu'à l'obtention de son diplôme — tout en respectant les spécificités du système LMD, et en garantissant la sécurité des données académiques et financières ?**

Cette question se décline en plusieurs sous-questions techniques que j'ai dû résoudre : comment modéliser une structure académique LMD generique et réutilisable ? Comment garantir qu'un étudiant ne puisse jamais accéder aux notes d'un autre ? Comment faire collaborer en temps réel des dizaines d'acteurs aux rôles différents — étudiants, enseignants, personnel administratif, financier, bibliothécaire ?

### Slide 5 — Objectifs du projet

Pour répondre à cette problématique, je me suis fixé un objectif général et huit objectifs spécifiques, que j'ai suivis tout au long du développement comme un véritable cahier de recette. L'objectif général était de concevoir et réaliser une plateforme intégrée couvrant l'intégralité des processus métier d'un établissement universitaire LMD. Les objectifs spécifiques couvraient, entre autres, la gestion administrative et pédagogique des inscriptions, la gestion des évaluations et délibérations, la gestion financière, la gestion documentaire avec vérification d'authenticité, un module d'analytique prédictive, et une application mobile pour les étudiants et enseignants. Je peux d'ores et déjà vous annoncer, et j'y reviendrai avec les chiffres à l'appui, que ces huit objectifs sont aujourd'hui tous marqués comme complets dans mon cahier de recette.

### Slide 6 — Méthodologie de conception et de développement

Sur le plan méthodologique, j'ai adopté une démarche itérative et incrémentale, proche de l'esprit agile : plutôt que de figer une spécification complète avant tout développement, j'ai construit la plateforme module par module — structure académique, puis admissions, puis inscriptions, puis évaluation, et ainsi de suite — en testant systématiquement chaque brique avant de passer à la suivante. Cette approche m'a permis de détecter tôt des incohérences entre la conception et les besoins réels, et de les corriger avant qu'elles ne se propagent dans les modules suivants. J'ai également accordé une importance particulière à la modélisation UML en amont — diagrammes de cas d'utilisation, de classes, de séquence — pour structurer ma réflexion avant d'écrire la moindre ligne de code.

---

## CHAPITRE 2 · ÉTAT DE L'ART

### Slide 7 — Solutions existantes : pourquoi une solution locale ?

Avant de me lancer dans le développement, j'ai étudié les solutions existantes sur le marché : des ERP universitaires internationaux comme Banner, des solutions open source comme OpenEduCat ou Odoo Education, et des ERP génériques comme ERPNext. Toutes présentent des qualités reconnues, mais aucune n'est pensée nativement pour le système LMD francophone tel qu'il est pratiqué dans nos établissements : la logique des Unités d'Enseignement et des Éléments Constitutifs, les règles de compensation entre notes, les spécificités de la scolarité en Afrique de l'Ouest — mobile money, connectivité parfois instable — n'y sont pas prises en charge nativement. Ces solutions sont soit trop coûteuses, soit trop génériques, soit trop rigides pour s'adapter à ce contexte. C'est ce constat qui justifie une solution pensée et développée localement.

### Slide 8 — Choix technologiques — Backend

Pour la partie serveur, j'ai retenu **Django et Django REST Framework**, en Python. Ce choix n'est pas anodin : Django impose une architecture claire — modèles, vues, sérialiseurs — qui favorise la maintenabilité sur un projet de cette ampleur, avec vingt-et-un modules métier. J'ai couplé cela à **PostgreSQL** comme système de gestion de base de données, notamment parce qu'il offre nativement des mécanismes de sécurité avancés — j'y reviendrai dans la partie sécurité — que je n'aurais pas pu obtenir avec un moteur plus simple. Pour les fonctionnalités temps réel, comme les notifications instantanées, j'ai intégré **Django Channels**, qui permet de faire cohabiter des requêtes HTTP classiques et des connexions WebSocket persistantes au sein du même serveur applicatif.

### Slide 9 — Choix technologiques — Frontend, PWA & Mobile

Côté client, j'ai construit une application web avec **React et TypeScript**, sur un socle **Vite**, ce qui m'a permis de bénéficier d'un typage statique — précieux pour un projet de cette taille — et d'un outillage de développement rapide. Cette application web est également packagée en **Progressive Web App**, installable sur smartphone directement depuis le navigateur. Enfin, pour une expérience mobile native complète, j'ai développé une application avec **React Native et Expo**, qui partage la même API backend que le web, garantissant une cohérence totale des données entre les deux canaux.

---

## CHAPITRE 3 · CONCEPTION

### Slide 10 — Acteurs du système — 13 profils utilisateurs

La conception de TIRAHOU repose sur treize rôles utilisateurs distincts, allant du super-administrateur au simple étudiant, en passant par l'enseignant, le responsable pédagogique, le chef de département, le personnel de scolarité, le personnel financier, le bibliothécaire, ou encore le tuteur. Chacun de ces rôles dispose d'un périmètre d'action précis, contrôlé non pas uniquement côté interface, mais **côté serveur**, ce qui m'amène directement à la question de l'architecture.

### Slide 11 — Modélisation UML — Cas d'utilisation (vue globale)

[Montrer le diagramme] Ce diagramme de cas d'utilisation synthétise l'ensemble des interactions entre ces treize acteurs et le système. Il m'a servi de fil conducteur pendant toute la phase de conception : chaque cas d'utilisation représenté ici correspond aujourd'hui à une fonctionnalité réellement implémentée et testée dans la plateforme — je n'ai conservé dans ce diagramme final que ce qui a été effectivement réalisé, pas ce qui était initialement envisagé.

### Slide 12 — Architecture du système — 3 couches

TIRAHOU repose sur une architecture en trois couches clairement séparées. La couche de présentation, ce sont les clients — web, mobile, PWA — qui ne contiennent aucune logique métier sensible. La couche applicative, c'est l'API REST Django, qui expose plus de six cent cinquante points d'accès et qui centralise toutes les règles métier et tous les contrôles d'autorisation. La couche de données, enfin, c'est PostgreSQL, qui stocke l'ensemble des informations et applique, comme je vais le détailler, une deuxième ligne de défense sur les données les plus sensibles. Cette séparation stricte signifie qu'un client — même compromis ou modifié par un utilisateur malveillant — ne peut jamais contourner les règles de sécurité, puisque celles-ci sont systématiquement revérifiées côté serveur.

### Slide 13 — 21 modules Django à responsabilité unique

Cette API applicative est elle-même découpée en vingt-et-un modules à responsabilité unique — académique, admissions, finance, évaluation, LMS, bibliothèque, et ainsi de suite — organisés en quatre grands domaines fonctionnels : académique, parcours étudiant, pédagogie, et support-pilotage. Ce découpage n'est pas qu'esthétique : il m'a permis, tout au long du développement, de faire évoluer un module sans risquer de casser les autres, et il facilite grandement la maintenance future de la plateforme.

### Slide 14 — Sécurité de la plateforme

J'en viens à un point sur lequel j'ai porté une attention particulière : la sécurité. Au-delà de l'authentification par jetons JWT et du contrôle d'accès basé sur les rôles que je viens de décrire, j'ai mis en place une seconde ligne de défense au niveau même de la base de données : la **Row-Level Security de PostgreSQL**, sur les tables les plus sensibles — les notes et les factures. Concrètement, même si un bug applicatif ou une faille de logique métier venait à contourner les vérifications du code Django, la base de données elle-même refuse structurellement à un étudiant de lire une ligne appartenant à un autre étudiant. C'est une défense en profondeur : deux barrières indépendantes, pas une seule.

Je tiens aussi à mentionner ici une démarche qui a occupé une part importante de mon travail : au-delà de la conception initiale, j'ai mené un audit systématique et méthodique de chaque fonctionnalité critique de la plateforme, en la testant en conditions réelles — pas seulement en relisant le code. Cette démarche m'a permis d'identifier et de corriger, avant la mise à disposition finale, plusieurs anomalies réelles : des failles d'autorisation où un utilisateur pouvait accéder aux données d'un autre, des workflows de validation bloqués par une mauvaise condition, ou encore des champs obligatoires jamais transmis par certains formulaires. Je considère cette rigueur de validation comme une partie intégrante de la qualité du livrable final.

---

## CHAPITRE 4 · RÉALISATION

### Slide 15 — Interface — Tableau de bord institutionnel

[Montrer la capture d'écran] Voici le tableau de bord présenté à un administrateur institutionnel. Il centralise en un coup d'œil les indicateurs clés de l'établissement : effectifs étudiants et enseignants, taux de collecte financière, programmes actifs, activité récente du système. Chaque chiffre affiché ici est calculé en temps réel à partir de la base de données — aucune donnée n'est figée ou simulée.

### Slide 16 — Interfaces — Espace étudiant & enseignant

Chaque profil dispose d'un espace personnalisé. L'étudiant y consulte ses notes, son emploi du temps, ses paiements, ses documents officiels vérifiables par QR code. L'enseignant y gère ses cours, saisit les notes de ses étudiants, suit les présences par créneau. L'ergonomie a été pensée pour que chaque acteur accède directement à ce qui le concerne, sans naviguer dans des menus destinés à d'autres rôles.

### Slide 17 — Fonctionnalité phare — Évaluation & délibérations LMD

La gestion des évaluations est sans doute le cœur métier le plus délicat de ce projet, parce qu'elle doit refléter fidèlement les règles du système LMD : pondération entre contrôle continu et examen final, gestion des sessions de rattrapage, règles de compensation entre éléments constitutifs d'une même unité d'enseignement, calcul automatique des moyennes semestrielles, et publication contrôlée des résultats après délibération du jury. Chaque étape de ce workflow — saisie, validation, contestation éventuelle, publication — est tracée et contrôlée par les permissions appropriées.

### Slide 18 — Fonctionnalité phare — Analytics prédictif

TIRAHOU intègre également un module d'analyse prédictive, qui calcule pour chaque étudiant un score de risque de décrochage, à partir de quatre indicateurs pondérés : la moyenne générale, le taux d'assiduité, l'engagement sur la plateforme pédagogique, et le taux de complétion des activités. Je précise, en toute transparence, que ce modèle repose sur une pondération de règles calibrée empiriquement sur les données disponibles, et non sur un apprentissage automatique supervisé au sens strict — j'y reviendrai dans les limites de ce travail. Il permet néanmoins au responsable pédagogique d'identifier précocement les étudiants en difficulté et d'agir avant qu'il ne soit trop tard.

### Slide 19 — Fonctionnalité phare — Campus numérique & présences

La plateforme intègre un campus numérique complet — espaces de cours, ressources pédagogiques, devoirs, quiz — ainsi qu'un système de classes virtuelles compatible avec plusieurs fournisseurs de visioconférence, et un système de présences par QR code qui fusionne automatiquement la présence physique et la présence en ligne pour les séances en mode hybride, en un seul et même registre.

### Slide 20 — Application mobile TIRAHOU

Enfin, l'application mobile, développée en React Native, permet aux étudiants et enseignants d'accéder aux fonctionnalités essentielles depuis leur smartphone : notes, emploi du temps, présences, devoirs, classes virtuelles, et désormais des notifications poussées en temps réel via connexion WebSocket, avec reconnexion automatique en cas de perte de réseau — un point important dans un contexte où la connectivité peut être instable.

---

## CHAPITRE 5 · TESTS ET VALIDATION

### Slide 21 — Tests et validation

La fiabilité de TIRAHOU repose sur plusieurs niveaux de validation complémentaires. J'ai d'abord constitué une suite de tests unitaires et d'intégration automatisés côté backend, exécutable en une seule commande et intégrée à mon flux de travail. J'ai complété cela par une suite de tests de bout en bout avec Playwright, qui simule un vrai parcours utilisateur dans un navigateur, de la connexion jusqu'à l'action métier. J'ai également mené un test de charge, avec des utilisateurs simulés en parallèle, qui m'a permis d'observer le comportement réel de la plateforme sous sollicitation — notamment la protection automatique contre les tentatives de connexion abusives. Enfin, comme je l'évoquais, une part importante de ce travail de validation a consisté à tester chaque fonctionnalité critique directement contre la plateforme déployée, en conditions réelles, plutôt que de me fier uniquement à une relecture du code.

### Slide 22 — Chiffres clés du projet

Je peux à présent vous donner une vue chiffrée de l'ampleur de ce travail. TIRAHOU, c'est aujourd'hui **vingt-et-une applications Django**, plus de **quatre-vingt-dix modèles de données**, plus de **cent-huit tables en base**, plus de **six cent cinquante points d'accès API REST**, plus de **soixante-dix-huit pages** côté frontend, et plus de **cent-dix fichiers React**, au service de **treize rôles utilisateurs** différents. Sur le plan fonctionnel, mon cahier de recette affiche un taux de couverture de **seize domaines fonctionnels sur seize**, soit cent pour cent, avec les huit objectifs spécifiques tous marqués complets.

### Slide 23 — Déploiement en production

TIRAHOU n'est pas resté un prototype de démonstration locale : la plateforme est **déployée et accessible en ligne**, avec un backend hébergé sur Render et un frontend sur Vercel, une base de données PostgreSQL de production, et un pipeline de déploiement automatisé qui exécute les migrations et initialise les données de démonstration à chaque mise à jour. C'est précisément cette exposition réelle qui m'a permis de mener la démarche de validation rigoureuse dont je parlais à l'instant.

---

## CHAPITRE 6 · CONCLUSION

### Slide 24 — Limites actuelles & perspectives d'évolution

Aucun projet n'est parfait, et je préfère vous présenter ces limites moi-même, en toute honnêteté scientifique, plutôt que de les laisser découvrir. Sur le plan technique, la scalabilité n'a été testée qu'à une échelle limitée, et le modèle prédictif que j'évoquais repose sur des règles pondérées plutôt que sur un apprentissage automatique supervisé. Sur le plan fonctionnel, l'architecture multi-établissements a fait l'objet d'une note de conception détaillée, mais n'a pas été implémentée dans le temps imparti à ce mémoire — un choix assumé plutôt qu'un oubli.

Pour la suite, je vois trois horizons d'évolution. À court terme, recalibrer le modèle prédictif sur des données réelles de production, une fois la plateforme utilisée par de vrais effectifs. À moyen terme, l'architecture multi-établissements dont je viens de parler, un module de ressources humaines et paie, et un support des standards SCORM et xAPI pour le contenu pédagogique. À plus long terme, une intelligence artificielle plus avancée intégrée au campus numérique, et une ouverture de l'API à d'autres établissements partenaires.

### Slide 25 — Conclusion

Pour conclure, ce mémoire répond, je le crois, à la problématique que je posais en introduction : il est possible de concevoir une plateforme numérique unique, respectueuse des spécificités du système LMD, qui couvre l'intégralité du parcours universitaire tout en garantissant la sécurité des données. TIRAHOU en est la démonstration concrète, fonctionnelle, et déployée — pas une simple maquette. Ce travail m'a permis de mobiliser l'ensemble des compétences acquises durant mon cursus d'Ingénierie Logiciel et Systèmes d'Information : conception, architecture, sécurité, mais aussi rigueur méthodologique et sens critique face à mon propre travail.

Je tiens à remercier chaleureusement mon Directeur de mémoire, Dr Oumar Maiga, pour son encadrement et ses conseils tout au long de ce travail, ainsi que l'ensemble du corps enseignant de l'ITMA. Je vous remercie de votre attention, et je me tiens à présent à votre disposition pour vos questions et remarques.

---

## Notes pour la démonstration live (si prévue après le discours)

- Se connecter successivement avec 2-3 comptes de rôles différents (admin, enseignant, étudiant) pour montrer la personnalisation des espaces.
- Montrer un cas concret : saisie d'une note par l'enseignant → apparition immédiate dans l'espace étudiant.
- Montrer la vérification publique d'un document par QR code (sans connexion), pour illustrer la sécurité et l'ouverture contrôlée du système.
- Si le jury pose une question technique pointue à laquelle vous n'êtes pas sûr, préférez répondre "je peux vérifier ce point précis dans le code et vous répondre" plutôt que d'improviser une réponse incertaine — c'est perçu positivement par un jury.

## Anticiper les questions probables du jury

- **« Pourquoi ne pas avoir utilisé [tel autre framework] ? »** → Renvoyer à la comparaison du chapitre 2 (état de l'art) : Django impose une structure qui convient à un projet modulaire de cette ampleur ; d'autres choix étaient possibles mais celui-ci répondait mieux aux contraintes de maintenabilité.
- **« Comment garantissez-vous qu'un étudiant ne voit pas les notes d'un autre ? »** → Réponse toute prête : contrôle applicatif (permissions par rôle) ET Row-Level Security PostgreSQL en seconde ligne — deux mécanismes indépendants.
- **« Le modèle prédictif est-il de l'intelligence artificielle ? »** → Être honnête : pondération de règles calibrée, pas un modèle d'apprentissage supervisé — c'est explicitement listé dans les limites, ne pas se laisser piéger à le présenter comme plus qu'il n'est.
- **« Le système est-il vraiment utilisé par un établissement ? »** → Répondre avec précision sur l'état réel : plateforme déployée et fonctionnelle en production, données de démonstration réalistes, pas encore d'utilisation par un effectif réel à ce jour.
