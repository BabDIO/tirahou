"""
Génère des diagrammes de classes au format Mermaid à partir des modèles
Django réels du projet (un fichier .mmd par app + un diagramme global),
pour tenir la documentation/mémoire synchronisée avec le code sans dépendre
d'un outil externe (pas de Graphviz/pydot à installer).

Un fichier .mmd est du texte brut : il s'ouvre directement dans un aperçu
Mermaid (VS Code + extension "Markdown Preview Mermaid Support", mermaid.live,
ou un artifact/markdown qui supporte les blocs ```mermaid).

Usage :
    python manage.py graph_classes
    python manage.py graph_classes --apps accounts,academic,people
    python manage.py graph_classes --out ../Diagrammes/mermaid --no-global
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from django.apps import apps as django_apps
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Field


def _local_app_configs():
    """Apps du projet (préfixe 'apps.'), en excluant Django/DRF/contrib tiers."""
    return [cfg for cfg in django_apps.get_app_configs() if cfg.name.startswith('apps.')]


def _class_id(app_label: str, model_name: str) -> str:
    """Identifiant mermaid unique — le nom seul ne suffit pas : deux apps
    peuvent avoir un modèle du même nom (ex: 'Document')."""
    return f'{app_label}_{model_name}'


@dataclass
class Relation:
    source_id: str
    target_id: str
    target_name: str
    kind: str  # 'fk' | 'o2o' | 'm2m' | 'inherit'
    field_name: str = ''

    def render(self) -> str:
        if self.kind == 'inherit':
            return f'{self.target_id} <|-- {self.source_id}'
        arrow = {'fk': '"*" --> "1"', 'o2o': '"1" --> "1"', 'm2m': '"*" --> "*"'}[self.kind]
        return f'{self.source_id} {arrow} {self.target_id} : {self.field_name}'


def _model_block(model) -> tuple[str, list[Relation]]:
    """Retourne (bloc `class { ... }`, relations sortantes) pour un modèle."""
    name = model.__name__
    cid = _class_id(model._meta.app_label, name)
    parent_link_fields = {f for f in model._meta.parents.values() if f}

    lines = [f'class {cid}["{name}"] {{']
    relations: list[Relation] = []

    for field in model._meta.get_fields():
        if not getattr(field, 'concrete', False):
            continue  # accesseur inverse (related_name) : pas une colonne réelle

        if field in parent_link_fields:
            # Héritage multi-tables Django (parent non-abstrait) -> flèche d'héritage UML
            parent = field.related_model
            relations.append(Relation(cid, _class_id(parent._meta.app_label, parent.__name__), parent.__name__, 'inherit'))
            continue

        if field.is_relation:
            related_model = field.related_model
            target_id = _class_id(related_model._meta.app_label, related_model.__name__)
            kind = 'm2m' if field.many_to_many else 'o2o' if field.one_to_one else 'fk'
            relations.append(Relation(cid, target_id, related_model.__name__, kind, field.name))
            lines.append(f'  +{related_model.__name__} {field.name}')
        else:
            lines.append(f'  +{field.get_internal_type()} {field.name}')

    lines.append('}')
    return '\n'.join(lines), relations


def _diagram(blocks: dict[str, str], relations: list[Relation]) -> str:
    """Assemble un diagramme complet, avec des stubs pour les classes
    référencées mais non détaillées (ex: auth.Group hors des apps du projet)
    afin qu'elles s'affichent avec leur vrai nom plutôt que leur id brut."""
    known = dict(blocks)
    for rel in relations:
        if rel.target_id not in known:
            known[rel.target_id] = f'class {rel.target_id}["{rel.target_name}"]'

    body = '\n'.join(known.values())
    rel_lines = '\n'.join(f'  {rel.render()}' for rel in relations)
    return f'classDiagram\n{body}\n{rel_lines}\n'


class Command(BaseCommand):
    help = (
        "Génère des diagrammes de classes Mermaid à partir des modèles Django "
        "du projet (un .mmd par app + un diagramme global)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--apps',
            help="Labels d'apps séparés par des virgules (défaut : toutes les apps du projet, ex: accounts,academic).",
        )
        parser.add_argument(
            '--out',
            default='../Diagrammes/mermaid',
            help="Dossier de sortie, relatif à backend/ (défaut : ../Diagrammes/mermaid).",
        )
        parser.add_argument(
            '--no-global',
            action='store_true',
            help="Ne pas générer le diagramme global combinant toutes les apps sélectionnées.",
        )

    def handle(self, *args, **options):
        app_configs = _local_app_configs()

        if options['apps']:
            wanted = {label.strip() for label in options['apps'].split(',') if label.strip()}
            available = {cfg.label for cfg in app_configs}
            missing = wanted - available
            if missing:
                raise CommandError(
                    f"App(s) inconnue(s) ou externe(s) au projet : {', '.join(sorted(missing))}. "
                    f"Apps disponibles : {', '.join(sorted(available))}."
                )
            app_configs = [cfg for cfg in app_configs if cfg.label in wanted]

        out_dir = Path(settings.BASE_DIR) / options['out']
        out_dir.mkdir(parents=True, exist_ok=True)

        all_blocks: dict[str, str] = {}
        all_relations: list[Relation] = []

        for cfg in app_configs:
            models = list(cfg.get_models())
            if not models:
                continue

            blocks: dict[str, str] = {}
            relations: list[Relation] = []
            for model in models:
                cid = _class_id(model._meta.app_label, model.__name__)
                block, rels = _model_block(model)
                blocks[cid] = block
                relations.extend(rels)

            path = out_dir / f'{cfg.label}.mmd'
            path.write_text(_diagram(blocks, relations), encoding='utf-8')
            self.stdout.write(self.style.SUCCESS(f'{path} ({len(models)} classes)'))

            all_blocks.update(blocks)
            all_relations.extend(relations)

        if not options['no_global'] and all_blocks:
            path = out_dir / 'global.mmd'
            path.write_text(_diagram(all_blocks, all_relations), encoding='utf-8')
            self.stdout.write(self.style.SUCCESS(f'{path} ({len(all_blocks)} classes au total)'))
