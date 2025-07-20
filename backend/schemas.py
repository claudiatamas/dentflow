from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime
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
    gender: Optional[Gender]
    birth_date: date
    creation_date: Optional[datetime] = None


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



class MaterialBase(BaseModel):
    name: str
    unit: Optional[str] = None
    price_per_unit: Optional[float] = None
    sku: Optional[str] = None
    min_quantity: int = 0
    active: bool = True

class MaterialCreate(MaterialBase):
    pass

class MaterialOut(MaterialBase):
    id: int
    class Config:
        from_attributes = True


class StockUpdate(BaseModel):
    quantity: Optional[int]

class StockChangeCreate(BaseModel):
    material_id: int
    change_amount: int
    reason: str

class StockChangeOut(StockChangeCreate):
    id: int
    doctor_id: int
    changed_at: datetime
    class Config:
        form_attributes = True

class StockOut(BaseModel):
    id: int
    doctor_id: int
    material_id: int
    quantity: int
    last_updated: datetime
    material: MaterialOut
    class Config:
        form_attributes = True