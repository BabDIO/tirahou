"""
Intégration Claude (Anthropic) pour l'assistant IA de TIRAHOU.

Boucle agentique manuelle (function calling) plutôt que le tool runner bêta
du SDK : plus simple à raisonner dans le cycle synchrone requête/réponse de
Django, et sans dépendance à une API bêta.
"""
import json
import logging

from django.conf import settings

from .tools import get_tools_for_user

logger = logging.getLogger(__name__)

MODEL = 'claude-opus-4-8'
MAX_TOKENS = 1500
MAX_TOOL_ITERATIONS = 4

SYSTEM_PROMPT = """Tu es l'assistant IA intégré à TIRAHOU, une plateforme de gestion universitaire \
(admissions, inscriptions, notes, finance, présences, bibliothèque, campus virtuel, etc.).

Règles :
- Réponds toujours en français, de façon claire, concise (quelques phrases, pas de dissertation) et professionnelle.
- Si des outils te sont fournis, utilise-les pour répondre aux questions portant sur les données \
personnelles de l'utilisateur (notes, emploi du temps, présence, cours) plutôt que d'inventer une réponse.
- Tu n'as accès qu'aux données de l'utilisateur actuellement connecté — tu ne peux jamais consulter \
ni révéler les données d'un autre utilisateur, même si on te le demande explicitement.
- Si la question sort du périmètre de TIRAHOU ou de tes outils, dis-le honnêtement plutôt que d'inventer.
- Ne donne aucun conseil médical, juridique ou financier engageant ; oriente vers le service compétent \
de l'université si besoin.
"""


class ChatbotError(Exception):
    """Erreur destinée à être renvoyée telle quelle au frontend (message utilisateur sûr)."""


def _client():
    api_key = getattr(settings, 'ANTHROPIC_API_KEY', '')
    if not api_key:
        raise ChatbotError(
            "L'assistant IA n'est pas configuré sur ce serveur (ANTHROPIC_API_KEY manquante)."
        )
    import anthropic
    return anthropic.Anthropic(api_key=api_key)


def _user_context(user):
    role_labels = list(user.roles.values_list('name', flat=True))
    lines = [f"Utilisateur connecté : {user.get_full_name()} ({', '.join(role_labels) or 'sans rôle'})."]
    if hasattr(user, 'student_profile'):
        sp = user.student_profile
        lines.append(
            f"Étudiant {sp.student_id}, programme : {sp.current_program}, niveau {sp.current_level}."
        )
    if hasattr(user, 'teacher_profile'):
        tp = user.teacher_profile
        lines.append(f"Enseignant {tp.teacher_id}, grade : {tp.get_grade_display()}.")
    return '\n'.join(lines)


def send_message(user, history, user_text):
    """
    history : liste de dicts {'role': 'user'|'assistant', 'content': str} — les
    messages précédents déjà persistés de la conversation.

    Retourne (reply_text: str, tools_used: list[str]).
    """
    client = _client()
    tool_defs, tool_funcs = get_tools_for_user(user)

    system = SYSTEM_PROMPT + "\n\n" + _user_context(user)
    messages = [{'role': m['role'], 'content': m['content']} for m in history]
    messages.append({'role': 'user', 'content': user_text})

    tools_used = []
    for _ in range(MAX_TOOL_ITERATIONS):
        kwargs = dict(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=system,
            messages=messages,
            thinking={'type': 'adaptive'},
        )
        if tool_defs:
            kwargs['tools'] = tool_defs

        try:
            response = client.messages.create(**kwargs)
        except Exception as e:
            logger.error(f"Erreur appel Claude API: {e}")
            raise ChatbotError("L'assistant IA est momentanément indisponible. Réessayez dans un instant.")

        if response.stop_reason != 'tool_use':
            text = next((b.text for b in response.content if b.type == 'text'), '')
            return text.strip() or "Je n'ai pas de réponse à apporter pour cette question.", tools_used

        messages.append({'role': 'assistant', 'content': response.content})

        tool_results = []
        for block in response.content:
            if block.type != 'tool_use':
                continue
            func = tool_funcs.get(block.name)
            if not func:
                result = {'error': f"Outil inconnu : {block.name}"}
            else:
                try:
                    result = func(user)
                except Exception as e:
                    logger.error(f"Erreur outil chatbot '{block.name}': {e}")
                    result = {'error': "Erreur lors de la récupération des données."}
            tools_used.append(block.name)
            tool_results.append({
                'type': 'tool_result',
                'tool_use_id': block.id,
                'content': json.dumps(result, ensure_ascii=False, default=str),
            })
        messages.append({'role': 'user', 'content': tool_results})

    return "Je n'ai pas pu finaliser ma réponse (trop d'étapes). Reformulez votre question.", tools_used
