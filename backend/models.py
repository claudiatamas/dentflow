from sqlalchemy import Column, Integer, String, Date, Enum, ForeignKey, Text, TIMESTAMP, Float, DateTime, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base
import enum
from datetime import datetime

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


class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    specialty = Column(String(55))
    description = Column(Text)
    accreditation = Column(String(255), nullable=True)

    user = relationship("User", back_populates="doctor")
    stocks = relationship("Stock", back_populates="doctor")
    stock_changes = relationship("StockChange", back_populates="doctor")


class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    description = Column(Text)

    user = relationship("User", back_populates="patient")


class Material(Base):
    __tablename__ = "materials"

    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String, nullable=False)
    unit           = Column(String)
    price_per_unit = Column(Float)
    sku            = Column(String, unique=True, index=True)
    min_quantity   = Column(Integer, default=0)
    active         = Column(Boolean, default=True)

    stocks        = relationship("Stock", back_populates="material")
    stock_changes = relationship("StockChange", back_populates="material")


class Stock(Base):
    __tablename__ = "stock"

    id          = Column(Integer, primary_key=True, index=True)
    doctor_id   = Column(Integer, ForeignKey("doctors.id"))
    material_id = Column(Integer, ForeignKey("materials.id"))
    quantity    = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow)

    material = relationship("Material", back_populates="stocks")
    doctor   = relationship("Doctor", back_populates="stocks")


class StockChange(Base):
    __tablename__ = "stock_changes"

    id            = Column(Integer, primary_key=True, index=True)
    doctor_id     = Column(Integer, ForeignKey("doctors.id"))
    material_id   = Column(Integer, ForeignKey("materials.id"))
    change_amount = Column(Integer)
    reason        = Column(String)
    changed_at    = Column(DateTime, default=datetime.utcnow)

    material = relationship("Material", back_populates="stock_changes")
    doctor   = relationship("Doctor", back_populates="stock_changes")