"""
`python manage.py test` sans argument découvre 0 test sur cette machine
alors que `python manage.py test apps` en trouve des dizaines — un
`test_labels=None` fait discover() partir de `start_dir='.'`
(le dossier backend/), et la résolution de chemin qui en découle
(abspath('.') vs top_level_dir recalculé) échoue silencieusement dans
cet environnement plutôt que de lever une erreur. `apps` est un vrai
package Python importable, ce qui contourne entièrement cette
résolution par chemin.

Ce runner ne change qu'une chose : quand aucun label n'est fourni sur la
ligne de commande, il découvre depuis `apps` plutôt que depuis `.` — pour
qu'un simple `python manage.py test` fonctionne pour n'importe qui,
sans avoir à connaître ce contournement.
"""
from django.test.runner import DiscoverRunner


class TirahouTestRunner(DiscoverRunner):
    def build_suite(self, test_labels=None, **kwargs):
        if not test_labels:
            test_labels = ['apps']
        return super().build_suite(test_labels, **kwargs)
