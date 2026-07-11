from django.contrib import admin
from .models import MarketplaceCourse, CourseLesson, CoursePurchase, LessonCompletion, CourseReview


@admin.register(MarketplaceCourse)
class MarketplaceCourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'teacher', 'status', 'price', 'is_free', 'rating', 'created_at')
    list_filter = ('status', 'level', 'is_free')
    search_fields = ('title', 'teacher__first_name', 'teacher__last_name')


@admin.register(CourseLesson)
class CourseLessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'content_type', 'order', 'is_preview')
    list_filter = ('content_type', 'is_preview')


@admin.register(CoursePurchase)
class CoursePurchaseAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'price_paid', 'purchased_at')


@admin.register(LessonCompletion)
class LessonCompletionAdmin(admin.ModelAdmin):
    list_display = ('student', 'lesson', 'completed_at')


@admin.register(CourseReview)
class CourseReviewAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'rating', 'created_at')
