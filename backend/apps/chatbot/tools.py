"""
Outils de « function calling » exposés à Claude pour ancrer ses réponses sur
les données réelles de l'utilisateur connecté.

Chaque fonction dérive son périmètre uniquement de `user` (jamais d'un
paramètre fourni par le modèle) : un prompt ne peut donc jamais faire fuiter
les données d'un autre utilisateur — l'assistant ne voit que ce que
l'utilisateur connecté pourrait déjà voir en naviguant l'application.
"""
from django.utils import timezone
from apps.evaluation.services import ResultService
from apps.scheduling_app.models import ScheduledSession
from apps.attendance.models import AttendanceRecord
from apps.enrollment.models import PedaEnrollment
from apps.lms.models import CourseSpace


def get_my_grades(user):
    student = getattr(user, 'student_profile', None)
    if not student:
        return {'error': "Aucun profil étudiant associé à ce compte."}
    transcript = ResultService.get_student_transcript(student)
    if not transcript or not transcript.get('semesters'):
        return {'message': "Aucun relevé de notes publié pour le moment."}
    return transcript


def get_my_schedule(user):
    now = timezone.now()
    if hasattr(user, 'student_profile'):
        peda = PedaEnrollment.objects.filter(
            admin_enrollment__student=user.student_profile, status='confirmee'
        ).select_related('group').order_by('-created_at').first()
        if not peda or not peda.group:
            return {'message': "Aucun groupe pédagogique actif trouvé — emploi du temps indisponible."}
        sessions = ScheduledSession.objects.filter(
            group=peda.group, start_datetime__gte=now, status__in=['planifie', 'confirme'],
        ).select_related('ec', 'room', 'teacher').order_by('start_datetime')[:10]
    elif hasattr(user, 'teacher_profile'):
        sessions = ScheduledSession.objects.filter(
            teacher=user, start_datetime__gte=now, status__in=['planifie', 'confirme'],
        ).select_related('ec', 'room').order_by('start_datetime')[:10]
    else:
        return {'error': "Emploi du temps non disponible pour ce type de compte."}

    if not sessions:
        return {'message': "Aucune séance à venir."}

    return {'seances': [{
        'cours': s.ec.name,
        'debut': s.start_datetime.strftime('%d/%m/%Y %H:%M'),
        'fin': s.end_datetime.strftime('%H:%M'),
        'salle': s.room.name if s.room else None,
        'mode': s.get_mode_display(),
        'enseignant': s.teacher.get_full_name() if getattr(s, 'teacher', None) else None,
    } for s in sessions]}


def get_my_attendance(user):
    student = getattr(user, 'student_profile', None)
    if not student:
        return {'error': "Aucun profil étudiant associé à ce compte."}
    records = AttendanceRecord.objects.filter(student=student)
    total = records.count()
    if total == 0:
        return {'message': "Aucune séance enregistrée pour le moment."}
    present = records.filter(status='present').count()
    absent = records.filter(status='absent').count()
    retard = records.filter(status='retard').count()
    excuse = records.filter(status='excuse').count()
    return {
        'total_seances': total,
        'present': present,
        'absent': absent,
        'retard': retard,
        'excuse': excuse,
        'taux_presence_pct': round((present + retard) / total * 100, 1),
    }


def get_my_courses(user):
    if not hasattr(user, 'teacher_profile'):
        return {'error': "Cette information n'est disponible que pour les enseignants."}
    spaces = CourseSpace.objects.filter(teachers=user).select_related('ue')[:20]
    if not spaces:
        return {'message': "Aucun espace de cours attribué pour le moment."}
    return {'cours': [{
        'titre': c.title,
        'ue': c.ue.name,
        'mode': c.get_mode_display(),
        'publie': c.is_published,
        'nb_etudiants': c.enrolled_students.count(),
    } for c in spaces]}


TOOL_DEFINITIONS = {
    'get_my_grades': {
        'name': 'get_my_grades',
        'description': (
            "Récupère le relevé de notes officiel (semestres publiés, moyennes, "
            "mentions, crédits obtenus) de l'étudiant actuellement connecté."
        ),
        'input_schema': {'type': 'object', 'properties': {}, 'additionalProperties': False},
    },
    'get_my_schedule': {
        'name': 'get_my_schedule',
        'description': (
            "Récupère les prochaines séances de cours planifiées de l'utilisateur "
            "connecté (étudiant : d'après son groupe pédagogique ; enseignant : "
            "ses propres séances)."
        ),
        'input_schema': {'type': 'object', 'properties': {}, 'additionalProperties': False},
    },
    'get_my_attendance': {
        'name': 'get_my_attendance',
        'description': (
            "Récupère les statistiques d'assiduité (présences, absences, retards, "
            "taux de présence) de l'étudiant actuellement connecté."
        ),
        'input_schema': {'type': 'object', 'properties': {}, 'additionalProperties': False},
    },
    'get_my_courses': {
        'name': 'get_my_courses',
        'description': "Récupère la liste des espaces de cours (LMS) dont l'enseignant connecté a la charge.",
        'input_schema': {'type': 'object', 'properties': {}, 'additionalProperties': False},
    },
}

TOOL_FUNCTIONS = {
    'get_my_grades': get_my_grades,
    'get_my_schedule': get_my_schedule,
    'get_my_attendance': get_my_attendance,
    'get_my_courses': get_my_courses,
}

# Quels outils sont proposés à Claude selon le(s) rôle(s) de l'utilisateur —
# les autres rôles (scolarité, finance, responsable, bibliothécaire, admin...)
# gardent un assistant généraliste sans accès à des données personnelles,
# ce qui évite d'étendre la surface RBAC via le chatbot.
ROLE_TOOLS = {
    'etudiant': ['get_my_grades', 'get_my_schedule', 'get_my_attendance'],
    'enseignant': ['get_my_schedule', 'get_my_courses'],
}


def get_tools_for_user(user):
    names = set()
    for role_name, tool_names in ROLE_TOOLS.items():
        if user.has_role(role_name):
            names.update(tool_names)
    definitions = [TOOL_DEFINITIONS[n] for n in names]
    functions = {n: TOOL_FUNCTIONS[n] for n in names}
    return definitions, functions
