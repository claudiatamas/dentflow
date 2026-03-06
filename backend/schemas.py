from pydantic import BaseModel, EmailStr, Field, validator, field_validator
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime, date, time
from enum import Enum


class UserRole(str, Enum):
    administrator = "administrator"
    doctor = "doctor"
    patient = "patient"


class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"


class UserLogin(BaseModel):
    email: str
    password: str


class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: UserRole
    phone: Optional[str] = None
    gender: Optional[Gender] = None
    birth_date: Optional[date] = None
    country: Optional[str] = None
    county: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None


class DoctorUpdate(BaseModel):
    specialty: Optional[str] = None
    description: Optional[str] = None
    accreditation: Optional[str] = None

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    country: Optional[str] = None
    county: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    birth_date: Optional[str] = None  
    status: Optional[str] = None
    doctor: Optional[DoctorUpdate] = None

# ==================== Material Schemas ====================
class MaterialCreate(BaseModel):
    name: str
    unit: str
    price_per_unit: float = Field(..., gt=0)
    sku: Optional[str] = None
    min_quantity: float = Field(default=0, ge=0)
    active: bool = True


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    price_per_unit: Optional[float] = Field(None, gt=0)
    sku: Optional[str] = None
    min_quantity: Optional[float] = Field(None, ge=0)
    active: Optional[bool] = None


class MaterialResponse(BaseModel):
    id: int
    name: str
    unit: str
    price_per_unit: float
    sku: Optional[str]
    min_quantity: float
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Stock Schemas ====================
class StockResponse(BaseModel):
    id: int
    doctor_id: int
    material_id: int
    quantity: float
    last_updated: Optional[datetime]

    class Config:
        from_attributes = True


class StockUpdate(BaseModel):
    material_id: int
    quantity_change: float
    reason: Optional[str] = None


class MaterialBasic(BaseModel):
    id: int
    name: str
    unit: str
    price_per_unit: float
    sku: Optional[str]
    min_quantity: float


class StockWithMaterial(BaseModel):
    id: int
    doctor_id: int
    material_id: int
    quantity: float
    last_updated: Optional[datetime]
    material: MaterialBasic


# ==================== Stock Change Schemas ====================
class StockChangeCreate(BaseModel):
    material_id: int
    quantity_change: float
    reason: Optional[str] = None


class StockChangeResponse(BaseModel):
    id: int
    doctor_id: int
    material_id: int
    quantity_change: float
    reason: Optional[str]
    changed_at: datetime

    class Config:
        from_attributes = True


class MaterialMinimal(BaseModel):
    id: int
    name: str
    unit: str


class StockChangeWithMaterial(BaseModel):
    id: int
    doctor_id: int
    material_id: int
    quantity_change: float
    reason: Optional[str]
    changed_at: datetime
    material: Optional[MaterialMinimal]


# ==================== Alerts & Summary ====================
class LowStockAlert(BaseModel):
    material_id: int
    material_name: str
    current_quantity: float
    min_quantity: float
    unit: str


class LowStockAlertsResponse(BaseModel):
    alerts: List[LowStockAlert]


class StockSummary(BaseModel):
    total_items: int
    total_value: float
    low_stock_count: int


class UserDependency(BaseModel):
    id: int
    role: UserRole 
    email: EmailStr 
    
    class Config:
        from_attributes = True 


# ==================== Blog ====================

class BlogBase(BaseModel):
    """Schema de bază care conține câmpurile comune pentru crearea/actualizarea Blog-ului."""
    
    post_type: Literal['internal', 'external'] 
    title: str = Field(..., max_length=255)
    short_description: Optional[str] = Field(None, max_length=500)
    featured_image_url: Optional[str] = Field(None, max_length=255)
    
    content: Optional[str] = None
    external_link: Optional[str] = Field(None, max_length=255)


class BlogCreate(BlogBase):
    """Schema pentru crearea unei postări. Include validare specifică pentru tipul postării."""
    
    is_active: bool = False 
    published_at: Optional[datetime] = None

    @validator('content', always=True)
    def validate_internal_content(cls, v, values):
        """Asigură că 'content' este prezent dacă post_type este 'internal'."""
        if values.get('post_type') == 'internal':
            if not v:
                raise ValueError('Content este obligatoriu pentru postările interne.')
            if values.get('external_link'):
                raise ValueError('Nu se poate avea și content, și external_link.')
        return v
    
    @validator('external_link', always=True)
    def validate_external_link(cls, v, values):
        """Asigură că 'external_link' este prezent dacă post_type este 'external'."""
        if values.get('post_type') == 'external':
            if not v:
                raise ValueError('External_link este obligatoriu pentru postările externe.')
            if values.get('content'):
                raise ValueError('Nu se poate avea și content, și external_link.')
        return v


class BlogUpdate(BlogBase):
    """Schema pentru actualizare parțială (PATCH). Toate câmpurile sunt opționale."""
    
    post_type: Optional[Literal['internal', 'external']] = None
    title: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None
    published_at: Optional[datetime] = None
    
    @validator('content', 'external_link', always=True, pre=True)
    def check_content_and_link_coexistence(cls, v, values):
        """Previnem trimiterea ambelor content și external_link în aceeași cerere PATCH."""
        if 'content' in values and 'external_link' in values and values['content'] is not None and values['external_link'] is not None:
             raise ValueError('Nu se pot actualiza simultan content și external_link.')
        return v


class BlogRead(BlogBase):
    """Schema completă de citire."""
    id: int
    author_id: int
    views_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


    class Config:
        from_attributes = True 
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


# ==================== APPOINTMENTS ====================
# ---- AppointmentType ----
class AppointmentTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#93C5FD"
    duration_minutes: int = 60
    price: Optional[float] = None  

class AppointmentTypeCreate(AppointmentTypeBase):
    pass

class AppointmentTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    duration_minutes: Optional[int] = None
    price: Optional[float] = None  

class AppointmentTypeOut(AppointmentTypeBase):
    id: int
    doctor_id: int
    created_at: datetime
    duration_minutes: int
    price: Optional[float] = None

    class Config:
        from_attributes = True

# ---- Appointment ----
class AppointmentBase(BaseModel):
    doctor_id: int
    patient_id: int
    appointment_type_id: Optional[int] = None
    appointment_date: datetime
    start_time: time
    end_time: time
    description: Optional[str] = None
    message: Optional[str] = None
    status: Optional[str] = "scheduled"
    duration_minutes: Optional[int] = None



class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    appointment_type_id: Optional[int] = None
    appointment_date: Optional[datetime] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    description: Optional[str] = None
    message: Optional[str] = None
    status: Optional[str] = None
    duration_minutes: Optional[int] = None

class AppointmentOut(AppointmentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---- Work Schedule ----
class WorkScheduleBase(BaseModel):
    day_of_week: int
    start_time: time
    end_time: time

class WorkScheduleCreate(BaseModel):
    day_of_week: int
    start_time: time
    end_time: time

class WorkScheduleUpdate(BaseModel):
    day_of_week: int
    start_time: Optional[time] = None
    end_time: Optional[time] = None

class WorkScheduleOut(WorkScheduleBase):
    id: int
    doctor_id: int

    class Config:
        orm_mode = True





# ============= CHAT =================
# ── Request Schemas ──────────────────────────────────────────
class MessageCreate(BaseModel):
    receiver_id: int
    content: str
    appointment_id: Optional[int] = None

    @validator("content")
    def content_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Message content cannot be empty")
        if len(v) > 2000:
            raise ValueError("Message too long (max 2000 characters)")
        return v.strip()


class MessageMarkRead(BaseModel):
    message_ids: Optional[List[int]] = None  # None = mark all from sender


# ── Response Schemas ─────────────────────────────────────────
class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    timestamp: datetime
    is_read: bool
    appointment_id: Optional[int] = None
    sender_first_name: str
    sender_last_name: str
    sender_profile_picture: Optional[str] = None

    class Config:
        from_attributes = True


class ConversationPreview(BaseModel):
    """Preview of a conversation shown in the sidebar list"""
    other_user_id: int
    other_user_first_name: str
    other_user_last_name: str
    other_user_role: str
    other_user_profile_picture: Optional[str] = None
    last_message_content: str
    last_message_timestamp: datetime
    last_message_sender_id: int
    unread_count: int

    class Config:
        from_attributes = True

# ══════════════════════════════════════════════════════════════
# TREATMENT
# ══════════════════════════════════════════════════════════════

class TreatmentCreate(BaseModel):
    tooth_number:    Optional[str]   = None
    procedure_name:  str
    description:     Optional[str]   = None
    cost:            Optional[float] = None
    treatment_date:  date
    status:          Optional[str]   = 'completed'
    appointment_id:  Optional[int]   = None

    @validator('status')
    def status_valid(cls, v):
        allowed = ['planned', 'in_progress', 'completed']
        if v not in allowed:
            raise ValueError(f"Status must be one of: {allowed}")
        return v


class TreatmentResponse(BaseModel):
    id:              int
    tooth_number:    Optional[str]
    procedure_name:  str
    description:     Optional[str]
    cost:            Optional[float]
    treatment_date:  date
    status:          str
    appointment_id:  Optional[int]

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════
# PRESCRIPTION
# ══════════════════════════════════════════════════════════════

class PrescriptionCreate(BaseModel):
    medication_name: str
    dosage:          Optional[str] = None
    frequency:       Optional[str] = None
    duration:        Optional[str] = None
    notes:           Optional[str] = None
    prescribed_date: date
    appointment_id:  Optional[int] = None


class PrescriptionResponse(BaseModel):
    id:              int
    medication_name: str
    dosage:          Optional[str]
    frequency:       Optional[str]
    duration:        Optional[str]
    notes:           Optional[str]
    prescribed_date: date
    appointment_id:  Optional[int]

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════
# MEDICAL DOCUMENT
# ══════════════════════════════════════════════════════════════

class MedicalDocumentResponse(BaseModel):
    id:             int
    file_name:      str
    file_url:       str
    file_type:      Optional[str]
    file_size:      Optional[int]
    document_type:  str
    description:    Optional[str]
    uploaded_at:    datetime
    appointment_id: Optional[int]

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════
# MEDICAL RECORD
# ══════════════════════════════════════════════════════════════

class MedicalRecordCreate(BaseModel):
    patient_id:         int
    blood_type:         Optional[str] = None
    allergies:          Optional[str] = None
    chronic_conditions: Optional[str] = None
    notes:              Optional[str] = None

    @validator('blood_type')
    def blood_type_valid(cls, v):
        if v is None:
            return v
        allowed = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-']
        if v not in allowed:
            raise ValueError(f"Blood type must be one of: {allowed}")
        return v


class MedicalRecordUpdate(BaseModel):
    blood_type:         Optional[str] = None
    allergies:          Optional[str] = None
    chronic_conditions: Optional[str] = None
    notes:              Optional[str] = None


class MedicalRecordResponse(BaseModel):
    id:                 int
    patient_id:         int
    doctor_id:          int
    patient_name:       str
    patient_picture:    Optional[str]
    doctor_name:        str
    doctor_specialty:   Optional[str]
    blood_type:         Optional[str]
    allergies:          Optional[str]
    chronic_conditions: Optional[str]
    notes:              Optional[str]
    created_at:         datetime
    updated_at:         datetime
    treatments:         List[TreatmentResponse]
    prescriptions:      List[PrescriptionResponse]
    documents:          List[MedicalDocumentResponse]

    class Config:
        from_attributes = True

# ==================== SUPPORT TICKETS ====================

class TicketMessageOut(BaseModel):
    id         : int
    ticket_id  : int
    user_id    : int
    message    : str
    is_admin   : bool
    created_at : datetime
    sender_name: Optional[str] = None

    class Config:
        from_attributes = True


class SupportTicketCreate(BaseModel):
    subject    : str
    description: str
    category   : Optional[str] = "general"
    priority   : Optional[str] = "medium"


class SupportTicketUpdate(BaseModel):
    status  : Optional[str] = None
    priority: Optional[str] = None


class SupportTicketOut(BaseModel):
    id             : int
    user_id        : int
    subject        : str
    description    : str
    category       : str
    priority       : str
    status         : str
    attachment_path: Optional[str] = None
    created_at     : datetime
    updated_at     : datetime
    messages       : List[TicketMessageOut] = []
    submitter_name : Optional[str] = None
    submitter_role : Optional[str] = None

    class Config:
        from_attributes = True


class TicketMessageCreate(BaseModel):
    message: str



# ── Doctor Review ─────────────────────────────────────────────
class DoctorReviewCreate(BaseModel):
    appointment_id: int
    stars:          int = Field(..., ge=1, le=5)
    message:        Optional[str] = None

class DoctorReviewOut(BaseModel):
    id:             int
    doctor_id:      int
    patient_id:     int
    appointment_id: int
    stars:          int
    message:        Optional[str]
    created_at:     datetime
    patient_name:   Optional[str] = None   # joined in route

    class Config:
        from_attributes = True

class DoctorRatingSummary(BaseModel):
    average_stars: float
    total_reviews: int

# ── App Feedback ──────────────────────────────────────────────
class AppFeedbackCreate(BaseModel):
    stars:   int = Field(..., ge=1, le=5)
    message: Optional[str] = None

class AppFeedbackOut(BaseModel):
    id:         int
    user_id:    int
    stars:      int
    message:    Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
