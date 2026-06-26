"""
Services de génération de documents et GED
"""
import uuid
import qrcode
import io
from django.core.files.base import ContentFile
from django.utils import timezone
from .models import GeneratedDocument, DocumentAccessLog


class DocumentService:

    @staticmethod
    def generate_document(student, doc_type: str, generated_by, metadata: dict = None):
        """Génère un document officiel avec QR code de vérification."""
        doc_labels = {
            'fiche_inscription': "Fiche d'inscription",
            'certificat_scolarite': "Certificat de scolarité",
            'certificat_frequentation': "Certificat de fréquentation",
            'attestation_reussite': "Attestation de réussite",
            'releve_notes': "Relevé de notes",
            'bulletin': "Bulletin semestriel",
            'convocation': "Convocation",
            'carte_etudiant': "Carte étudiant",
            'diplome': "Diplôme",
            'attestation_fin_cycle': "Attestation de fin de cycle",
            'pv_deliberation': "PV de délibération",
        }

        verification_code = f"VER-{uuid.uuid4().hex[:12].upper()}"
        title = doc_labels.get(doc_type, doc_type)

        doc = GeneratedDocument(
            student=student,
            doc_type=doc_type,
            title=f"{title} — {student.user.get_full_name()}",
            verification_code=verification_code,
            status='genere',
            generated_by=generated_by,
            metadata=metadata or {},
        )

        # Générer le QR code
        qr_img = DocumentService._generate_qr_code(verification_code)
        doc.qr_code.save(f"qr_{verification_code}.png", ContentFile(qr_img), save=False)
        doc.save()

        return doc

    @staticmethod
    def _generate_qr_code(verification_code: str) -> bytes:
        """Génère le QR code PNG pour un code de vérification."""
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        # URL de vérification publique
        verify_url = f"/verify/{verification_code}"
        qr.add_data(verify_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return buf.getvalue()

    @staticmethod
    def verify_document(verification_code: str, ip_address: str = None, accessed_by=None):
        """Vérifie l'authenticité d'un document et enregistre l'accès."""
        try:
            doc = GeneratedDocument.objects.select_related('student__user').get(
                verification_code=verification_code,
                is_active=True
            )
        except GeneratedDocument.DoesNotExist:
            return None

        # Logger l'accès
        DocumentAccessLog.objects.create(
            document=doc,
            accessed_by=accessed_by,
            ip_address=ip_address,
            verification_method='qr_code' if verification_code.startswith('VER-') else 'manual',
        )

        return {
            'valid': True,
            'doc_type': doc.get_doc_type_display(),
            'title': doc.title,
            'student': doc.student.user.get_full_name(),
            'student_id': doc.student.student_id,
            'generated_at': doc.created_at.isoformat(),
            'status': doc.get_status_display(),
            'valid_until': doc.valid_until.isoformat() if doc.valid_until else None,
        }

    @staticmethod
    def get_student_documents_summary(student):
        """Retourne un résumé des documents d'un étudiant."""
        from .models import StudentDocument

        generated = GeneratedDocument.objects.filter(student=student, is_active=True)
        uploaded = StudentDocument.objects.filter(student=student, is_active=True)

        return {
            'generated_count': generated.count(),
            'uploaded_count': uploaded.count(),
            'pending_validation': uploaded.filter(status='depose').count(),
            'recent_generated': list(generated.order_by('-created_at')[:5].values(
                'id', 'doc_type', 'title', 'verification_code', 'status', 'created_at'
            )),
        }
