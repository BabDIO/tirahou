"""
Module d'analytics avancé pour les évaluations
==============================================

Fournit des analyses statistiques approfondies :
- Distributions de notes
- Corrélations CC/Examen
- Prédictions de réussite
- Comparaisons inter-cohortes
- Détection d'anomalies

@author: TIRAHOU
@version: 1.2.0
"""
from django.db.models import Avg, Count, StdDev, Q, F
from django.core.cache import cache
from decimal import Decimal
from typing import Dict, List, Optional
import statistics
from .models import Grade, UEResult, SemesterResult
from apps.programs.models import EC, UE, Semester
from apps.people.models import Student


class GradeAnalytics:
    """Analyses statistiques avancées des notes"""
    
    @staticmethod
    def get_distribution(ec: EC, exam_session) -> Dict:
        """
        Calcule la distribution des notes pour un EC.
        
        Returns:
            Dict avec quartiles, distribution, écart-type
        """
        grades = Grade.objects.filter(
            ec=ec, 
            exam_session=exam_session,
            is_absent=False,
            final_grade__isnull=False
        ).values_list('final_grade', flat=True)
        
        if not grades:
            return None
        
        grades_list = [float(g) for g in grades]
        grades_list.sort()
        
        n = len(grades_list)
        
        return {
            'count': n,
            'mean': round(statistics.mean(grades_list), 2),
            'median': round(statistics.median(grades_list), 2),
            'mode': round(statistics.mode(grades_list), 2) if n > 1 else grades_list[0],
            'std_dev': round(statistics.stdev(grades_list), 2) if n > 1 else 0,
            'variance': round(statistics.variance(grades_list), 2) if n > 1 else 0,
            'min': round(min(grades_list), 2),
            'max': round(max(grades_list), 2),
            'range': round(max(grades_list) - min(grades_list), 2),
            'q1': round(statistics.quantiles(grades_list, n=4)[0], 2) if n >= 4 else None,
            'q2': round(statistics.median(grades_list), 2),
            'q3': round(statistics.quantiles(grades_list, n=4)[2], 2) if n >= 4 else None,
            'iqr': round(statistics.quantiles(grades_list, n=4)[2] - statistics.quantiles(grades_list, n=4)[0], 2) if n >= 4 else None,
            'distribution': {
                '[0-5[': len([g for g in grades_list if g < 5]),
                '[5-10[': len([g for g in grades_list if 5 <= g < 10]),
                '[10-12[': len([g for g in grades_list if 10 <= g < 12]),
                '[12-14[': len([g for g in grades_list if 12 <= g < 14]),
                '[14-16[': len([g for g in grades_list if 14 <= g < 16]),
                '[16-20]': len([g for g in grades_list if g >= 16]),
            }
        }
    
    @staticmethod
    def calculate_correlation_cc_exam(ec: EC, exam_session) -> Optional[float]:
        """
        Calcule la corrélation entre CC et Examen.
        
        Une forte corrélation (> 0.7) indique une cohérence.
        Une faible corrélation (< 0.3) peut signaler un problème.
        
        Returns:
            Coefficient de corrélation de Pearson (-1 à 1)
        """
        grades = Grade.objects.filter(
            ec=ec,
            exam_session=exam_session,
            is_absent=False,
            cc_grade__isnull=False,
            exam_grade__isnull=False
        ).values_list('cc_grade', 'exam_grade')
        
        if len(grades) < 5:  # Minimum 5 observations
            return None
        
        cc_list = [float(g[0]) for g in grades]
        exam_list = [float(g[1]) for g in grades]
        
        try:
            correlation = statistics.correlation(cc_list, exam_list)
            return round(correlation, 3)
        except statistics.StatisticsError:
            return None
    
    @staticmethod
    def detect_outliers(ec: EC, exam_session) -> List[Dict]:
        """
        Détecte les notes aberrantes (outliers) via méthode IQR.
        
        Outlier si : note < Q1 - 1.5*IQR ou note > Q3 + 1.5*IQR
        
        Returns:
            Liste des notes aberrantes avec détails étudiant
        """
        grades = Grade.objects.filter(
            ec=ec,
            exam_session=exam_session,
            is_absent=False,
            final_grade__isnull=False
        ).select_related('student__user')
        
        if grades.count() < 10:  # Minimum 10 notes
            return []
        
        grades_list = [float(g.final_grade) for g in grades]
        
        if len(grades_list) < 4:
            return []
        
        q1 = statistics.quantiles(grades_list, n=4)[0]
        q3 = statistics.quantiles(grades_list, n=4)[2]
        iqr = q3 - q1
        
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        outliers = []
        for grade in grades:
            score = float(grade.final_grade)
            if score < lower_bound or score > upper_bound:
                outliers.append({
                    'student_id': grade.student.student_id,
                    'student_name': grade.student.user.get_full_name(),
                    'grade': score,
                    'type': 'low' if score < lower_bound else 'high',
                    'deviation': abs(score - (q1 if score < lower_bound else q3))
                })
        
        return outliers
    
    @staticmethod
    def compare_cohorts(ec: EC, current_session, previous_session) -> Dict:
        """
        Compare les performances entre deux cohortes.
        
        Returns:
            Dict avec comparaisons moyennes, taux de réussite, etc.
        """
        current = Grade.objects.filter(
            ec=ec, exam_session=current_session, is_absent=False
        ).aggregate(
            avg=Avg('final_grade'),
            count=Count('id'),
            success=Count('id', filter=Q(final_grade__gte=10))
        )
        
        previous = Grade.objects.filter(
            ec=ec, exam_session=previous_session, is_absent=False
        ).aggregate(
            avg=Avg('final_grade'),
            count=Count('id'),
            success=Count('id', filter=Q(final_grade__gte=10))
        )
        
        if not current['count'] or not previous['count']:
            return None
        
        current_avg = float(current['avg'] or 0)
        previous_avg = float(previous['avg'] or 0)
        
        current_success_rate = (current['success'] / current['count'] * 100) if current['count'] else 0
        previous_success_rate = (previous['success'] / previous['count'] * 100) if previous['count'] else 0
        
        return {
            'current': {
                'average': round(current_avg, 2),
                'count': current['count'],
                'success_rate': round(current_success_rate, 2)
            },
            'previous': {
                'average': round(previous_avg, 2),
                'count': previous['count'],
                'success_rate': round(previous_success_rate, 2)
            },
            'diff': {
                'average': round(current_avg - previous_avg, 2),
                'success_rate': round(current_success_rate - previous_success_rate, 2),
                'trend': 'improvement' if current_avg > previous_avg else 'decline'
            }
        }


class PredictiveAnalytics:
    """Analytics prédictifs pour anticiper l'échec"""
    
    @staticmethod
    def predict_failure_risk(student: Student, semester: Semester) -> Dict:
        """
        Prédit le risque d'échec d'un étudiant dans un semestre.
        
        Facteurs pris en compte :
        - Moyenne actuelle
        - Tendance des notes (amélioration/dégradation)
        - Taux d'assiduité
        - Historique passé
        
        Returns:
            Dict avec score de risque (0-100) et recommandations
        """
        risk_score = 0
        factors = []
        
        # 1. Moyenne actuelle (40%)
        ue_results = UEResult.objects.filter(
            student=student,
            ue__semester=semester
        ).aggregate(avg=Avg('average'))
        
        current_avg = float(ue_results['avg'] or 0)
        
        if current_avg < 8:
            risk_score += 40
            factors.append("Moyenne très faible")
        elif current_avg < 10:
            risk_score += 30
            factors.append("Moyenne insuffisante")
        elif current_avg < 12:
            risk_score += 15
            factors.append("Moyenne fragile")
        
        # 2. Nombre d'UE échouées (30%)
        failed_ues = UEResult.objects.filter(
            student=student,
            ue__semester=semester,
            average__lt=10
        ).count()
        
        if failed_ues >= 3:
            risk_score += 30
            factors.append(f"{failed_ues} UE échouées")
        elif failed_ues >= 2:
            risk_score += 20
            factors.append(f"{failed_ues} UE échouées")
        elif failed_ues == 1:
            risk_score += 10
            factors.append("1 UE échouée")
        
        # 3. Assiduité (20%)
        try:
            from apps.attendance.models import AttendanceRecord
            attendance = AttendanceRecord.objects.filter(
                student=student,
                session__scheduled_session__course_space__ue__semester=semester
            ).aggregate(
                total=Count('id'),
                present=Count('id', filter=Q(status='present'))
            )
            
            if attendance['total'] > 0:
                attendance_rate = (attendance['present'] / attendance['total']) * 100
                if attendance_rate < 50:
                    risk_score += 20
                    factors.append("Assiduité très faible")
                elif attendance_rate < 70:
                    risk_score += 10
                    factors.append("Assiduité insuffisante")
        except:
            pass
        
        # 4. Historique (10%)
        past_results = SemesterResult.objects.filter(
            student=student,
            decision='ajourné'
        ).count()
        
        if past_results >= 2:
            risk_score += 10
            factors.append("Historique d'échec")
        
        # Déterminer le niveau de risque
        if risk_score >= 70:
            risk_level = "critique"
            color = "red"
        elif risk_score >= 50:
            risk_level = "élevé"
            color = "orange"
        elif risk_score >= 30:
            risk_level = "modéré"
            color = "yellow"
        else:
            risk_level = "faible"
            color = "green"
        
        return {
            'risk_score': min(100, risk_score),
            'risk_level': risk_level,
            'color': color,
            'factors': factors,
            'recommendations': PredictiveAnalytics._generate_recommendations(risk_level, factors)
        }
    
    @staticmethod
    def _generate_recommendations(risk_level: str, factors: List[str]) -> List[str]:
        """Génère des recommandations personnalisées"""
        recommendations = []
        
        if risk_level in ["critique", "élevé"]:
            recommendations.append("Rencontre urgente avec le conseiller pédagogique")
            recommendations.append("Mise en place d'un tutorat personnalisé")
        
        if "Assiduité" in str(factors):
            recommendations.append("Améliorer la présence en cours")
        
        if "Moyenne" in str(factors):
            recommendations.append("Séances de rattrapage intensives")
            recommendations.append("Revoir les fondamentaux")
        
        if "UE échouées" in str(factors):
            recommendations.append("Focus sur les UE critiques")
            recommendations.append("Travaux dirigés supplémentaires")
        
        return recommendations
