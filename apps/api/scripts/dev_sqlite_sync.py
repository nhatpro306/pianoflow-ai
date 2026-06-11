"""Dev-only: sync the local SQLite schema with model columns.

Postgres uses Alembic; SQLite dev DB gets additive columns here because
create_all() skips existing tables. Run:
    uv run --directory apps/api python scripts/dev_sqlite_sync.py
"""

import sqlalchemy as sa

from app.infrastructure.database.models import Base
from app.infrastructure.database.session import get_engine

ADDITIVE = {
    "render_settings": [
        ("piano_sound", "VARCHAR(20) NOT NULL DEFAULT 'concert_grand'"),
        ("volume", "FLOAT NOT NULL DEFAULT 0.8"),
        ("reverb", "VARCHAR(10) NOT NULL DEFAULT 'light'"),
    ],
}


def main() -> None:
    engine = get_engine()
    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        for table, columns in ADDITIVE.items():
            existing = {row[1] for row in conn.execute(sa.text(f"PRAGMA table_info({table})"))}
            for name, ddl in columns:
                if name not in existing:
                    conn.execute(sa.text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
                    print(f"added {table}.{name}")
    print("synced")


if __name__ == "__main__":
    main()
