from fastapi import Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from dependencies import get_db
from models import Feedback, User, Doctor, Patient
from schemas import (
    FeedbackDoctorToPatientCreate,
    FeedbackPatientToDoctorCreate,
    FeedbackUserToAppCreate,
    FeedbackResponseCreate,
    FeedbackStatusUpdate,
    FeedbackResponse,
    FeedbackDetailResponse,
    DoctorFeedbackStats,
    FeedbackStatus,
    FeedbackCategory,
)
from dependencies import get_current_user



async def create_doctor_to_patient_feedback(
    feedback_data: FeedbackDoctorToPatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Doctor dă feedback la pacient după consultație"""
    
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can provide feedback to patients"
        )
    
    patient = db.query(Patient).filter(Patient.id == feedback_data.to_patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    new_feedback = Feedback(
        from_user_id=current_user.id,
        feedback_category=FeedbackCategory.DOCTOR_TO_PATIENT,
        to_patient_id=feedback_data.to_patient_id,
        appointment_id=feedback_data.appointment_id,
        comment=feedback_data.comment,
        status=FeedbackStatus.PENDING
    )
    
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    
    return new_feedback


async def create_patient_to_doctor_feedback(
    feedback_data: FeedbackPatientToDoctorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Pacient dă feedback la doctor după consultație"""
    
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can provide feedback to doctors"
        )
    
    doctor = db.query(Doctor).filter(Doctor.id == feedback_data.to_doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    new_feedback = Feedback(
        from_user_id=current_user.id,
        feedback_category=FeedbackCategory.PATIENT_TO_DOCTOR,
        to_doctor_id=feedback_data.to_doctor_id,
        appointment_id=feedback_data.appointment_id,
        rating=feedback_data.rating,
        punctuality_rating=feedback_data.punctuality_rating,
        communication_rating=feedback_data.communication_rating,
        professionalism_rating=feedback_data.professionalism_rating,
        equipment_rating=feedback_data.equipment_rating,
        comment=feedback_data.comment,
        is_public=feedback_data.is_public,
        status=FeedbackStatus.PENDING
    )
    
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    
    return new_feedback


async def create_app_feedback(
    feedback_data: FeedbackUserToAppCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Orice utilizator dă feedback la aplicație"""
    
    new_feedback = Feedback(
        from_user_id=current_user.id,
        feedback_category=FeedbackCategory.USER_TO_APP,
        app_section=feedback_data.app_section,
        severity=feedback_data.severity,
        title=feedback_data.title,
        comment=feedback_data.comment,
        status=FeedbackStatus.PENDING
    )
    
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    
    return new_feedback


async def get_my_feedbacks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    category: Optional[FeedbackCategory] = None,
    status_filter: Optional[FeedbackStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obține feedback-urile date de user"""
    
    query = db.query(Feedback).filter(Feedback.from_user_id == current_user.id)
    
    if category:
        query = query.filter(Feedback.feedback_category == category)
    
    if status_filter:
        query = query.filter(Feedback.status == status_filter)
    
    feedbacks = query.order_by(Feedback.created_at.desc()).offset(skip).limit(limit).all()
    return feedbacks


async def get_received_feedbacks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[FeedbackStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obține feedback-urile primite"""
    
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    
    if doctor:
        query = db.query(Feedback).filter(
            Feedback.feedback_category == FeedbackCategory.PATIENT_TO_DOCTOR,
            Feedback.to_doctor_id == doctor.id
        )
    elif patient:
        query = db.query(Feedback).filter(
            Feedback.feedback_category == FeedbackCategory.DOCTOR_TO_PATIENT,
            Feedback.to_patient_id == patient.id
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors and patients can receive feedbacks"
        )
    
    if status_filter:
        query = query.filter(Feedback.status == status_filter)
    
    feedbacks = query.order_by(Feedback.created_at.desc()).offset(skip).limit(limit).all()
    return feedbacks


async def get_app_feedbacks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    severity: Optional[str] = None,
    status_filter: Optional[FeedbackStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin obține feedback-uri la aplicație"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view app feedbacks"
        )
    
    query = db.query(Feedback).filter(
        Feedback.feedback_category == FeedbackCategory.USER_TO_APP
    )
    
    if severity:
        query = query.filter(Feedback.severity == severity)
    
    if status_filter:
        query = query.filter(Feedback.status == status_filter)
    
    feedbacks = query.order_by(
        Feedback.severity.desc(),
        Feedback.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return feedbacks


async def get_feedback_by_id(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obține un feedback specific"""
    
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    
    has_access = (
        feedback.from_user_id == current_user.id or
        (doctor and feedback.to_doctor_id == doctor.id) or
        (patient and feedback.to_patient_id == patient.id) or
        current_user.role == "admin"
    )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this feedback"
        )
    
    return feedback


async def get_doctor_feedback_stats(
    doctor_id: int,
    db: Session = Depends(get_db)
):
    """Statistici feedback doctor"""
    
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    feedbacks = db.query(Feedback).filter(
        Feedback.feedback_category == FeedbackCategory.PATIENT_TO_DOCTOR,
        Feedback.to_doctor_id == doctor_id,
        Feedback.status != FeedbackStatus.ARCHIVED
    ).all()
    
    if not feedbacks:
        return DoctorFeedbackStats(
            total_feedbacks=0,
            average_rating=0.0,
            avg_punctuality=None,
            avg_communication=None,
            avg_professionalism=None,
            avg_equipment=None,
            five_star_count=0,
            four_star_count=0,
            three_star_count=0,
            two_star_count=0,
            one_star_count=0
        )
    
    total = len(feedbacks)
    ratings = [f.rating for f in feedbacks if f.rating]
    
    return DoctorFeedbackStats(
        total_feedbacks=total,
        average_rating=sum(ratings) / len(ratings) if ratings else 0.0,
        avg_punctuality=sum(f.punctuality_rating for f in feedbacks if f.punctuality_rating) / 
                       len([f for f in feedbacks if f.punctuality_rating]) 
                       if any(f.punctuality_rating for f in feedbacks) else None,
        avg_communication=sum(f.communication_rating for f in feedbacks if f.communication_rating) / 
                         len([f for f in feedbacks if f.communication_rating])
                         if any(f.communication_rating for f in feedbacks) else None,
        avg_professionalism=sum(f.professionalism_rating for f in feedbacks if f.professionalism_rating) / 
                           len([f for f in feedbacks if f.professionalism_rating])
                           if any(f.professionalism_rating for f in feedbacks) else None,
        avg_equipment=sum(f.equipment_rating for f in feedbacks if f.equipment_rating) / 
                     len([f for f in feedbacks if f.equipment_rating])
                     if any(f.equipment_rating for f in feedbacks) else None,
        five_star_count=sum(1 for f in feedbacks if f.rating == 5),
        four_star_count=sum(1 for f in feedbacks if f.rating == 4),
        three_star_count=sum(1 for f in feedbacks if f.rating == 3),
        two_star_count=sum(1 for f in feedbacks if f.rating == 2),
        one_star_count=sum(1 for f in feedbacks if f.rating == 1)
    )


async def update_feedback_status(
    feedback_id: int,
    status_data: FeedbackStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update status feedback"""
    
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    
    has_access = (
        (doctor and feedback.to_doctor_id == doctor.id) or
        (patient and feedback.to_patient_id == patient.id) or
        current_user.role == "admin"
    )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this feedback"
        )
    
    feedback.status = status_data.status
    db.commit()
    db.refresh(feedback)
    
    return feedback


async def respond_to_feedback(
    feedback_id: int,
    response_data: FeedbackResponseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Răspunde la feedback"""
    
    from sqlalchemy import func
    
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    
    has_access = (
        (doctor and feedback.to_doctor_id == doctor.id) or
        (current_user.role == "admin" and feedback.feedback_category == FeedbackCategory.USER_TO_APP)
    )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to respond to this feedback"
        )
    
    feedback.response = response_data.response
    feedback.responded_by = current_user.id
    feedback.responded_at = func.now()
    feedback.status = FeedbackStatus.RESPONDED
    
    db.commit()
    db.refresh(feedback)
    
    return feedback


async def delete_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Șterge feedback"""
    
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    if feedback.from_user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this feedback"
        )
    
    db.delete(feedback)
    db.commit()
    
    return None