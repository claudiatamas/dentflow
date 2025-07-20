from typing import Optional
from sqlalchemy.orm import Session
import models

def get_doctor_id(db: Session, user_id: int) -> Optional[int]:
    """
    Returns the doctor_id associated with the given user_id.
    If the user is not a doctor, returns None.
    """
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user_id).first()
    return doctor.id if doctor else None
