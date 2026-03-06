from sqlalchemy import Column,ARRAY,  Integer,text,CheckConstraint, Index ,Time, String, Date, Enum, Numeric,ForeignKey, Text, TIMESTAMP, Float, DateTime, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from database import Base
import enum
from sqlalchemy.sql import func
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB

class UserRole(str, enum.Enum):
    administrator = "administrator"
    doctor = "doctor"
    patient = "patient"


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class Status(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"

#==============FEEDBACK================
class DoctorReview(Base):
    __tablename__ = "doctor_reviews"

    id             = Column(Integer, primary_key=True, index=True)
    doctor_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    patient_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, unique=True)
    stars          = Column(Integer, CheckConstraint("stars BETWEEN 1 AND 5"), nullable=False)
    message        = Column(Text, nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

class AppFeedback(Base):
    __tablename__ = "app_feedback"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    stars      = Column(Integer, CheckConstraint("stars BETWEEN 1 AND 5"), nullable=False)
    message    = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(55), nullable=False)
    last_name = Column(String(55), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    phone = Column(String(20), nullable=True)
    gender = Column(Enum(Gender), nullable=True)
    creation_date = Column(TIMESTAMP, default=None)
    last_login = Column(TIMESTAMP, default=None)
    profile_picture = Column(String(255), nullable=True)
    status = Column(Enum(Status), default="active")
    country = Column(String(55), nullable=True)
    county = Column(String(55), nullable=True)
    city = Column(String(55), nullable=True)
    address = Column(String(255), nullable=True)
    birth_date = Column(Date, nullable=True)

    doctor = relationship("Doctor", uselist=False, back_populates="user")
    patient = relationship("Patient", uselist=False, back_populates="user")
    support_tickets = relationship("SupportTicket", back_populates="user")
   


class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    specialty = Column(String(55))
    description = Column(Text)
    accreditation = Column(String(255), nullable=True)

    user = relationship("User", back_populates="doctor")
    stocks = relationship("Stock", back_populates="doctor", cascade="all, delete-orphan")
    stock_changes = relationship("StockChange", back_populates="doctor", cascade="all, delete-orphan")
    appointment_types = relationship("AppointmentType", back_populates="doctor", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan")
    work_schedules = relationship("WorkSchedule", back_populates="doctor", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Doctor(id={self.id})>"
    

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    description = Column(Text)

    user = relationship("User", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")


# ==================== Material Model ====================
class Material(Base):
    __tablename__ = "materials"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, nullable=False)
    unit = Column(Text, nullable=False)
    price_per_unit = Column(Numeric(10, 2), nullable=False)
    sku = Column(Text, unique=True, nullable=True)
    min_quantity = Column(Numeric(10, 2), default=0)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    

    stocks = relationship("Stock", back_populates="material", cascade="all, delete-orphan")
    stock_changes = relationship("StockChange", back_populates="material", cascade="all, delete-orphan")


# ==================== Stock Model ====================
class Stock(Base):
    __tablename__ = "stock"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(Numeric(10, 2), default=0)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    

    doctor = relationship("Doctor", back_populates="stocks")
    material = relationship("Material", back_populates="stocks")


# ==================== StockChange Model ====================
class StockChange(Base):
    __tablename__ = "stock_changes"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity_change = Column(Numeric(10, 2), nullable=False)
    reason = Column(Text, nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    

    doctor = relationship("Doctor", back_populates="stock_changes")
    material = relationship("Material", back_populates="stock_changes")

# ==================== Blog Model ====================

class Blog(Base):
    __tablename__ = "blogs"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    post_type = Column(String(10), nullable=False) 
    title = Column(String(255), nullable=False)
    short_description = Column(String(500), nullable=True)
    
    content = Column(Text, nullable=True) 
    external_link = Column(String(255), nullable=True)
    featured_image_url = Column(String(255), nullable=True)

    views_count = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    published_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime(timezone=False), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=False), nullable=False, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("post_type IN ('internal', 'external')", name='post_type_check'),
    )

# ==================== APPOINTMENTS ====================

class AppointmentType(Base):
    __tablename__ = "appointment_types"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    color = Column(String(50), nullable=True, default="#ADD8E6")
    duration_minutes = Column(Integer, nullable=False, default=60)
    price = Column(Numeric(10, 2), nullable=True)

    doctor = relationship("Doctor", back_populates="appointment_types")
    appointments = relationship("Appointment", back_populates="appointment_type")

class WorkSchedule(Base):
    __tablename__ = "work_schedules"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0 = Monday, 6 = Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    doctor = relationship("Doctor", back_populates="work_schedules")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    appointment_type_id = Column(Integer, ForeignKey("appointment_types.id", ondelete="SET NULL"))
    appointment_date = Column(TIMESTAMP(timezone=True), nullable=False)
    description = Column(Text)
    message = Column(Text)
    status = Column(String(50), default="scheduled")
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    duration_minutes = Column(Integer, default=30)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    doctor = relationship("Doctor", back_populates="appointments")
    patient = relationship("Patient", back_populates="appointments")
    appointment_type = relationship("AppointmentType", back_populates="appointments")



# ======================= CHAT ==============================
class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)


    sender = relationship("User", foreign_keys=[sender_id], backref="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], backref="received_messages")
    appointment = relationship("Appointment", foreign_keys=[appointment_id])



#===================== RECORDS =========================
class MedicalRecord(Base):
    __tablename__ = "medical_records"
    __table_args__ = (UniqueConstraint('patient_id', 'doctor_id'),)

    id                  = Column(Integer, primary_key=True, index=True)
    patient_id          = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id           = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    blood_type          = Column(String(5))
    allergies           = Column(Text)
    chronic_conditions  = Column(Text)
    notes               = Column(Text)
    created_at          = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    patient       = relationship("Patient", foreign_keys=[patient_id])
    doctor        = relationship("Doctor",  foreign_keys=[doctor_id])
    treatments    = relationship("Treatment",       back_populates="medical_record", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription",    back_populates="medical_record", cascade="all, delete-orphan")
    documents     = relationship("MedicalDocument", back_populates="medical_record", cascade="all, delete-orphan")


class Treatment(Base):
    __tablename__ = "treatments"

    id                = Column(Integer, primary_key=True, index=True)
    medical_record_id = Column(Integer, ForeignKey("medical_records.id", ondelete="CASCADE"), nullable=False)
    appointment_id    = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    tooth_number      = Column(String(10))
    procedure_name    = Column(String(255), nullable=False)
    description       = Column(Text)
    cost              = Column(Numeric(10, 2))
    treatment_date    = Column(Date, nullable=False)
    status            = Column(String(20), default='completed')
    created_at        = Column(DateTime, default=datetime.utcnow, nullable=False)

    medical_record = relationship("MedicalRecord", back_populates="treatments")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id                = Column(Integer, primary_key=True, index=True)
    medical_record_id = Column(Integer, ForeignKey("medical_records.id", ondelete="CASCADE"), nullable=False)
    appointment_id    = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    medication_name   = Column(String(255), nullable=False)
    dosage            = Column(String(100))
    frequency         = Column(String(100))
    duration          = Column(String(100))
    notes             = Column(Text)
    prescribed_date   = Column(Date, nullable=False)
    created_at        = Column(DateTime, default=datetime.utcnow, nullable=False)

    medical_record = relationship("MedicalRecord", back_populates="prescriptions")


class MedicalDocument(Base):
    __tablename__ = "medical_documents"

    id                = Column(Integer, primary_key=True, index=True)
    medical_record_id = Column(Integer, ForeignKey("medical_records.id", ondelete="CASCADE"), nullable=False)
    appointment_id    = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    file_name         = Column(String(255), nullable=False)
    file_path         = Column(String(500), nullable=False)
    file_type         = Column(String(50))
    file_size         = Column(Integer)
    document_type     = Column(String(50), default='other')
    description       = Column(Text)
    uploaded_at       = Column(DateTime, default=datetime.utcnow, nullable=False)

    medical_record = relationship("MedicalRecord", back_populates="documents")


#===============SUPPORT TICKETS=================
class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject         = Column(String(255), nullable=False)
    description     = Column(Text, nullable=False)
    category        = Column(String(50), nullable=False, default="general")
    priority        = Column(String(20), nullable=False, default="medium")
    status          = Column(String(20), nullable=False, default="open")
    attachment_path = Column(String(500), nullable=True)
    created_at      = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at      = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user     = relationship("User", back_populates="support_tickets")
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan")


class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id         = Column(Integer, primary_key=True, index=True)
    ticket_id  = Column(Integer, ForeignKey("support_tickets.id"), nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    message    = Column(Text, nullable=False)
    is_admin   = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    ticket = relationship("SupportTicket", back_populates="messages")
    user = relationship("User")


#================NOTIFICATIONS==============

class Notification(Base):
    __tablename__ = "notifications"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type        = Column(String(60), nullable=False)
    title       = Column(String(255), nullable=False)
    body        = Column(Text, nullable=False)
    is_read     = Column(Boolean, nullable=False, default=False)
    entity_type = Column(String(50), nullable=True)
    entity_id   = Column(Integer, nullable=True)
    created_at  = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User")



