"""
Row-Level Security PostgreSQL — défense en profondeur (8.31).

RLS protège spécifiquement contre la fuite de données entre étudiants sur
les tables les plus sensibles (notes, factures) : un filet de sécurité
structurel côté base de données, indépendant du code applicatif, qui
s'ajoute — sans le remplacer — au RBAC applicatif existant
(HasModulePermission, get_queryset() filtrés par rôle).

Portée volontairement ciblée : seul le cas étudiant->étudiant est isolé au
niveau SQL (étudiant A ne peut structurellement jamais lire une ligne
appartenant à l'étudiant B, même via une requête brute ou un bug de
filtrage applicatif). Les autres rôles (enseignant, personnel
administratif...) passent par le drapeau `app.is_staff`, qui lève le
filtre RLS — leur périmètre réel reste défini par le RBAC applicatif, RLS
ne fait ici qu'éviter qu'un compte étudiant compromis ou un bug de vue
n'expose les données d'un autre étudiant.

N'a d'effet que sur PostgreSQL (no-op sur SQLite en développement local) ;
nécessite que l'utilisateur de connexion Django en production NE SOIT PAS
superutilisateur PostgreSQL — un superuser contourne RLS de manière
inconditionnelle, quelle que soit la politique (comportement PostgreSQL,
non contournable). Vérifié en pratique : la plupart des hébergeurs
PostgreSQL managés (dont Render) ne fournissent jamais d'accès superuser à
l'utilisateur applicatif, ce qui est justement ce qui rend cette défense
effective.
"""
from django.db import connection

RLS_TABLES = ['grades', 'invoices']


def set_rls_context(user):
    """
    Positionne le contexte PostgreSQL (variables de session `app.*`) pour la
    durée de la transaction courante, à partir de l'utilisateur authentifié.
    Appelé par RLSAwareJWTAuthentication juste après une authentification
    JWT réussie — DRF authentifie l'utilisateur à l'intérieur du cycle de
    la requête, après le middleware Django ; c'est pourquoi ce contexte est
    positionné ici plutôt que dans un middleware classique (qui ne connaît
    pas encore l'utilisateur JWT à ce stade).

    Utilise `set_config(..., is_local=true)`, l'équivalent paramétré de
    `SET LOCAL` : la valeur ne vaut que pour la transaction ouverte par
    PostgresRLSTransactionMiddleware, jamais persistée sur la connexion
    (pas de fuite possible vers une requête suivante réutilisant la même
    connexion du pool).
    """
    if connection.vendor != 'postgresql':
        return

    student_profile = getattr(user, 'student_profile', None)
    is_staff_bypass = 'false' if student_profile is not None else 'true'
    student_id = str(student_profile.id) if student_profile is not None else ''

    with connection.cursor() as cursor:
        cursor.execute("SELECT set_config('app.current_student_id', %s, true)", [student_id])
        cursor.execute("SELECT set_config('app.is_staff', %s, true)", [is_staff_bypass])
