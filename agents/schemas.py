from pydantic import BaseModel, Field


class CitizenReportInput(BaseModel):
    text: str | None = None
    image_path: str | None = None
    lat: float | None = None
    lng: float | None = None
    district_suggestion: str | None = None


class FilterAgentResult(BaseModel):
    valid: bool
    score: float = Field(ge=0.0, le=1.0)
    reason: str
    missing_fields: list[str]
    safety_warning: str | None = None
    image_used: bool
    raw_model_response: str | None = None
