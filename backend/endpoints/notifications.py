from fastapi import Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from dependencies import get_db
from models import Notification, User
from schemas import (
    NotificationCreate,
    NotificationScheduledCreate,
    NotificationResponse,
    NotificationListResponse,
    NotificationStats,
    UnreadCount,
    NotificationType,
    NotificationPriority
)
from dependencies import get_current_user


async def create_notification(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creare notificare"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create notifications manually"
        )
    
    user = db.query(User).filter(User.id == notification_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    new_notification = Notification(
        user_id=notification_data.user_id,
        notification_type=notification_data.notification_type,
        title=notification_data.title,
        message=notification_data.message,
        priority=notification_data.priority,
        action_url=notification_data.action_url,
        action_label=notification_data.action_label,
        related_entity_type=notification_data.related_entity_type,
        related_entity_id=notification_data.related_entity_id,
        delivery_method=notification_data.delivery_method,
        metadata=notification_data.metadata,
        sent_at=datetime.now()
    )
    
    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)
    
    return new_notification


async def create_scheduled_notification(
    notification_data: NotificationScheduledCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creare notificare programată"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create scheduled notifications"
        )
    
    new_notification = Notification(
        user_id=notification_data.user_id,
        notification_type=notification_data.notification_type,
        title=notification_data.title,
        message=notification_data.message,
        priority=notification_data.priority,
        action_url=notification_data.action_url,
        action_label=notification_data.action_label,
        related_entity_type=notification_data.related_entity_type,
        related_entity_id=notification_data.related_entity_id,
        delivery_method=notification_data.delivery_method,
        metadata=notification_data.metadata,
        scheduled_for=notification_data.scheduled_for
    )
    
    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)
    
    return new_notification


async def get_my_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
    notification_type: Optional[NotificationType] = None,
    priority: Optional[NotificationPriority] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obține notificările user-ului"""
    
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    if notification_type:
        query = query.filter(Notification.notification_type == notification_type)
    
    if priority:
        query = query.filter(Notification.priority == priority)
    
    query = query.filter(
        (Notification.expires_at.is_(None)) | (Notification.expires_at > func.now())
    )
    
    notifications = query.order_by(
        Notification.is_read,
        Notification.priority.desc(),
        Notification.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return notifications


async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Număr notificări necitite"""
    
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
        (Notification.expires_at.is_(None)) | (Notification.expires_at > func.now())
    ).count()
    
    return UnreadCount(count=count)


async def get_notification_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Statistici notificări"""
    
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        (Notification.expires_at.is_(None)) | (Notification.expires_at > func.now())
    ).all()
    
    total_count = len(notifications)
    unread_count = sum(1 for n in notifications if not n.is_read)
    
    by_type = {}
    for n in notifications:
        by_type[n.notification_type] = by_type.get(n.notification_type, 0) + 1
    
    by_priority = {}
    for n in notifications:
        by_priority[n.priority] = by_priority.get(n.priority, 0) + 1
    
    return NotificationStats(
        total_count=total_count,
        unread_count=unread_count,
        by_type=by_type,
        by_priority=by_priority
    )


async def get_notification_by_id(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obține o notificare"""
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return notification


async def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marchează ca citită"""
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now()
        db.commit()
        db.refresh(notification)
    
    return notification


async def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marchează toate ca citite"""
    
    updated_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({
        "is_read": True,
        "read_at": datetime.now()
    })
    
    db.commit()
    
    return {"updated_count": updated_count}


async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Șterge notificare"""
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    db.delete(notification)
    db.commit()
    
    return None


async def delete_all_read_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Șterge toate citite"""
    
    deleted_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == True
    ).delete()
    
    db.commit()
    
    return {"deleted_count": deleted_count}


async def get_all_notifications_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin: toate notificările"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access all notifications"
        )
    
    query = db.query(Notification)
    
    if user_id:
        query = query.filter(Notification.user_id == user_id)
    
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    
    return notifications