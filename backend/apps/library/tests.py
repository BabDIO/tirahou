import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from rest_framework.test import APIClient

from apps.accounts.models import User, Role
from apps.library.models import LibraryDocument

_TEST_MEDIA_ROOT = tempfile.mkdtemp(prefix='tirahou_test_media_')


@override_settings(MEDIA_ROOT=_TEST_MEDIA_ROOT)
class MultipartIsActiveRegressionTests(TestCase):
    """
    Régression pour un bug réel : sur un vrai POST multipart/form-data
    (upload de fichier), DRF interprète un BooleanField absent du
    formulaire comme "décoché" (False) plutôt que "non fourni" — ce qui
    forçait is_active=False sur tout document créé via le formulaire
    d'ajout, le rendant invisible instantanément (get_queryset() filtre
    sur is_active=True). Corrigé en passant `is_active` en read_only
    dans LibraryDocumentSerializer. Voir apps.documents / apps.lms /
    apps.admissions pour le même correctif appliqué ailleurs.
    """

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_TEST_MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='bib.test@tirahou.edu', username='bib_test',
            first_name='Biblio', last_name='Test', password='Test@2024',
        )
        # Depuis la restriction perform_create() aux rôles de gestion du
        # catalogue (voir apps.library.views), ce test doit représenter un
        # membre du personnel réel — sinon il ne teste plus la régression
        # is_active mais la restriction d'accès elle-même.
        role, _ = Role.objects.get_or_create(name='bibliothecaire')
        self.user.roles.add(role)
        self.client.force_authenticate(self.user)

    def test_multipart_create_stays_active(self):
        upload = SimpleUploadedFile('doc.pdf', b'%PDF-1.4 contenu test', content_type='application/pdf')
        response = self.client.post('/api/v1/library/', {
            'title': 'Document Test', 'author': 'Auteur Test', 'type': 'livre', 'year': 2026,
            'file': upload,
        }, format='multipart')
        self.assertEqual(response.status_code, 201, response.content)
        doc = LibraryDocument.objects.get(id=response.data['id'])
        self.assertTrue(doc.is_active)
        # Doit apparaître dans la liste, dont le queryset filtre is_active=True.
        self.assertIn(doc.id, [d.id for d in LibraryDocument.objects.filter(is_active=True)])

    def test_json_create_also_stays_active(self):
        response = self.client.post('/api/v1/library/', {
            'title': 'Document JSON', 'author': 'Auteur Test', 'type': 'article', 'year': 2026,
        }, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        doc = LibraryDocument.objects.get(id=response.data['id'])
        self.assertTrue(doc.is_active)

    def test_is_active_cannot_be_forced_false_by_client(self):
        upload = SimpleUploadedFile('doc2.pdf', b'%PDF-1.4', content_type='application/pdf')
        response = self.client.post('/api/v1/library/', {
            'title': 'Tentative désactivation', 'author': 'Auteur', 'type': 'livre', 'year': 2026,
            'is_active': 'false', 'file': upload,
        }, format='multipart')
        self.assertEqual(response.status_code, 201, response.content)
        doc = LibraryDocument.objects.get(id=response.data['id'])
        self.assertTrue(doc.is_active)
