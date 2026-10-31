"""Settings domain logic.

Rules:
- Lazily create defaults (classic preset) on first read.
- Choosing a named preset fills `colors` server-side, so export never
  depends on client state.
- Sending explicit `colors` flips preset to "custom" unless a preset was
  set in the same PATCH.
- Every effective change bumps `version` (job snapshots reference it).
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.settings.presets import DEFAULT_PRESET, PRESETS
from app.domains.settings.schemas import SettingsPatch
from app.infrastructure.database.models import RenderSettings


def get_or_create_settings(db: Session, project_id: uuid.UUID) -> RenderSettings:
    settings = db.scalar(select(RenderSettings).where(RenderSettings.project_id == project_id))
    if settings is None:
        settings = RenderSettings(
            project_id=project_id,
            theme_preset=DEFAULT_PRESET,
            colors=dict(PRESETS[DEFAULT_PRESET]),
        )
        db.add(settings)
        db.flush()
    return settings


def apply_patch(db: Session, settings: RenderSettings, patch: SettingsPatch) -> RenderSettings:
    fields = patch.model_dump(exclude_unset=True)
    if not fields:
        return settings

    preset = fields.pop("theme_preset", None)
    colors = fields.pop("colors", None)
    aspect_ratio = fields.pop("aspect_ratio", None)

    if preset is not None and preset != "custom":
        settings.theme_preset = preset
        settings.colors = dict(PRESETS[preset])
    if colors is not None:
        settings.colors = colors
        settings.theme_preset = preset if preset in PRESETS else "custom"
    if preset == "custom" and colors is None:
        settings.theme_preset = "custom"
    if aspect_ratio is not None:
        current_colors = dict(settings.colors or {})
        current_colors["_aspect_ratio"] = aspect_ratio
        settings.colors = current_colors

    for key, value in fields.items():
        setattr(settings, key, value)

    settings.version += 1
    db.flush()
    return settings
