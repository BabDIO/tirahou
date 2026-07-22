from rest_framework import serializers
from .models import Application, ApplicationDocument, AdmissionDecision


class ApplicationDocumentSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ApplicationDocument
        fields = '__all__'
        # is_active en lecture seule : upload via multipart/form-data — un
        # BooleanField absent du formulaire est interprete par DRF comme
        # "decoche" (False) plutot que "non fourni" (meme piege que
        # LibraryDocumentSerializer / CourseResourceSerializer).
        # status/verified_* en lecture seule : sinon un candidat peut
        # s'auto-valider son propre document a la creation (le controle
        # d'appartenance de `application` se fait dans la vue, cf.
        # ApplicationDocumentViewSet.perform_create).
        read_only_fields = ['is_active', 'status', 'verified_by', 'verified_at']


class ApplicationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    applicant_name = serializers.SerializerMethodField()
    documents = ApplicationDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Application
        fields = '__all__'
        read_only_fields = ['application_number', 'submitted_at', 'applicant']

    def get_applicant_name(self, obj):
        return obj.applicant.get_full_name()


class AdmissionDecisionSerializer(serializers.ModelSerializer):
    decision_display = serializers.CharField(source='get_decision_display', read_only=True)

    class Meta:
        model = AdmissionDecision
        fields = '__all__'
        read_only_fields = ['application', 'decided_by', 'decided_at']
