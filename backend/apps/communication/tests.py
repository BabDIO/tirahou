from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User, Role
from apps.communication.models import Notification


class SendNotificationPermissionTests(TestCase):
    """
    Régression pour un vrai trou de sécurité trouvé en production :
    POST /notifications/send_notification/ n'avait aucun contrôle de rôle,
    donc n'importe quel compte authentifié pouvait pousser une fausse
    notification (usurpation/phishing) vers n'importe quel autre
    utilisateur en connaissant juste son id. Voir _can_send_notification
    dans views.py.
    """

    def setUp(self):
        self.client = APIClient()
        self.target = User.objects.create_user(
            email='cible.test@tirahou.edu', username='cible_test',
            first_name='Cible', last_name='Test', password='Test@2024',
        )
        self.student = User.objects.create_user(
            email='etudiant.notif@tirahou.edu', username='etudiant_notif',
            first_name='Etu', last_name='Notif', password='Test@2024',
        )
        self.student.roles.add(Role.objects.create(name='etudiant'))

        self.staff = User.objects.create_user(
            email='scolarite.notif@tirahou.edu', username='scolarite_notif',
            first_name='Scol', last_name='Notif', password='Test@2024',
        )
        self.staff.roles.add(Role.objects.create(name='admin_scolarite'))

        self.payload = {
            'recipient_id': str(self.target.id),
            'title': 'Test',
            'message': 'Message de test',
        }

    def test_plain_student_cannot_send_notification_to_another_user(self):
        self.client.force_authenticate(self.student)
        response = self.client.post('/api/v1/notifications/send_notification/', self.payload)
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Notification.objects.filter(recipient=self.target).exists())

    def test_scolarite_staff_can_send_notification(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post('/api/v1/notifications/send_notification/', self.payload)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Notification.objects.filter(recipient=self.target).exists())

    def test_unauthenticated_request_rejected(self):
        response = self.client.post('/api/v1/notifications/send_notification/', self.payload)
        self.assertIn(response.status_code, (401, 403))
