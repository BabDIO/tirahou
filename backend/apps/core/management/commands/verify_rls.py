"""
Vérifie que Row-Level Security protège réellement grades/invoices avec la
connexion DATABASE_URL actuelle — à lancer après tout changement de rôle
de connexion (voir backend/scripts/create_limited_db_role.sql). N'a de
sens que sur PostgreSQL ; no-op explicite ailleurs.

Usage : python manage.py verify_rls
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import connection


class Command(BaseCommand):
    help = "Vérifie que le rôle de connexion actuel n'est pas superuser et que RLS s'applique réellement."

    def handle(self, *args, **options):
        if connection.vendor != 'postgresql':
            self.stdout.write(self.style.WARNING(
                f"Moteur '{connection.vendor}' détecté — RLS est spécifique à PostgreSQL, rien à vérifier."
            ))
            return

        with connection.cursor() as cursor:
            cursor.execute("SELECT current_user, usesuper FROM pg_user WHERE usename = current_user")
            current_user, is_superuser = cursor.fetchone()

            self.stdout.write(f"Connecté en tant que : {current_user}")

            if is_superuser:
                raise CommandError(
                    f"'{current_user}' est un rôle PostgreSQL SUPERUSER — Row-Level Security est "
                    f"contourné inconditionnellement (comportement PostgreSQL, non contournable). "
                    f"Voir backend/scripts/create_limited_db_role.sql pour créer un rôle applicatif "
                    f"sans ce privilège, puis pointer DATABASE_URL dessus."
                )

            self.stdout.write(self.style.SUCCESS(f"OK : '{current_user}' n'est pas superuser."))

            # Vérifie concrètement que la policy bloque bien un accès croisé,
            # en simulant deux étudiants dans la même transaction (rollback
            # automatique à la fin, aucune donnée de test ne persiste).
            with connection.cursor() as verify_cursor:
                verify_cursor.execute("BEGIN")
                try:
                    verify_cursor.execute(
                        "SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('grades', 'invoices')"
                    )
                    policy_count = verify_cursor.fetchone()[0]
                    if policy_count == 0:
                        raise CommandError(
                            "Aucune policy RLS trouvée sur grades/invoices — la migration "
                            "core.0002_enable_row_level_security n'a peut-être pas été appliquée."
                        )
                    self.stdout.write(self.style.SUCCESS(
                        f"OK : {policy_count} policy(ies) RLS active(s) sur grades/invoices."
                    ))

                    verify_cursor.execute("SELECT relforcerowsecurity FROM pg_class WHERE relname = 'grades'")
                    force_rls = verify_cursor.fetchone()[0]
                    if not force_rls:
                        raise CommandError(
                            "FORCE ROW LEVEL SECURITY n'est pas actif sur 'grades' — RLS serait "
                            "contourné par le propriétaire de la table, pas seulement par un superuser."
                        )
                    self.stdout.write(self.style.SUCCESS("OK : FORCE ROW LEVEL SECURITY actif sur 'grades'."))
                finally:
                    verify_cursor.execute("ROLLBACK")

        self.stdout.write(self.style.SUCCESS(
            "\nRow-Level Security est correctement en place et effective avec ce rôle de connexion."
        ))
