from rest_framework import serializers
from .models import DocumentCategory, StudentDocument, GeneratedDocument


class DocumentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentCategory
        fields = '__all__'


class StudentDocumentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = StudentDocument
        fields = '__all__'
        # is_active en lecture seule : upload via multipart/form-data — meme
        # piege que LibraryDocumentSerializer (voir ce fichier pour le detail).
        # student/status/verified_* en lecture seule : sinon un etudiant peut
        # deposer un document au nom d'un autre etudiant, ou s'auto-valider
        # directement a la creation (voir perform_create de la vue).
        read_only_fields = ['is_active', 'student', 'status', 'verified_by', 'verified_at', 'rejection_reason']


class GeneratedDocumentSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = GeneratedDocument
        fields = '__all__'
        extra_kwargs = {'verification_code': {'read_only': True}}
