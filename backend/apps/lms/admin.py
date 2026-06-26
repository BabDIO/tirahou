from django.contrib import admin
from .models import (CourseSpace, CourseModule, CourseResource,
                     Assignment, AssignmentSubmission, Quiz, Question,
                     QuestionChoice, QuizAttempt, StudentProgress)


class CourseModuleInline(admin.TabularInline):
    model = CourseModule
    extra = 0
    fields = ('title', 'order', 'is_published', 'available_from')


class CourseResourceInline(admin.TabularInline):
    model = CourseResource
    extra = 0
    fields = ('title', 'type', 'order', 'is_published', 'is_downloadable')


class QuestionChoiceInline(admin.TabularInline):
    model = QuestionChoice
    extra = 2
    fields = ('text', 'is_correct', 'order')


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    fields = ('text', 'type', 'points', 'order')


@admin.register(CourseSpace)
class CourseSpaceAdmin(admin.ModelAdmin):
    list_display = ('title', 'ue', 'academic_year', 'mode', 'is_published', 'is_active')
    list_filter = ('mode', 'is_published', 'academic_year', 'ue__semester__program')
    search_fields = ('title', 'ue__code', 'ue__name')
    filter_horizontal = ('teachers', 'enrolled_students')
    list_editable = ('is_published',)
    inlines = [CourseModuleInline]


@admin.register(CourseModule)
class CourseModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'course_space', 'order', 'is_published', 'available_from')
    list_filter = ('is_published', 'course_space__ue__semester__program')
    search_fields = ('title', 'course_space__title')
    inlines = [CourseResourceInline]


@admin.register(CourseResource)
class CourseResourceAdmin(admin.ModelAdmin):
    list_display = ('title', 'module', 'type', 'order', 'is_published', 'is_downloadable', 'file_size')
    list_filter = ('type', 'is_published', 'is_downloadable')
    search_fields = ('title',)


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'course_space', 'type', 'due_date', 'max_grade', 'status')
    list_filter = ('type', 'status', 'course_space__ue__semester__program')
    search_fields = ('title',)
    ordering = ('-due_date',)


@admin.register(AssignmentSubmission)
class AssignmentSubmissionAdmin(admin.ModelAdmin):
    list_display = ('get_student', 'assignment', 'submitted_at', 'is_late', 'grade', 'status')
    list_filter = ('status', 'is_late')
    search_fields = ('student__student_id', 'student__user__last_name')
    readonly_fields = ('submitted_at',)

    def get_student(self, obj):
        return obj.student.user.get_full_name()
    get_student.short_description = 'Étudiant'


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'course_space', 'duration_minutes', 'max_grade',
                    'max_attempts', 'is_published', 'open_date', 'close_date')
    list_filter = ('is_published', 'course_space__ue__semester__program')
    search_fields = ('title',)
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('quiz', 'type', 'points', 'order')
    list_filter = ('type',)
    inlines = [QuestionChoiceInline]


@admin.register(StudentProgress)
class StudentProgressAdmin(admin.ModelAdmin):
    list_display = ('get_student', 'course_space', 'completion_rate',
                    'resources_viewed', 'total_resources', 'last_access')
    list_filter = ('course_space__ue__semester__program',)
    search_fields = ('student__student_id', 'student__user__last_name')
    readonly_fields = ('last_access',)

    def get_student(self, obj):
        return obj.student.user.get_full_name()
    get_student.short_description = 'Étudiant'
