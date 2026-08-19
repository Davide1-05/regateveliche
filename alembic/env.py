import sys
from pathlib import Path
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# 1. Aggiunge la root del progetto al path di Python
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# 2. Importa SQLModel e registra tutti i modelli
from sqlmodel import SQLModel
from backend.config import get_settings
import backend.models  # Importa tutti i modelli per popolare i metadati

# 3. Configurazione logging
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 4. Collega i metadati di SQLModel ad Alembic
target_metadata = SQLModel.metadata

# 5. Imposta l'URL del database prelevandolo dalla configurazione dell'app
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()