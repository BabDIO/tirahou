from django.contrib import admin
from .models import ExamSession, Grade, UEResult, SemesterResult, Jury, GradeContest


@admin.register(ExamSession)
class ExamSessionAdmin(admin.ModelAdmin):
    list_display = ('semester', 'academic_year', 'session_type', 'is_open', 'start_date', 'end_date')
    list_filter = ('session_type', 'is_open', 'academic_year', 'semester__program')
    search_fields = ('semester__label',)
    list_editable = ('is_open',)


@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ('get_student', 'ec', 'exam_session', 'cc_grade', 'exam_grade',
                    'final_grade', 'is_absent', 'status')
    list_filter = ('status', 'is_absent', 'exam_session', 'ec__ue__semester__program')
    search_fields = ('student__student_id', 'student__user__last_name', 'ec__code')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('student__student_id', 'ec__code')
    list_select_related = ('student__user', 'ec__ue', 'exam_session')

    def get_student(self, obj):
        return f"{obj.student.student_id} — {obj.student.user.get_full_name()}"
    get_student.short_description = 'Étudiant'


@admin.register(UEResult)
class UEResultAdmin(admin.ModelAdmin):
    list_display = ('get_student', 'ue', 'exam_session', 'average', 'credits_obtained', 'decision')
    list_filter = ('decision', 'ue__semester__program', 'exam_session')
    search_fields = ('student__student_id', 'student__user__last_name')

    def get_student(self, obj):
        return obj.student.user.get_full_name()
    get_student.short_description = 'Étudiant'


@admin.register(SemesterResult)
class SemesterResultAdmin(admin.ModelAdmin):
    list_display = ('get_student', 'semester', 'exam_session', 'average',
                    'credits_obtained', 'total_credits', 'decision', 'published', 'rank')
    list_filter = ('decision', 'published', 'semester__program', 'exam_session')
    search_fields = ('student__student_id', 'student__user__last_name')
    list_editable = ('published',)
    ordering = ('semester', 'rank')

    def get_student(self, obj):
        return f"{obj.student.student_id} — {obj.student.user.get_full_name()}"
    get_student.short_description = 'Étudiant'


@admin.register(Jury)
class JuryAdmin(admin.ModelAdmin):
    list_display = ('exam_session', 'president', 'deliberation_date', 'is_closed')
    list_filter = ('is_closed',)
    filter_horizontal = ('members',)


@admin.register(GradeContest)
class GradeContestAdmin(admin.ModelAdmin):
    list_display = ('get_student', 'get_ec', 'status', 'reviewed_by', 'new_grade')
    list_filter = ('status',)
    search_fields = ('student__student_id', 'student__user__last_name')

    def get_student(self, obj):
        return obj.student.user.get_full_name()
    get_student.short_description = 'Étudiant'

    def get_ec(self, obj):
        return obj.grade.ec.code
    get_ec.short_description = 'EC'
