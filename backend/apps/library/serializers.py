from rest_framework import serializers
from .models import LibraryDocument, Borrowing, Reservation, DocumentRating, ReadingList


class LibraryDocumentSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = LibraryDocument
        fields = '__all__'
        read_only_fields = ['download_count', 'view_count', 'uploaded_by']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return obj.external_url or None



class BorrowingSerializer(serializers.ModelSerializer):
    document_title = serializers.CharField(source='document.title', read_only=True)
    borrower_name = serializers.CharField(source='borrower.get_full_name', read_only=True)
    
    class Meta:
        model = Borrowing
        fields = '__all__'
        read_only_fields = ['borrowed_at', 'late_days', 'penalty_amount']


class ReservationSerializer(serializers.ModelSerializer):
    document_title = serializers.CharField(source='document.title', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = Reservation
        fields = '__all__'
        read_only_fields = ['reserved_at', 'position']


class DocumentRatingSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = DocumentRating
        fields = '__all__'


class ReadingListSerializer(serializers.ModelSerializer):
    documents_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ReadingList
        fields = '__all__'
    
    def get_documents_count(self, obj):
        return obj.documents.count()
