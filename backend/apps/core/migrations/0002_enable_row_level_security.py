"""
Active PostgreSQL Row-Level Security sur les tables grades/invoices — voir
apps/core/rls.py pour le contexte complet. N'a d'effet que sur PostgreSQL ;
no-op silencieux sur les autres moteurs (SQLite en développement local),
pour ne jamais casser l'environnement de développement.
"""
from django.db import migrations

RLS_TABLES = ['grades', 'invoices']

POLICY_SQL = """
    current_setting('app.is_staff', true) = 'true'
    OR student_id::text = current_setting('app.current_student_id', true)
"""


def enable_rls(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    with schema_editor.connection.cursor() as cursor:
        for table in RLS_TABLES:
            cursor.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
            cursor.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
            cursor.execute(f"DROP POLICY IF EXISTS {table}_student_isolation ON {table}")
            cursor.execute(f"CREATE POLICY {table}_student_isolation ON {table} USING ({POLICY_SQL})")


def disable_rls(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    with schema_editor.connection.cursor() as cursor:
        for table in RLS_TABLES:
            cursor.execute(f"DROP POLICY IF EXISTS {table}_student_isolation ON {table}")
            cursor.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY")
            cursor.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
        ('evaluation', '0001_initial'),
        ('finance', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(enable_rls, reverse_code=disable_rls),
    ]
