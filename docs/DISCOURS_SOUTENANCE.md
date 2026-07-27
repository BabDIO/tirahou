# Discours de soutenance — TIRAHOU

**Étudiant :** Ali Bréhima Cissé
**Établissement :** Institut Privé Africain de Technologies et de Management (IPTMA)
**Filière :** Ingénierie Logiciel et Systèmes d'Information — Master 2
**Directeur de mémoire :** Pr Oumar MAIGA
**Thème officiel :** *Conception et développement d'un Système Intégré de Gestion d'Université Virtuelle Hybride*

> Ce discours suit exactement la structure de `TIRAHOU_Soutenance_Ali_Cisse.pptx` (25 slides utiles + annexes). Chaque section correspond à un ou plusieurs slides, indiqués entre crochets. Durée visée : 18–20 minutes hors questions. Le texte est écrit pour être **dit**, pas lu mot à mot — appuyez-vous dessus, ne le récitez pas.
>
> Révision : ce document intègre les éléments officiels du mémoire écrit (page de garde, remerciements, résumé, chapitre 1 et 2) — titre exact du thème, nom correct de l'établissement, formulation précise de la problématique et de l'état de l'art. Une incohérence à trancher vous-même avant la soutenance : le mémoire écrit (chapitre 1) liste **6 objectifs spécifiques**, alors que le PPTX (slide 22, chiffres clés) mentionne **8 objectifs (OS1 à OS8)** tirés d'un cahier de recette. J'ai gardé ici la formulation à 6 objectifs, alignée sur le document écrit — à vous de corriger le slide 22 en conséquence si vous confirmez que 6 est le bon chiffre.

---

## Ouverture (avant le slide 1)

*Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux.*

Monsieur le Président du jury, Mesdames et Messieurs les membres du jury, Monsieur mon Directeur de mémoire, Professeur Oumar Maïga, Mesdames et Messieurs,

Bonjour.

C'est avec un réel honneur, et une certaine émotion, que je me présente devant vous afin d'exposer les résultats de mon mémoire de fin d'études de Master 2 en Ingénierie Logiciel et Systèmes d'Information, intitulé :

**« Conception et développement d'un Système Intégré de Gestion d'Université Virtuelle Hybride »** — un système que j'ai baptisé **TIRAHOU**.

Avant de commencer, je tiens à remercier Allah pour la santé, la force et la persévérance qu'Il m'a accordées tout au long de ce travail. J'adresse également mes sincères remerciements à mon encadreur, le Professeur Oumar Maïga, pour son accompagnement scientifique, ses conseils avisés et sa disponibilité, ainsi qu'à l'ensemble du corps professoral de l'IPTMA pour la qualité de la formation reçue durant ce cursus. Je remercie enfin les honorables membres du jury pour le temps qu'ils consacrent à l'évaluation de ce travail.

Au cours de cette présentation, je vais successivement présenter le contexte, la problématique, les objectifs et la méthodologie de ce travail, avant de faire un état de l'art des solutions existantes, de détailler la conception et l'architecture du système, sa réalisation concrète, les résultats des tests menés, puis de conclure sur les limites et les perspectives d'évolution de ce projet.

---

## Slide 1 — Page de garde

Permettez-moi d'abord de préciser ce que recouvre exactement ce thème. Le sous-titre « Université Virtuelle Hybride » n'est pas un simple habillage : il désigne un établissement dont le fonctionnement pédagogique combine, de façon structurelle, l'enseignement présentiel classique et des modalités distancielles — cours en ligne, classes virtuelles, ressources numériques. C'est ce modèle hybride, plus exigeant à modéliser qu'une université purement présentielle, qui a servi de cas d'étude concret à la conception de TIRAHOU. Tout ce que je vais vous présenter aujourd'hui — le code, les données, la démonstration — est fonctionnel et accessible en ligne, pas simulé pour l'occasion.

## Slide 2 — Sommaire

Ma présentation s'articule en six chapitres, qui reprennent la structure de mon mémoire écrit : le cadre introductif, l'état de l'art et le cadre théorique, l'analyse et la conception du système, sa réalisation technique, les résultats de validation, et enfin une conclusion sur les limites et perspectives.

---

## CHAPITRE 1 · INTRODUCTION

### Slide 3 — Contexte : une gestion universitaire fragmentée

L'adoption du système Licence-Master-Doctorat, combinée à l'augmentation constante des effectifs étudiants, a profondément transformé le fonctionnement des établissements d'enseignement supérieur. Pourtant, de nombreuses institutions continuent de s'appuyer sur des tableurs Excel, des documents Word et des procédures papier pour gérer les inscriptions, les évaluations et les délibérations. Cette fragmentation des données favorise les erreurs de traitement, allonge les délais administratifs et limite la traçabilité des opérations. La transformation numérique de ces processus s'impose donc comme une nécessité, pour améliorer la fiabilité des parcours académiques, optimiser les performances administratives et renforcer le pilotage des établissements.

### Slide 4 — Problématique

La question centrale qui guide ce travail est la suivante : **comment concevoir et développer un système d'information universitaire intégré, capable de modéliser les spécificités du système LMD francophone et les contraintes locales, tout en garantissant la cohérence des données, la sécurité des accès et la performance d'une architecture web moderne ?**

De cette problématique découlent quatre sous-questions techniques et métier précises. Comment modéliser de manière générique la structure académique LMD — unités d'enseignement, éléments constitutifs, crédits, compensation — pour qu'elle s'adapte à différents établissements ? Comment garantir l'intégrité transactionnelle entre des modules fortement interdépendants, comme la finance, l'inscription et l'évaluation, où la validation de l'un conditionne l'accès à l'autre ? Comment implémenter un contrôle d'accès fin, adapté à la diversité des acteurs universitaires, sans dégrader l'expérience utilisateur ? Et enfin, dans quelle mesure les traces comportementales laissées sur la plateforme permettent-elles d'élaborer un indicateur prédictif du décrochage scolaire ?

### Slide 5 — Objectifs du projet

L'objectif général est de concevoir et développer TIRAHOU, une plateforme fullstack couvrant l'intégralité du cycle de vie étudiant, de la candidature à la diplomation. Cet objectif général se décline en six objectifs spécifiques : modéliser la structure académique LMD et ses règles de gestion, notamment la compensation et la capitalisation des crédits ; automatiser les workflows d'admission et d'inscription administrative et pédagogique ; intégrer un module financier adapté à la monnaie locale et aux modes de paiement régionaux comme le mobile money ; déployer un campus numérique couplé aux modules d'évaluation et de présence ; concevoir un système de sécurité à treize niveaux de rôles avec journalisation d'audit ; et enfin implémenter un module d'analytics capable de calculer un score d'engagement étudiant et un indicateur de risque de décrochage. Je reviendrai avec les chiffres à l'appui sur le taux de réalisation de ces objectifs.

### Slide 6 — Méthodologie de conception et de développement

Pour mener ce projet, j'ai adopté une démarche itérative fondée sur les principes de la programmation orientée objet. L'analyse des besoins s'est appuyée sur l'étude des processus de gestion académique des établissements d'enseignement supérieur, complétée par une modélisation UML — diagrammes de cas d'utilisation, de classes et de séquence. Le développement a ensuite été réalisé de façon incrémentale, module par module, chaque fonctionnalité étant immédiatement testée avant de passer à la suivante, afin de détecter tôt toute incohérence entre la conception et les besoins réels plutôt que de la laisser se propager dans les modules suivants.

---

## CHAPITRE 2 · ÉTAT DE L'ART ET CHOIX TECHNOLOGIQUES

### Slide 7 — Solutions existantes : pourquoi une solution locale ?

J'ai comparé TIRAHOU à quatre familles de solutions existantes, sur des critères précis. Les ERP propriétaires internationaux, comme Banner ou PeopleSoft, sont extrêmement complets mais souffrent de coûts de licence prohibitifs, d'une interface peu localisée, et d'une conception centrée sur le système de crédits nord-américain, qui s'aligne mal avec les règles de compensation du LMD francophone. Les solutions open source comme OpenEduCat ou le module Education d'ERPNext offrent une base intéressante, mais ne gèrent pas nativement la complexité du LMD — jury de délibération, capitalisation des crédits — et peinent à intégrer un LMS moderne ou des classes virtuelles hybrides. Moodle, de son côté, excelle comme LMS mais ne couvre aucune dimension administrative ou financière. Sur l'ensemble de ces critères — gestion native du LMD, intégration administrative, LMS natif, classes virtuelles hybrides, analytics prédictif, vérification de documents par QR code — TIRAHOU est la seule solution du comparatif à couvrir la totalité, avec un coût d'acquisition faible puisqu'il s'agit d'un développement propre. C'est ce constat qui justifie une solution pensée et développée localement.

### Slide 8 — Choix technologiques — Backend

Pour la partie serveur, j'ai retenu Django 5.2 et Django REST Framework, en Python. Ce choix se justifie par la maturité de l'ORM Django, capable de gérer des relations complexes entre les tables, et par ses mécanismes de sécurité natifs contre les injections SQL, le CSRF et le XSS. J'ai couplé cela à PostgreSQL comme système de gestion de base de données, notamment parce qu'il offre nativement des mécanismes de sécurité avancés — j'y reviendrai dans la partie sécurité. L'authentification repose sur des JSON Web Tokens via la bibliothèque SimpleJWT, avec des jetons d'accès de courte durée et des jetons de rafraîchissement à rotation automatique, ce qui limite les risques en cas de compromission d'un jeton. Pour les fonctionnalités temps réel, comme les notifications instantanées, j'ai intégré Django Channels, qui permet de faire cohabiter des requêtes HTTP classiques et des connexions WebSocket persistantes au sein du même serveur applicatif.

### Slide 9 — Choix technologiques — Frontend, PWA & Mobile

Côté client, j'ai construit une application web avec React 19 et TypeScript, sur un socle Vite, ce qui m'a permis de bénéficier d'un typage statique — précieux sur un projet de cette taille — et d'un outillage de développement rapide. Cette application est également configurée en Progressive Web App, une caractéristique stratégique dans le contexte ouest-africain où la connectivité mobile peut être intermittente : elle permet l'installation sur l'écran d'accueil d'un smartphone et la mise en cache des ressources statiques pour un fonctionnement partiel hors ligne. Enfin, pour une expérience mobile native complète, j'ai développé une application avec React Native et Expo, qui consomme exactement la même API backend que le web, garantissant une cohérence totale des données entre les deux canaux.

---

## CHAPITRE 3 · ANALYSE, CONCEPTION ET ARCHITECTURE

### Slide 10 — Acteurs du système — 13 profils utilisateurs

L'analyse des besoins a permis d'identifier treize rôles utilisateurs, que l'on peut regrouper en trois catégories : les acteurs internes à l'administration — super-administrateur, personnel de scolarité, personnel financier, enseignant, bibliothécaire — les acteurs directs que sont les étudiants et doctorants, et les acteurs externes, comme le candidat à une admission ou le tiers qui vérifie l'authenticité d'un document sans posséder de compte. Chacun de ces rôles dispose d'un périmètre d'action précis, contrôlé non pas uniquement côté interface, mais côté serveur.

### Slide 11 — Modélisation UML — Cas d'utilisation (vue globale)

[Montrer le diagramme] La modélisation UML a structuré l'ensemble de ma démarche de conception, avec des diagrammes de classes organisés par domaine : organisation universitaire, gouvernance, gestion des identités et de la sécurité, communauté universitaire, admissions, inscriptions, offre de formation, et ainsi de suite jusqu'aux diagrammes de séquence illustrant, par exemple, le cycle complet de saisie et de publication d'une note. Ce diagramme de cas d'utilisation en synthétise l'essentiel : chaque cas représenté ici correspond aujourd'hui à une fonctionnalité réellement implémentée et testée — je n'ai conservé dans ce diagramme final que ce qui a été effectivement réalisé, pas ce qui était initialement envisagé.

### Slide 12 — Architecture du système — 3 couches

TIRAHOU repose sur une architecture en trois couches clairement séparées. La couche de présentation, ce sont les clients — web, mobile, PWA — qui ne contiennent aucune logique métier sensible. La couche applicative, c'est l'API REST Django, qui expose plus de six cent cinquante points d'accès et centralise toutes les règles métier et tous les contrôles d'autorisation. La couche de données, enfin, c'est PostgreSQL, qui applique, comme je vais le détailler, une deuxième ligne de défense sur les données les plus sensibles. Cette séparation stricte signifie qu'un client, même compromis ou modifié par un utilisateur malveillant, ne peut jamais contourner les règles de sécurité, puisque celles-ci sont systématiquement revérifiées côté serveur.

### Slide 13 — 21 modules Django à responsabilité unique

Cette API applicative est elle-même découpée en vingt-et-un modules à responsabilité unique — académique, admissions, finance, évaluation, LMS, bibliothèque, et ainsi de suite — organisés en quatre grands domaines fonctionnels : académique, parcours étudiant, pédagogie, et support-pilotage. Ce découpage m'a permis, tout au long du développement, de faire évoluer un module sans risquer de casser les autres.

### Slide 14 — Sécurité de la plateforme

J'en viens à un point sur lequel j'ai porté une attention particulière : la sécurité. Au-delà de l'authentification par jetons JWT et du contrôle d'accès basé sur les rôles, j'ai mis en place une seconde ligne de défense au niveau même de la base de données : la Row-Level Security de PostgreSQL, sur les tables les plus sensibles — les notes et les factures. Concrètement, même si un bug applicatif venait à contourner les vérifications du code Django, la base de données elle-même refuse structurellement à un étudiant de lire une ligne appartenant à un autre étudiant. C'est une défense en profondeur, avec deux barrières indépendantes.

Je tiens aussi à mentionner une démarche qui a occupé une part importante de mon travail : au-delà de la conception initiale, j'ai mené un audit systématique de chaque fonctionnalité critique, en la testant en conditions réelles contre la plateforme déployée, et non en me limitant à une relecture du code. Cette démarche m'a permis d'identifier et de corriger, avant la mise à disposition finale, plusieurs anomalies réelles — des failles d'autorisation, des workflows de validation bloqués, des champs obligatoires jamais transmis par certains formulaires. Je considère cette rigueur de validation comme une partie intégrante de la qualité du livrable final.

---

## CHAPITRE 4 · RÉALISATION ET IMPLÉMENTATION

### Slide 15 — Interface — Tableau de bord institutionnel

[Montrer la capture d'écran] Voici le tableau de bord présenté à un administrateur institutionnel. Il centralise en un coup d'œil les indicateurs clés de l'établissement : effectifs étudiants et enseignants, taux de collecte financière, programmes actifs, activité récente du système. Chaque chiffre affiché ici est calculé en temps réel à partir de la base de données.

### Slide 16 — Interfaces — Espace étudiant & enseignant

Chaque profil dispose d'un espace personnalisé. L'étudiant y consulte ses notes, son emploi du temps, ses paiements, ses documents officiels vérifiables par QR code. L'enseignant y gère ses cours, saisit les notes de ses étudiants, suit les présences par créneau.

### Slide 17 — Fonctionnalité phare — Évaluation & délibérations LMD

La gestion des évaluations est le cœur métier le plus délicat de ce projet, parce qu'elle doit refléter fidèlement les règles du LMD. Le calcul de la note finale d'un élément constitutif suit une formule pondérée entre contrôle continu et examen, avec bonus et pénalités éventuels ; en cas d'absence à l'examen, la note finale est automatiquement ramenée à zéro. Une unité d'enseignement est validée, et donc définitivement capitalisée, si sa moyenne pondérée atteint dix sur vingt ; si le règlement pédagogique le permet, une note comprise entre huit et dix peut être compensée par une autre unité d'enseignement du même semestre. Chaque étape de ce workflow — saisie, validation, contestation éventuelle, publication — est tracée et contrôlée par les permissions appropriées.

### Slide 18 — Fonctionnalité phare — Analytics prédictif

TIRAHOU intègre un module d'analyse prédictive qui calcule, pour chaque étudiant, un score d'engagement et un indicateur de risque de décrochage, à partir de quatre indicateurs pondérés : la moyenne générale, le taux d'assiduité, l'engagement sur la plateforme pédagogique, et le taux de complétion des activités. Je précise, en toute transparence, que ce modèle repose sur une approche heuristique — une pondération de règles calibrée empiriquement sur les données disponibles — et non sur un apprentissage automatique supervisé au sens strict ; j'y reviendrai dans les limites de ce travail. Il permet néanmoins au responsable pédagogique d'identifier précocement les étudiants en difficulté.

### Slide 19 — Fonctionnalité phare — Campus numérique & présences

La plateforme intègre un campus numérique complet — espaces de cours, ressources pédagogiques, devoirs, quiz — un système de classes virtuelles compatible avec plusieurs fournisseurs de visioconférence, et un système de présences par QR code qui fusionne automatiquement la présence physique et la présence en ligne pour les séances en mode hybride, en un seul et même registre — cohérent avec le modèle d'université hybride qui est le cas d'étude de ce mémoire.

### Slide 20 — Application mobile TIRAHOU

Enfin, l'application mobile, développée en React Native, permet aux étudiants et enseignants d'accéder aux fonctionnalités essentielles depuis leur smartphone, avec des notifications poussées en temps réel via connexion WebSocket et reconnexion automatique en cas de perte de réseau — un point important dans ce contexte de connectivité parfois instable.

---

## CHAPITRE 5 · TESTS ET VALIDATION

### Slide 21 — Tests et validation

La fiabilité de TIRAHOU repose sur plusieurs niveaux de validation complémentaires : une suite de tests unitaires et d'intégration automatisés côté backend, une suite de tests de bout en bout avec Playwright simulant un vrai parcours utilisateur dans un navigateur, un test de charge avec des utilisateurs simulés en parallèle, et surtout, comme je l'évoquais, un audit systématique de chaque fonctionnalité critique testée directement contre la plateforme déployée.

### Slide 22 — Chiffres clés du projet

TIRAHOU, c'est aujourd'hui vingt-et-une applications Django, plus de quatre-vingt-dix modèles de données, plus de cent-huit tables en base, plus de six cent cinquante points d'accès API REST, plus de soixante-dix-huit pages côté frontend, au service de treize rôles utilisateurs différents. Sur le plan fonctionnel, mon cahier de recette affiche un taux de couverture de seize domaines fonctionnels sur seize, soit cent pour cent.

### Slide 23 — Déploiement en production

TIRAHOU n'est pas resté un prototype de démonstration locale : la plateforme est déployée et accessible en ligne, avec un backend hébergé sur Render et un frontend sur Vercel, une base de données PostgreSQL de production, et un pipeline de déploiement automatisé. C'est précisément cette exposition réelle qui m'a permis de mener la démarche de validation rigoureuse dont je parlais à l'instant.

---

## CHAPITRE 6 · CONCLUSION

### Slide 24 — Limites actuelles & perspectives d'évolution

Aucun projet n'est parfait, et je préfère vous présenter ces limites moi-même. Sur le plan technique, la scalabilité n'a été testée qu'à une échelle limitée, et le modèle prédictif repose sur des règles pondérées plutôt que sur un apprentissage automatique supervisé. Sur le plan fonctionnel, l'architecture multi-établissements a fait l'objet d'une note de conception détaillée, mais n'a pas été implémentée dans le temps imparti — un choix assumé plutôt qu'un oubli. Pour la suite, je vois trois horizons : à court terme, recalibrer le modèle prédictif sur des données réelles de production ; à moyen terme, l'architecture multi-établissements, un module de ressources humaines et paie, et le support des standards SCORM et xAPI ; à plus long terme, une intelligence artificielle plus avancée et une ouverture de l'API à d'autres établissements partenaires.

### Slide 25 — Conclusion

Pour conclure, ce travail démontre qu'il est possible de concevoir une plateforme universitaire complète, moderne et adaptée aux besoins des établissements utilisant le système LMD. TIRAHOU ne constitue pas seulement une application de gestion de la scolarité : c'est un véritable ERP universitaire intégrant les dimensions académiques, pédagogiques, financières, analytiques et administratives dans une seule plateforme cohérente, fonctionnelle et déployée — pas une simple maquette. Ce projet m'a permis de mettre en pratique la modélisation UML, l'architecture logicielle, le développement fullstack, la cybersécurité, l'administration des bases de données, le déploiement cloud, et les méthodes modernes de développement logiciel acquises durant mon parcours de Master.

Je remercie encore une fois mon Directeur de mémoire, le Professeur Oumar Maïga, pour son encadrement, ainsi que ma mère, dont le soutien constant a rendu ce parcours possible. Je vous remercie de votre attention, et je me tiens à présent à votre entière disposition pour vos questions et remarques.

---

## Notes pour la démonstration live (si prévue après le discours)

- Se connecter successivement avec 2-3 comptes de rôles différents (admin, enseignant, étudiant) pour montrer la personnalisation des espaces.
- Montrer un cas concret : saisie d'une note par l'enseignant → apparition immédiate dans l'espace étudiant.
- Montrer la vérification publique d'un document par QR code (sans connexion), pour illustrer la sécurité et l'ouverture contrôlée du système.
- Si le jury pose une question technique pointue à laquelle vous n'êtes pas sûr, préférez répondre « je peux vérifier ce point précis et vous répondre » plutôt que d'improviser une réponse incertaine.

## Anticiper les questions probables du jury

- **« Pourquoi ne pas avoir utilisé [tel autre framework] ? »** → Renvoyer au tableau comparatif du chapitre 2 : Django impose une structure qui convient à un projet modulaire de vingt-et-un modules ; d'autres choix étaient possibles mais celui-ci répondait mieux aux contraintes de maintenabilité et de sécurité native.
- **« Comment garantissez-vous qu'un étudiant ne voit pas les notes d'un autre ? »** → Contrôle applicatif par rôle ET Row-Level Security PostgreSQL en seconde ligne — deux mécanismes indépendants.
- **« Le modèle prédictif est-il de l'intelligence artificielle ? »** → Être honnête : une approche heuristique, une pondération de règles calibrée, pas un modèle d'apprentissage supervisé — c'est explicitement listé dans les limites.
- **« Le système est-il vraiment utilisé par un établissement ? »** → Plateforme déployée et fonctionnelle en production, données de démonstration réalistes, pas encore d'utilisation par un effectif réel à ce jour.
- **« Pourquoi le sous-titre "Université Virtuelle Hybride" ? »** → C'est le cas d'étude retenu : un établissement dont le fonctionnement pédagogique mêle structurellement présentiel et distanciel, ce qui impose des exigences de modélisation plus riches (fusion des présences physique/en ligne, classes virtuelles multi-fournisseurs) qu'une université purement présentielle.
