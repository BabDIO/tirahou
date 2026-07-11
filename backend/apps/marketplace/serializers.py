from rest_framework import serializers
from .models import MarketplaceCourse, CourseLesson, CoursePurchase, LessonCompletion, CourseReview


class CourseLessonSerializer(serializers.ModelSerializer):
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = CourseLesson
        fields = '__all__'

    def get_is_completed(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'student_profile'):
            return False
        return LessonCompletion.objects.filter(student=request.user.student_profile, lesson=obj).exists()


class CourseLessonLockedSerializer(serializers.ModelSerializer):
    """Version restreinte : masque le contenu tant que le cours n'est pas acheté (sauf aperçu)."""
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)
    is_completed = serializers.SerializerMethodField()
    is_locked = serializers.SerializerMethodField()
    content_url = serializers.SerializerMethodField()
    content_text = serializers.SerializerMethodField()

    class Meta:
        model = CourseLesson
        fields = [
            'id', 'course', 'title', 'content_type', 'content_type_display',
            'content_url', 'content_text', 'duration_minutes', 'order',
            'is_preview', 'is_completed', 'is_locked',
        ]

    def _has_access(self, obj):
        if obj.is_preview:
            return True
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'student_profile'):
            return False
        return CoursePurchase.objects.filter(student=request.user.student_profile, course=obj.course).exists()

    def get_is_locked(self, obj):
        return not self._has_access(obj)

    def get_content_url(self, obj):
        return obj.content_url if self._has_access(obj) else ''

    def get_content_text(self, obj):
        return obj.content_text if self._has_access(obj) else ''

    def get_is_completed(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'student_profile'):
            return False
        return LessonCompletion.objects.filter(student=request.user.student_profile, lesson=obj).exists()


class CourseReviewSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = CourseReview
        fields = '__all__'
        read_only_fields = ['student']

    def get_student_name(self, obj):
        return obj.student.user.get_full_name()


class MarketplaceCourseSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    level_display = serializers.CharField(source='get_level_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    lessons_count = serializers.SerializerMethodField()
    students_count = serializers.SerializerMethodField()
    is_purchased = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = MarketplaceCourse
        fields = '__all__'
        read_only_fields = ['teacher', 'slug', 'rating', 'rating_count', 'published_at']

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name()

    def get_lessons_count(self, obj):
        return obj.lessons.count()

    def get_students_count(self, obj):
        return obj.purchases.count()

    def get_is_purchased(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'student_profile'):
            return False
        return CoursePurchase.objects.filter(student=request.user.student_profile, course=obj).exists()

    def get_is_owner(self, obj):
        request = self.context.get('request')
        return bool(request and obj.teacher_id == request.user.id)


class MarketplaceCourseDetailSerializer(MarketplaceCourseSerializer):
    lessons = serializers.SerializerMethodField()
    reviews = CourseReviewSerializer(many=True, read_only=True)

    def get_lessons(self, obj):
        request = self.context.get('request')
        is_owner = bool(request and obj.teacher_id == request.user.id)
        lessons = obj.lessons.all()
        if is_owner or (request and request.user.is_superuser):
            return CourseLessonSerializer(lessons, many=True, context=self.context).data
        return CourseLessonLockedSerializer(lessons, many=True, context=self.context).data


class CoursePurchaseSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    course_detail = MarketplaceCourseSerializer(source='course', read_only=True)

    class Meta:
        model = CoursePurchase
        fields = '__all__'
        read_only_fields = ['student', 'price_paid', 'purchased_at']

    def get_student_name(self, obj):
        return obj.student.user.get_full_name()
