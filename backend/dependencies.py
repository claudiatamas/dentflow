from typing import Any
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
import models
from database import SessionLocal




def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_doctor_id(
    db: Session = Depends(get_db),
    current_user: Any = Depends(lambda: None)  
) -> int:
    """
    Extract doctor_id from current authenticated user.
    Must be used AFTER get_current_user dependency.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    if current_user.role != models.UserRole.doctor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only doctors can manage stock."
        )
    
    doctor = db.query(models.Doctor).filter(
        models.Doctor.user_id == current_user.id
    ).first()
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found. Please complete your profile setup."
        )
    
    return doctor.id

