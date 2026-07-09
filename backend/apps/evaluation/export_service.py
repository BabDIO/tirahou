"""
Service d'export des notes et relevés
=====================================

Formats supportés :
- CSV : Export massif des notes
- Excel : Tableaux formatés avec statistiques
- PDF : Relevés officiels avec QR code
- JSON : API et intégrations

@author: TIRAHOU
@version: 1.2.0
"""
import csv
import io
from typing import List, Dict
from django.http import HttpResponse
from django.utils import timezone
from .models import Grade, SemesterResult, UEResult
from apps.people.models import Student
from apps.programs.models import EC


class ExportService:
    """Service d'export des données d'évaluation"""
    
    @staticmethod
    def export_grades_csv(grades: List[Grade]) -> HttpResponse:
        """
        Exporte des notes au format CSV.
        
        Args:
            grades: Liste des notes à exporter
            
        Returns:
            HttpResponse avec fichier CSV
        """
        output = io.StringIO()
        writer = csv.writer(output)
        
        # En-têtes
        writer.writerow([
            'Matricule',
            'Nom',
            'Prénom',
            'EC Code',
            'EC Nom',
            'CC (/20)',
            'Examen (/20)',
            'Note Finale (/20)',
            'Absent',
            'Statut',
            'Appréciation'
        ])
        
        # Données
        for grade in grades:
            writer.writerow([
                grade.student.student_id,
                grade.student.user.last_name,
                grade.student.user.first_name,
                grade.ec.code,
                grade.ec.name,
                float(grade.cc_grade) if grade.cc_grade else '',
                float(grade.exam_grade) if grade.exam_grade else '',
                float(grade.final_grade) if grade.final_grade else '',
                'Oui' if grade.is_absent else 'Non',
                grade.get_status_display(),
                grade.appreciation or ''
            ])
        
        # Response
        response = HttpResponse(output.getvalue(), content_type='text/csv')
        filename = f'notes_{timezone.now().strftime("%Y%m%d_%H%M")}.csv'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response

    
    @staticmethod
    def export_semester_results_csv(results: List[SemesterResult]) -> HttpResponse:
        """Exporte les résultats semestriels en CSV"""
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow([
            'Matricule', 'Nom Complet', 'Semestre',
            'Moyenne (/20)', 'GPA (/4)', 'Crédits Obtenus',
            'Crédits Total', 'UE Validées', 'UE Échouées',
            'Mention', 'Décision', 'Rang', 'Total Étudiants'
        ])
        
        for result in results:
            writer.writerow([
                result.student.student_id,
                result.student.user.get_full_name(),
                result.semester.name,
                float(result.average) if result.average else '',
                float(result.gpa) if result.gpa else '',
                result.credits_obtained,
                result.total_credits,
                result.ues_validated,
                result.ues_failed,
                result.mention or '',
                result.get_decision_display(),
                result.rank or '',
                result.total_students_in_semester or ''
            ])
        
        response = HttpResponse(output.getvalue(), content_type='text/csv')
        filename = f'resultats_{timezone.now().strftime("%Y%m%d")}.csv'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
