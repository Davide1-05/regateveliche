"""sync_database_schema

Revision ID: 9a5de97a6a42
Revises: 
Create Date: 2026-08-18 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '9a5de97a6a42'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Aggiunta della colonna regatta_id con foreign key
    op.add_column(
        'marks', 
        sa.Column('regatta_id', sqlmodel.sql.sqltypes.GUID(), nullable=True)
    )
    op.create_index(op.f('ix_marks_regatta_id'), 'marks', ['regatta_id'], unique=False)
    op.create_foreign_key(
        'fk_marks_regatta_id_regattas', 
        'marks', 
        'regattas', 
        ['regatta_id'], 
        ['id'], 
        ondelete='CASCADE'
    )

    # 2. Rende race_id opzionale
    op.alter_column(
        'marks', 
        'race_id',
        existing_type=sqlmodel.sql.sqltypes.GUID(),
        nullable=True
    )

    # 3. Conversione esplicita di latitude e longitude in float con cast PostgreSQL
    op.alter_column(
        'marks', 
        'latitude',
        existing_type=sa.VARCHAR(length=50),
        type_=sa.Float(),
        postgresql_using='latitude::double precision',
        existing_nullable=True
    )
    op.alter_column(
        'marks', 
        'longitude',
        existing_type=sa.VARCHAR(length=50),
        type_=sa.Float(),
        postgresql_using='longitude::double precision',
        existing_nullable=True
    )


def downgrade() -> None:
    op.alter_column(
        'marks', 
        'longitude',
        existing_type=sa.Float(),
        type_=sa.VARCHAR(length=50),
        postgresql_using='longitude::text',
        existing_nullable=True
    )
    op.alter_column(
        'marks', 
        'latitude',
        existing_type=sa.Float(),
        type_=sa.VARCHAR(length=50),
        postgresql_using='latitude::text',
        existing_nullable=True
    )
    op.alter_column(
        'marks', 
        'race_id',
        existing_type=sqlmodel.sql.sqltypes.GUID(),
        nullable=False
    )
    op.drop_constraint('fk_marks_regatta_id_regattas', 'marks', type_='foreignkey')
    op.drop_index(op.f('ix_marks_regatta_id'), table_name='marks')
    op.drop_column('marks', 'regatta_id')