from django.core.management.base import BaseCommand
from apps.analytics_app.advanced_analytics import calibrate_prediction_weights


class Command(BaseCommand):
    help = (
        "Calibre empiriquement les poids du score prédictif de réussite en les "
        "corrélant aux résultats semestriels réellement publiés. N'écrit rien "
        "automatiquement — affiche un rapport à valider avant de recopier les "
        "poids proposés dans settings.PREDICTION_WEIGHTS."
    )

    def handle(self, *args, **options):
        report = calibrate_prediction_weights()

        if report['status'] == 'donnees_insuffisantes':
            self.stdout.write(self.style.WARNING(report['message']))
            self.stdout.write(f"  Échantillons disponibles : {report['samples']} (minimum {report['min_requis']})")
            return

        self.stdout.write(self.style.SUCCESS(f"Calibration sur {report['samples']} résultat(s) semestriel(s) publié(s)"))
        self.stdout.write("")
        self.stdout.write("Corrélation avec la réussite réelle (décision = 'admis') :")
        for k, v in report['correlations'].items():
            self.stdout.write(f"  {k:<18} {v:+.3f}")
        self.stdout.write("")
        self.stdout.write(f"Poids actuels             : {report['current_weights']}")
        self.stdout.write(f"  -> exactitude simulée   : {report['current_weights_accuracy_pct']}%")
        self.stdout.write(f"Poids proposés (calibrés) : {report['proposed_weights']}")
        self.stdout.write(f"  -> exactitude simulée   : {report['proposed_weights_accuracy_pct']}%")
        self.stdout.write("")
        self.stdout.write(self.style.NOTICE(report['note']))
