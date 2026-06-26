from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiResponse
from django.utils import timezone
import uuid

from apps.people.models import Student
from apps.enrollment.models import AdminEnrollment
from apps.evaluation.models import ExamSession, UEResult, SemesterResult
from apps.evaluation.services import compute_semester_results, get_student_transcript
from apps.academic.models import University
from .models import GeneratedDocument
from .pdf_service import (
    generate_certificat_scolarite,
    generate_releve_notes,
    generate_fiche_inscription,
    generate_carte_etudiant,
)


def _get_university_name():
    uni = University.objects.filter(is_active=True).first()
    return uni.name if uni else 'Université Virtuelle Hybride'


@extend_schema(responses={200: OpenApiResponse(description='PDF certificat de scolarité')})
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_certificat_pdf(request, student_id):
    try:
        student = Student.objects.select_related('user').get(id=student_id)
        academic_year_id = request.query_params.get('academic_year')

        enrollment = AdminEnrollment.objects.filter(
            student=student, status='validee'
        )
        if academic_year_id:
            enrollment = enrollment.filter(academic_year_id=academic_year_id)
        enrollment = enrollment.select_related('program', 'academic_year').latest('created_at')

        verification_code = f"VER-{uuid.uuid4().hex[:12].upper()}"
        university_name = _get_university_name()

        pdf_buf = generate_certificat_scolarite(student, enrollment, university_name, verification_code)

        # Sauvegarder le document généré
        doc = GeneratedDocument.objects.create(
            student=student,
            doc_type='certificat_scolarite',
            title=f'Certificat de scolarité — {enrollment.academic_year.label}',
            verification_code=verification_code,
            generated_by=request.user,
            metadata={'academic_year': str(enrollment.academic_year.id)},
        )
        doc.file.save(f'certificat_{student.student_id}_{verification_code}.pdf', pdf_buf)

        # Retourner le PDF
        pdf_buf.seek(0)
        response = HttpResponse(pdf_buf.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="certificat_scolarite_{student.student_id}.pdf"'
        return response

    except Student.DoesNotExist:
        return Response({'detail': 'Étudiant introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    except AdminEnrollment.DoesNotExist:
        return Response({'detail': 'Aucune inscription validée trouvée.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(responses={200: OpenApiResponse(description='PDF relevé de notes')})
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_releve_pdf(request, student_id):
    try:
        student = Student.objects.select_related('user').get(id=student_id)
        semester_id = request.query_params.get('semester')
        session_id = request.query_params.get('session')

        ue_results = UEResult.objects.filter(student=student).select_related('ue')
        semester_result = None

        if semester_id:
            ue_results = ue_results.filter(ue__semester_id=semester_id)
        if session_id:
            ue_results = ue_results.filter(exam_session_id=session_id)
            semester_result = SemesterResult.objects.filter(
                student=student, exam_session_id=session_id
            ).select_related('semester').first()

        ue_results = list(ue_results)
        verification_code = f"VER-{uuid.uuid4().hex[:12].upper()}"
        university_name = _get_university_name()

        pdf_buf = generate_releve_notes(student, ue_results, semester_result, university_name, verification_code)

        doc = GeneratedDocument.objects.create(
            student=student,
            doc_type='releve_notes',
            title=f'Relevé de notes — {semester_result.semester.label if semester_result else "Complet"}',
            verification_code=verification_code,
            generated_by=request.user,
        )
        doc.file.save(f'releve_{student.student_id}_{verification_code}.pdf', pdf_buf)

        pdf_buf.seek(0)
        response = HttpResponse(pdf_buf.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="releve_notes_{student.student_id}.pdf"'
        return response

    except Student.DoesNotExist:
        return Response({'detail': 'Étudiant introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(responses={200: OpenApiResponse(description="PDF fiche d'inscription")})
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_fiche_inscription_pdf(request, student_id):
    try:
        student = Student.objects.select_related('user').get(id=student_id)
        academic_year_id = request.query_params.get('academic_year')

        enrollment = AdminEnrollment.objects.filter(student=student, status='validee')
        if academic_year_id:
            enrollment = enrollment.filter(academic_year_id=academic_year_id)
        enrollment = enrollment.select_related('program', 'academic_year').latest('created_at')

        verification_code = f"VER-{uuid.uuid4().hex[:12].upper()}"
        university_name = _get_university_name()

        pdf_buf = generate_fiche_inscription(student, enrollment, university_name, verification_code)

        doc = GeneratedDocument.objects.create(
            student=student,
            doc_type='fiche_inscription',
            title=f"Fiche d'inscription — {enrollment.academic_year.label}",
            verification_code=verification_code,
            generated_by=request.user,
            metadata={'academic_year': str(enrollment.academic_year.id), 'enrollment_number': enrollment.enrollment_number},
        )
        doc.file.save(f"fiche_inscription_{student.student_id}_{verification_code}.pdf", pdf_buf)

        pdf_buf.seek(0)
        response = HttpResponse(pdf_buf.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="fiche_inscription_{student.student_id}.pdf"'
        return response

    except Student.DoesNotExist:
        return Response({'detail': 'Étudiant introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    except AdminEnrollment.DoesNotExist:
        return Response({'detail': 'Aucune inscription validée trouvée.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(responses={200: OpenApiResponse(description="PDF carte étudiant")})
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_carte_etudiant_pdf(request, student_id):
    try:
        student = Student.objects.select_related('user').get(id=student_id)
        academic_year_id = request.query_params.get('academic_year')

        enrollment = AdminEnrollment.objects.filter(student=student, status='validee')
        if academic_year_id:
            enrollment = enrollment.filter(academic_year_id=academic_year_id)
        enrollment = enrollment.select_related('program', 'academic_year').latest('created_at')

        verification_code = f"VER-{uuid.uuid4().hex[:12].upper()}"
        university_name = _get_university_name()

        pdf_buf = generate_carte_etudiant(student, enrollment, university_name, verification_code)

        doc = GeneratedDocument.objects.create(
            student=student,
            doc_type='carte_etudiant',
            title=f"Carte étudiant — {enrollment.academic_year.label}",
            verification_code=verification_code,
            generated_by=request.user,
            valid_until=enrollment.academic_year.end_date,
            metadata={'academic_year': str(enrollment.academic_year.id)},
        )
        doc.file.save(f"carte_etudiant_{student.student_id}_{verification_code}.pdf", pdf_buf)

        pdf_buf.seek(0)
        response = HttpResponse(pdf_buf.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="carte_etudiant_{student.student_id}.pdf"'
        return response

    except Student.DoesNotExist:
        return Response({'detail': 'Étudiant introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    except AdminEnrollment.DoesNotExist:
        return Response({'detail': 'Aucune inscription validée trouvée.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@extend_schema(
    request={'application/json': {'type': 'object', 'properties': {'semester_id': {'type': 'string'}, 'session_id': {'type': 'string'}}}},
    responses={200: OpenApiResponse(description='Résultats calculés')}
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def compute_results(request):
    semester_id = request.data.get('semester_id')
    session_id = request.data.get('session_id')

    if not semester_id or not session_id:
        return Response({'detail': 'semester_id et session_id requis.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from apps.programs.models import Semester
        semester = Semester.objects.get(id=semester_id)
        session = ExamSession.objects.get(id=session_id)
        results = compute_semester_results(semester, session)
        return Response({'detail': f'{len(results)} résultats calculés avec succès.'})
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(responses={200: OpenApiResponse(description='Relevé de notes complet')})
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_transcript(request, student_id):
    try:
        student = Student.objects.get(id=student_id)
        academic_year_id = request.query_params.get('academic_year')

        if not academic_year_id:
            from apps.academic.models import AcademicYear
            year = AcademicYear.objects.filter(is_current=True).first()
            if not year:
                return Response({'detail': 'Aucune année académique courante.'}, status=status.HTTP_404_NOT_FOUND)
            academic_year_id = year.id

        from apps.academic.models import AcademicYear
        academic_year = AcademicYear.objects.get(id=academic_year_id)
        transcript = get_student_transcript(student, academic_year)

        data = []
        for sem_data in transcript:
            data.append({
                'semester': {
                    'id': str(sem_data['semester'].id),
                    'label': sem_data['semester'].label,
                    'number': sem_data['semester'].number,
                },
                'ue_results': [
                    {
                        'ue_code': r.ue.code,
                        'ue_name': r.ue.name,
                        'credits': r.ue.credits,
                        'average': float(r.average) if r.average else None,
                        'credits_obtained': r.credits_obtained,
                        'decision': r.decision,
                    }
                    for r in sem_data['ue_results']
                ],
                'semester_result': {
                    'average': float(sem_data['semester_result'].average) if sem_data['semester_result'] and sem_data['semester_result'].average else None,
                    'credits_obtained': sem_data['semester_result'].credits_obtained if sem_data['semester_result'] else 0,
                    'total_credits': sem_data['semester_result'].total_credits if sem_data['semester_result'] else 0,
                    'decision': sem_data['semester_result'].decision if sem_data['semester_result'] else None,
                } if sem_data['semester_result'] else None,
            })

        return Response(data)
    except Student.DoesNotExist:
        return Response({'detail': 'Étudiant introuvable.'}, status=status.HTTP_404_NOT_FOUND)
