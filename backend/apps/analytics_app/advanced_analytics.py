"""
Analyses avancées et prédictions pour le tableau de bord
"""
from django.conf import settings
from django.db.models import Avg, Count, Q, F, Sum
from django.utils import timezone
from datetime import timedelta
from apps.people.models import Student
from apps.enrollment.models import AdminEnrollment, PedaEnrollment
from apps.evaluation.models import SemesterResult, Grade
from apps.attendance.models import AttendanceRecord
from apps.lms.models import StudentProgress, AssignmentSubmission
from .models import EngagementScore

DEFAULT_PREDICTION_WEIGHTS = {
    'avg_grade': 0.4, 'attendance_rate': 0.3, 'engagement': 0.2, 'completion': 0.1,
}


def get_prediction_weights():
    """
    Poids du score prédictif — surchargeables via settings.PREDICTION_WEIGHTS
    (ex: après une calibration avec calibrate_prediction_weights()) sans
    toucher au code. Retombe sur les poids par défaut si absent/incomplet.
    """
    weights = dict(DEFAULT_PREDICTION_WEIGHTS)
    weights.update(getattr(settings, 'PREDICTION_WEIGHTS', {}) or {})
    total = sum(weights.values()) or 1
    return {k: v / total for k, v in weights.items()}  # toujours normalisé à somme=1


def _compute_raw_indicators(student):
    """
    Calcule les 4 indicateurs bruts d'un étudiant, chacun ramené sur une
    échelle 0-100 (les notes sont notées sur 20 dans TIRAHOU). Factorisé
    pour être réutilisé par predict_student_success() et par
    calibrate_prediction_weights().
    """
    avg_grade_20 = Grade.objects.filter(
        student=student, status='publiee'
    ).aggregate(avg=Avg('final_grade'))['avg'] or 0
    avg_grade = float(avg_grade_20) * 5

    total_records = AttendanceRecord.objects.filter(student=student).count()
    attendance_rate = (
        AttendanceRecord.objects.filter(student=student, status='present').count()
        / max(total_records, 1) * 100
    )

    engagement = float(EngagementScore.objects.filter(
        student=student
    ).aggregate(avg=Avg('engagement_score'))['avg'] or 0)

    completion = float(StudentProgress.objects.filter(
        student=student
    ).aggregate(avg=Avg('completion_rate'))['avg'] or 0)

    return {
        'avg_grade_20': float(avg_grade_20),
        'avg_grade': avg_grade,
        'attendance_rate': attendance_rate,
        'engagement': engagement,
        'completion': completion,
    }


def predict_student_success(student_id):
    """
    Prédiction de réussite basée sur plusieurs indicateurs, combinés en un
    score sur 100 par une moyenne pondérée (voir PREDICTION_WEIGHTS dans les
    settings pour la pondération et docs/GUIDE_JURY_FONCTIONNALITES.md pour
    la méthodologie de calibration).
    """
    try:
        student = Student.objects.get(id=student_id)
        ind = _compute_raw_indicators(student)
        avg_grade_20, avg_grade = ind['avg_grade_20'], ind['avg_grade']
        attendance_rate, engagement, completion = ind['attendance_rate'], ind['engagement'], ind['completion']

        # Score prédictif (moyenne pondérée, poids configurables via
        # settings.PREDICTION_WEIGHTS — voir calibrate_prediction_weights()
        # pour une validation empirique sur les données disponibles).
        weights = get_prediction_weights()
        prediction_score = (
            avg_grade * weights['avg_grade'] +
            attendance_rate * weights['attendance_rate'] +
            engagement * weights['engagement'] +
            completion * weights['completion']
        )

        # Classification
        if prediction_score >= 75:
            risk_level = 'faible'
            success_probability = 'Élevée (>80%)'
        elif prediction_score >= 60:
            risk_level = 'moyen'
            success_probability = 'Moyenne (60-80%)'
        elif prediction_score >= 45:
            risk_level = 'eleve'
            success_probability = 'Faible (40-60%)'
        else:
            risk_level = 'critique'
            success_probability = 'Très faible (<40%)'
        
        return {
            'student_id': student_id,
            'prediction_score': round(prediction_score, 2),
            'risk_level': risk_level,
            'success_probability': success_probability,
            'indicators': {
                'avg_grade': round(float(avg_grade_20), 2),
                'attendance_rate': round(attendance_rate, 2),
                'engagement_score': round(engagement, 2),
                'completion_rate': round(completion, 2),
            }
        }
    except Student.DoesNotExist:
        return None


def get_cohort_analysis(academic_year_id=None):
    """Analyse comparative des cohortes"""
    qs = AdminEnrollment.objects.filter(status='validee')
    if academic_year_id:
        qs = qs.filter(academic_year_id=academic_year_id)
    
    return {
        'total_enrolled': qs.count(),
        'by_program': list(qs.values('program__name').annotate(count=Count('id')).order_by('-count')[:10]),
        'by_level': list(qs.values('level').annotate(count=Count('id'))),
        'retention_rate': _calculate_retention_rate(academic_year_id),
        'graduation_rate': _calculate_graduation_rate(academic_year_id),
    }


def _calculate_retention_rate(academic_year_id):
    """Taux de rétention (étudiants qui continuent)"""
    if not academic_year_id:
        return 0
    
    current_students = AdminEnrollment.objects.filter(
        academic_year_id=academic_year_id, status='validee'
    ).count()
    
    # Étudiants de l'année précédente
    from apps.academic.models import AcademicYear
    try:
        current_year = AcademicYear.objects.get(id=academic_year_id)
        previous_year = AcademicYear.objects.filter(
            start_date__lt=current_year.start_date
        ).order_by('-start_date').first()
        
        if previous_year:
            previous_students = AdminEnrollment.objects.filter(
                academic_year=previous_year, status='validee'
            ).count()
            
            if previous_students > 0:
                return round((current_students / previous_students) * 100, 2)
    except:
        pass
    
    return 0


def _calculate_graduation_rate(academic_year_id):
    """Taux de diplomation"""
    if not academic_year_id:
        return 0
    
    graduated = SemesterResult.objects.filter(
        academic_year_id=academic_year_id,
        decision__in=['admis', 'admis_avec_mention']
    ).count()
    
    total = SemesterResult.objects.filter(
        academic_year_id=academic_year_id
    ).count()
    
    return round((graduated / max(total, 1)) * 100, 2)


def get_performance_trends(days=30):
    """Tendances de performance sur N jours"""
    since = timezone.now() - timedelta(days=days)
    
    # Évolution des notes
    grades_trend = Grade.objects.filter(
        created_at__gte=since
    ).extra(
        select={'day': 'date(created_at)'}
    ).values('day').annotate(
        avg_score=Avg('score'),
        count=Count('id')
    ).order_by('day')
    
    # Évolution de l'assiduité
    attendance_trend = AttendanceRecord.objects.filter(
        created_at__gte=since
    ).extra(
        select={'day': 'date(created_at)'}
    ).values('day').annotate(
        present=Count('id', filter=Q(status='present')),
        total=Count('id')
    ).order_by('day')
    
    # Évolution engagement LMS
    lms_trend = StudentProgress.objects.filter(
        updated_at__gte=since
    ).extra(
        select={'day': 'date(updated_at)'}
    ).values('day').annotate(
        avg_completion=Avg('completion_rate')
    ).order_by('day')
    
    return {
        'grades': list(grades_trend),
        'attendance': list(attendance_trend),
        'lms_engagement': list(lms_trend),
    }


def get_top_performers(limit=10):
    """Top étudiants par performance globale"""
    students = Student.objects.filter(is_active=True).annotate(
        avg_grade=Avg('admin_enrollments__peda_enrollments__grades__score'),
        attendance_count=Count('attendance_records', filter=Q(attendance_records__status='present')),
        engagement_avg=Avg('engagement_scores__engagement_score')
    ).order_by('-avg_grade')[:limit]
    
    return [{
        'id': s.id,
        'name': s.user.get_full_name(),
        'student_id': s.student_id,
        'avg_grade': round(s.avg_grade or 0, 2),
        'attendance_count': s.attendance_count,
        'engagement_score': round(s.engagement_avg or 0, 2),
    } for s in students]


def get_at_risk_students_detailed():
    """Liste détaillée des étudiants à risque avec recommandations"""
    at_risk = EngagementScore.objects.filter(
        dropout_risk__in=['eleve', 'critique']
    ).select_related('student', 'course_space').order_by('-dropout_risk', 'engagement_score')
    
    results = []
    for score in at_risk:
        # Analyse détaillée
        student = score.student
        
        # Dernière connexion
        last_activity = student.learning_activities.order_by('-timestamp').first()
        days_inactive = (timezone.now() - last_activity.timestamp).days if last_activity else 999
        
        # Recommandations
        recommendations = []
        if score.connection_count < 5:
            recommendations.append("Faible fréquence de connexion")
        if score.completion_rate < 30:
            recommendations.append("Taux de complétion très faible")
        if score.assignments_submitted == 0:
            recommendations.append("Aucun devoir soumis")
        if days_inactive > 7:
            recommendations.append(f"Inactif depuis {days_inactive} jours")
        
        results.append({
            'student_id': student.id,
            'student_name': student.user.get_full_name(),
            'student_number': student.student_id,
            'course': score.course_space.title,
            'risk_level': score.dropout_risk,
            'engagement_score': float(score.engagement_score),
            'completion_rate': float(score.completion_rate),
            'days_inactive': days_inactive,
            'recommendations': recommendations,
            'contact_email': student.user.email,
        })

    return results


def _pearson_correlation(xs, ys):
    """Corrélation de Pearson en Python pur (évite une dépendance numpy en prod)."""
    n = len(xs)
    if n < 2:
        return 0.0
    mean_x, mean_y = sum(xs) / n, sum(ys) / n
    cov = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    var_x = sum((x - mean_x) ** 2 for x in xs)
    var_y = sum((y - mean_y) ** 2 for y in ys)
    denom = (var_x * var_y) ** 0.5
    return cov / denom if denom else 0.0


def calibrate_prediction_weights(min_samples=5):
    """
    Calibration empirique des poids du score prédictif à partir des
    résultats semestriels réellement publiés (SemesterResult.decision) :
    corrèle chaque indicateur brut avec l'issue réelle (admis=1 / autre=0),
    puis propose des poids proportionnels à la force de corrélation absolue
    de chaque indicateur — une méthode simple et explicable, adaptée à un
    jeu de données limité, plutôt qu'un modèle ML nécessitant beaucoup plus
    de données pour être fiable.

    Ne modifie rien automatiquement : retourne un rapport (poids actuels vs
    poids proposés, exactitude de classification simulée pour les deux) à
    valider avant de les recopier dans settings.PREDICTION_WEIGHTS. Prévu
    pour être ré-exécuté périodiquement une fois des données réelles
    accumulées en production.
    """
    results = SemesterResult.objects.filter(published=True).select_related('student')
    samples = []
    for r in results:
        ind = _compute_raw_indicators(r.student)
        outcome = 1 if r.decision == 'admis' else 0
        samples.append((ind, outcome))

    if len(samples) < min_samples:
        return {
            'status': 'donnees_insuffisantes',
            'samples': len(samples),
            'min_requis': min_samples,
            'message': (
                "Pas assez de résultats semestriels publiés pour calibrer "
                "statistiquement les poids. Conserve les poids par défaut."
            ),
            'current_weights': get_prediction_weights(),
        }

    keys = ['avg_grade', 'attendance_rate', 'engagement', 'completion']
    outcomes = [o for _, o in samples]
    correlations = {}
    for k in keys:
        values = [ind[k] for ind, _ in samples]
        correlations[k] = _pearson_correlation(values, outcomes)

    abs_total = sum(abs(v) for v in correlations.values()) or 1
    proposed_weights = {k: round(abs(v) / abs_total, 3) for k, v in correlations.items()}

    def accuracy_for(weights):
        correct = 0
        for ind, outcome in samples:
            score = sum(ind[k] * weights[k] for k in keys)
            predicted = 1 if score >= 60 else 0
            correct += int(predicted == outcome)
        return round(correct / len(samples) * 100, 1)

    return {
        'status': 'ok',
        'samples': len(samples),
        'correlations': {k: round(v, 3) for k, v in correlations.items()},
        'current_weights': get_prediction_weights(),
        'current_weights_accuracy_pct': accuracy_for(get_prediction_weights()),
        'proposed_weights': proposed_weights,
        'proposed_weights_accuracy_pct': accuracy_for(proposed_weights),
        'note': (
            "Corrélation calculée sur les données de démonstration seedées "
            "(échantillon limité, en partie synthétique) — à ré-exécuter "
            "après accumulation de données réelles en production avant "
            "d'ajuster settings.PREDICTION_WEIGHTS."
        ),
    }
