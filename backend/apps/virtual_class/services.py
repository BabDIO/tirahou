"""
Services pour la gestion des classes virtuelles hybrides
"""
from django.utils import timezone
from .models import VirtualClassSession, SessionParticipant


class VirtualClassService:

    @staticmethod
    def start_session(session: VirtualClassSession, started_by=None):
        """Démarre une session de classe virtuelle."""
        if session.status not in ('planifiee',):
            raise ValueError(f"Impossible de démarrer une session en statut '{session.status}'.")
        session.status = 'en_cours'
        session.actual_start = timezone.now()
        session.save(update_fields=['status', 'actual_start', 'updated_at'])
        return session

    @staticmethod
    def end_session(session: VirtualClassSession, ended_by=None):
        """Termine une session et calcule les durées de participation."""
        if session.status != 'en_cours':
            raise ValueError("Seules les sessions 'en_cours' peuvent être terminées.")
        session.status = 'terminee'
        session.actual_end = timezone.now()
        session.save(update_fields=['status', 'actual_end', 'updated_at'])

        # Calculer les durées de présence pour les participants
        participants = SessionParticipant.objects.filter(
            session=session,
            is_present=True,
            joined_at__isnull=False,
        )
        for p in participants:
            if p.left_at and p.joined_at:
                delta = p.left_at - p.joined_at
                p.duration_minutes = int(delta.total_seconds() / 60)
                p.save(update_fields=['duration_minutes'])
            elif p.joined_at:
                delta = session.actual_end - p.joined_at
                p.duration_minutes = int(delta.total_seconds() / 60)
                p.left_at = session.actual_end
                p.save(update_fields=['duration_minutes', 'left_at'])

        return session

    @staticmethod
    def join_session(session: VirtualClassSession, user, join_mode: str = 'online'):
        """Enregistre la participation d'un utilisateur à une session."""
        if session.status == 'annulee':
            raise ValueError("Cette session est annulée.")

        participant, created = SessionParticipant.objects.get_or_create(
            session=session,
            user=user,
            defaults={
                'role': 'participant',
                'join_mode': join_mode,
                'joined_at': timezone.now(),
                'is_present': True,
            }
        )

        if not created:
            participant.joined_at = timezone.now()
            participant.is_present = True
            participant.join_mode = join_mode
            participant.save(update_fields=['joined_at', 'is_present', 'join_mode'])

        # Construire l'URL de join selon le fournisseur
        join_url = VirtualClassService._build_join_url(session, user, join_mode)

        return participant, join_url

    @staticmethod
    def _build_join_url(session: VirtualClassSession, user, join_mode: str) -> str:
        """Construit l'URL de connexion selon le fournisseur."""
        if session.join_url:
            return session.join_url

        # BigBlueButton : intégration réelle si configurée (voir apps.virtual_class.bbb)
        if session.provider == 'bbb':
            from . import bbb
            if bbb.is_configured():
                bbb.create_meeting(session)
                url = bbb.get_join_url(session, user)
                if url:
                    return url
            # Non configuré : pas de serveur BBB disponible, aucune URL de démonstration
            return ""

        # URLs par défaut selon le fournisseur (Jitsi ne nécessite aucune clé —
        # meet.jit.si est un service public gratuit, c'est une vraie intégration)
        provider_urls = {
            'jitsi': f"https://meet.jit.si/{session.meeting_id or session.id}",
            'zoom': f"https://zoom.us/j/{session.meeting_id}" if session.meeting_id else "",
            'meet': f"https://meet.google.com/{session.meeting_id}" if session.meeting_id else "",
            'teams': f"https://teams.microsoft.com/l/meetup-join/{session.meeting_id}" if session.meeting_id else "",
        }

        return provider_urls.get(session.provider, session.join_url or "")

    @staticmethod
    def cancel_session(session: VirtualClassSession, reason: str = "", cancelled_by=None):
        """Annule une session et notifie les participants."""
        if session.status == 'terminee':
            raise ValueError("Impossible d'annuler une session terminée.")

        session.status = 'annulee'
        session.save(update_fields=['status', 'updated_at'])

        # Notifier les participants inscrits
        try:
            from apps.communication.notification_service import NotificationService
            participants = session.participants.select_related('user').all()
            for p in participants:
                NotificationService.send_notification(
                    recipient_id=p.user.id,
                    title="Session annulée",
                    message=f"La session '{session.title}' a été annulée." + (f" Motif : {reason}" if reason else ""),
                    notif_type='alerte',
                    priority='high',
                    icon='x-circle',
                    color='red'
                )
        except Exception:
            pass

        return session
