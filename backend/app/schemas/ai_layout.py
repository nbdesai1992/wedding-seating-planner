"""Pydantic schemas for AI layout generation and modification endpoints."""

from pydantic import BaseModel, Field


class LayoutGenerateRequest(BaseModel):
    """Request body for AI layout generation."""

    description: str = Field(
        ...,
        min_length=5,
        max_length=2000,
        description="Natural language description of the venue layout",
        json_schema_extra={
            "examples": [
                "200-person ballroom with 20 round tables, dance floor in the center, bar in the back corner"
            ]
        },
    )


class LayoutConfigRequest(BaseModel):
    """Structured layout configuration for deterministic generation."""

    table_count: int = Field(..., ge=1, le=40)
    table_shape: str = Field(default="round")
    seats_per_table: int = Field(default=8, ge=2, le=20)
    include_sweetheart: bool = Field(default=True)
    include_dance_floor: bool = Field(default=True)
    dance_floor_position: str = Field(default="center")
    include_bar: bool = Field(default=False)
    include_stage: bool = Field(default=False)
    include_cake_table: bool = Field(default=False)


class LayoutModifyRequest(BaseModel):
    """Request body for AI layout modification."""

    prompt: str = Field(
        ...,
        min_length=3,
        max_length=2000,
        description="Natural language modification request for the layout",
        json_schema_extra={
            "examples": [
                "make the head table longer and add two more round tables near the dance floor"
            ]
        },
    )
