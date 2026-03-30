"""add clerk_id to users, make password_hash nullable

Revision ID: a1b2c3d4e5f6
Revises: e847da35e993
Create Date: 2026-03-30 21:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'e847da35e993'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add clerk_id column (nullable initially for existing rows)
    op.add_column('users', sa.Column('clerk_id', sa.String(length=255), nullable=True))
    op.create_index(op.f('ix_users_clerk_id'), 'users', ['clerk_id'], unique=True)

    # Make password_hash nullable (Clerk users won't have one)
    op.alter_column('users', 'password_hash',
                    existing_type=sa.String(length=255),
                    nullable=True)


def downgrade() -> None:
    # Revert password_hash to NOT NULL (must fill NULLs first)
    op.execute("UPDATE users SET password_hash = '' WHERE password_hash IS NULL")
    op.alter_column('users', 'password_hash',
                    existing_type=sa.String(length=255),
                    nullable=False)

    # Remove clerk_id column and index
    op.drop_index(op.f('ix_users_clerk_id'), table_name='users')
    op.drop_column('users', 'clerk_id')
