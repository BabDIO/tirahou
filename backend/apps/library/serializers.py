from rest_framework import serializers
from .models import LibraryDocument, Borrowing, Reservation, DocumentRating, ReadingList


class LibraryDocumentSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = LibraryDocument
        fields = '__all__'
        # is_active en lecture seule : sur un vrai multipart/form-data (upload de
        # fichier), un BooleanField absent du formulaire est interprété par DRF
        # comme "décoché" (False) plutôt que "non fourni" — sans ce read_only,
        # tout document créé via le formulaire d'ajout devenait invisible
        # instantanément (is_active=False alors que le modèle défaut à True).
        read_only_fields = ['download_count', 'view_count', 'uploaded_by', 'is_active']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return obj.external_url or None



class BorrowingSerializer(serializers.ModelSerializer):
    document_title = serializers.CharField(source='document.title', read_only=True)
    document_author = serializers.CharField(source='document.author', read_only=True)
    document_cover = serializers.SerializerMethodField()
    borrower_name = serializers.CharField(source='borrower.get_full_name', read_only=True)

    def get_document_cover(self, obj):
        if obj.document.cover:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.document.cover.url) if request else obj.document.cover.url
        return None
    
    class Meta:
        model = Borrowing
        fields = '__all__'
        # Un emprunteur peut voir son propre Borrowing (get_queryset) et donc
        # le PATCHer : sans ces champs en lecture seule, il pouvait passer
        # lui-même son statut à "retourne" et penalty_paid à true, effaçant
        # sa propre amende sans passer par return_book()/mark_penalty_paid()
        # (réservés au bibliothécaire/admin).
        read_only_fields = [
            'document', 'borrower', 'borrowed_at', 'due_date', 'returned_at',
            'status', 'late_days', 'penalty_amount', 'penalty_paid', 'librarian_notes',
        ]


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
        # user en lecture seule : requis par le modèle mais jamais fourni
        # par le formulaire (juste un nom de liste) — perform_create()
        # l'assigne déjà depuis request.user, mais sans ce read_only la
        # validation du serializer rejetait la requête avant même
        # d'atteindre ce code, avec "Ce champ est obligatoire."
        read_only_fields = ['user']
    
    def get_documents_count(self, obj):
        return obj.documents.count()
