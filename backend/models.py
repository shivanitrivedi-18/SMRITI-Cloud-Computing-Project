from typing import Optional
from pydantic import BaseModel, Field


class GameResult(BaseModel):
    patient_id: str
    game_type: str
    difficulty: str
    score: float = Field(ge=0, le=100)
    accuracy: float = Field(ge=0, le=100)
    response_time: float = Field(ge=0)
    moves: int = Field(ge=0)
    hints: int = Field(ge=0)


class MemoryCreate(BaseModel):
    patient_id: str
    title: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=40)
    person_name: Optional[str] = Field(default=None, max_length=120)
    relationship: Optional[str] = Field(default=None, max_length=80)
    place: Optional[str] = Field(default=None, max_length=120)
    event_name: Optional[str] = Field(default=None, max_length=120)
    memory_year: Optional[int] = Field(default=None, ge=1900, le=2100)
    story: Optional[str] = Field(default=None, max_length=1000)
    cue: Optional[str] = Field(default=None, max_length=120)
    importance: int = Field(default=3, ge=1, le=5)
    tags: Optional[str] = Field(default=None, max_length=300)
    related_people: Optional[str] = Field(default=None, max_length=500)


class MoodCreate(BaseModel):
    patient_id: str
    mood: str = Field(min_length=1, max_length=40)


class MemoryLinkCreate(BaseModel):
    patient_id: str
    source_memory_id: int = Field(gt=0)
    target_memory_id: int = Field(gt=0)
    relationship_label: str = Field(default="Related to", min_length=2, max_length=60)
