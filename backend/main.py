from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func, or_, extract
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, time
from typing import Optional, List, Any, Dict
from pathlib import Path
import shutil
import os
from fastapi.staticfiles import StaticFiles
from collections import defaultdict
from apscheduler.schedulers.background import BackgroundScheduler

from dependencies import get_db
from database import SessionLocal
from models import (
    User as DBUser, 
    Doctor, 
    Patient, 
    Stock, 
    StockChange, 
    Material,
    Blog,
    AppointmentType, 
    Appointment,
    WorkSchedule,
    Feedback,
    Message, Treatment, MedicalRecord, Prescription, MedicalDocument,
    SupportTicket,
    TicketMessage,
    Notification
)
from schemas import *
# ==================== Configuration ====================
SECRET_KEY = os.getenv("SECRET_KEY", "secretkey123")  
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
UPLOAD_FOLDER = Path("static/uploads/profile_pictures")
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

# ==================== FastAPI App ====================
app = FastAPI(title="Medical Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Security ====================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ==================== Database ====================
def get_db():
    """Dependency pentru sesiunea de bază de date"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==================== Auth Utilities ====================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifică parola (limitată la 72 caractere pentru bcrypt)"""
    return pwd_context.verify(plain_password[:72], hashed_password)


def get_password_hash(password: str) -> str:
    """Hash-uiește parola (limitată la 72 caractere pentru bcrypt)"""
    return pwd_context.hash(password[:72])


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creează JWT token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Any = Depends(get_db)) -> Any:
#                                                                                   ^^^^
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(DBUser).filter(DBUser.email == email).first() 
    if user is None:
        raise credentials_exception
    
    return user

def get_optional_doctor_id(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user) 
) -> Optional[int]:
    """Returnează ID-ul doctorului doar dacă utilizatorul este doctor."""
    

    if current_user["role"] == "doctor":
        doctor = db.query(Doctor).filter(
            Doctor.user_id == current_user["id"]
        ).first()
        
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found."
            )
        return doctor.id
    
    return None 


def get_current_patient_id(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user) 
) -> Optional[int]:
    """
    Returnează patient_id dacă utilizatorul este 'patient'.
    Aruncă 403 dacă nu este 'patient'.
    """
    
    if current_user["role"] != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only patients can use this endpoint."
        )

    patient = db.query(Patient).filter(
        Patient.user_id == current_user["id"]
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found. Please complete your profile setup."
        )
    
    return patient.id

# ==================== User Serialization ====================
def serialize_user(user: DBUser) -> dict:
    """Serializează un user cu datele specifice rolului"""
    base_data = {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
        "phone": user.phone,
        "gender": user.gender.value if user.gender and hasattr(user.gender, 'value') else user.gender,
        "creation_date": user.creation_date.isoformat() if user.creation_date else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "profile_picture": user.profile_picture,
        "status": user.status.value if hasattr(user.status, 'value') else str(user.status),
        "country": user.country,
        "county": user.county,
        "city": user.city,
        "address": user.address,
        "birth_date": user.birth_date.isoformat() if user.birth_date else None,
    }


    if user.role == UserRole.doctor and user.doctor:
        base_data["doctor"] = {
            "specialty": user.doctor.specialty,
            "description": user.doctor.description,
            "accreditation": user.doctor.accreditation,
        }
   

    return base_data


def get_redirect_url(role: str) -> str:
    """Returnează URL-ul de redirect bazat pe rol"""
    redirect_map = {
        "administrator": "/dashboard_admin",
        "doctor": "/dashboard_doctor",
        "patient": "/dashboard_patient",
    }
    
    if role not in redirect_map:
        raise HTTPException(status_code=400, detail="Invalid user role")
    
    return redirect_map[role]


def get_current_doctor_id(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> int:
    """Get doctor ID for the current user"""
    if current_user.role != UserRole.doctor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only doctors can manage stock."
        )
    
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found. Please complete your profile setup."
        )
    
    return doctor.id


# ==================== File Upload ====================
def save_profile_picture(user_id: int, file: UploadFile) -> str:
    """Salvează imaginea de profil și returnează URL-ul"""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Invalid file")
    
    # Validare tip fișier
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Generare nume unic
    filename = f"user_{user_id}_{datetime.now().timestamp()}{file_ext}"
    file_path = UPLOAD_FOLDER / filename
    
    # Salvare fișier
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    return f"http://localhost:8000/uploads/{filename}"


# ==================== Routes ====================
@app.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    """Înregistrează un utilizator nou"""
    if db.query(DBUser).filter(DBUser.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

   
    new_user = DBUser(
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        password=get_password_hash(user.password),
        role=user.role,
        gender=user.gender,
        birth_date=user.birth_date,
        creation_date=datetime.utcnow(),
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if user.role == UserRole.doctor:
        db.add(Doctor(user_id=new_user.id))
    elif user.role == UserRole.patient:
        db.add(Patient(user_id=new_user.id))
    
    db.commit()

    return {
        "message": "User created successfully",
        "user_id": new_user.id,
        "redirect": "/login"
    }


@app.post("/login")
def login(form_data: UserLogin, db: Session = Depends(get_db)):
    """Autentifică utilizatorul și returnează token"""

    user = db.query(DBUser).filter(DBUser.email == form_data.email).first()
    
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


    user.last_login = datetime.utcnow()
    db.commit()


    role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
    access_token = create_access_token(
        data={"sub": user.email, "role": role_str}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "redirect": get_redirect_url(role_str)
    }

# ==================== PROFILE =============================
@app.get("/me")
def get_current_user_profile(
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obține profilul utilizatorului curent"""
    db.refresh(current_user)
    return serialize_user(current_user)


@app.put("/me")
def update_profile(
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    country: Optional[str] = Form(None),
    county: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    birth_date: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    specialty: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    accreditation: Optional[str] = Form(None),
    profile_picture: Optional[UploadFile] = File(None),
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Actualizează profilul utilizatorului"""
    if email and email != current_user.email:
        existing_user = db.query(DBUser).filter(DBUser.email == email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already in use")

    update_fields = {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "phone": phone,
        "gender": gender,
        "country": country,
        "county": county,
        "city": city,
        "address": address,
        "birth_date": birth_date,
        "status": status,
    }

    for field, value in update_fields.items():
        if value is not None:
            setattr(current_user, field, value)

    if profile_picture and profile_picture.filename:
        current_user.profile_picture = save_profile_picture(current_user.id, profile_picture)

    if current_user.role == UserRole.doctor:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if doctor:
            if specialty is not None:
                doctor.specialty = specialty
            if description is not None:
                doctor.description = description
            if accreditation is not None:
                doctor.accreditation = accreditation

    db.commit()
    db.refresh(current_user)

    return serialize_user(current_user)


@app.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Șterge contul utilizatorului curent și toate datele asociate"""
    
    if current_user.profile_picture:
        try:
            profile_pic_path = UPLOAD_FOLDER / current_user.profile_picture.split('/')[-1]
            if profile_pic_path.exists():
                profile_pic_path.unlink()
        except Exception as e:
            print(f"Error deleting profile picture: {e}")
    
    if current_user.role == UserRole.doctor:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if doctor:
            # CASCADE va șterge automat:
            # - Appointments (unde doctor_id = doctor.id)
            # - Stock (unde doctor_id = doctor.id)
            # - StockChanges (unde doctor_id = doctor.id)
            # - Reviews (unde doctor_id = doctor.id)
            db.delete(doctor)
    
    if current_user.role == UserRole.patient:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if patient:
            # CASCADE va șterge automat:
            # - Appointments (unde patient_id = patient.id)
            # - MedicalRecords (unde patient_id = patient.id)
            # - Reviews (unde patient_id = patient.id)
            db.delete(patient)
    

    db.delete(current_user)
    db.commit()
    
    return None


@app.get("/doctors/me")
def get_my_doctor_profile(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Not a doctor")
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return {"doctor_id": doctor.id}



@app.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    """Servește fișierele uploadate"""
    file_path = UPLOAD_FOLDER / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if not str(file_path.resolve()).startswith(str(UPLOAD_FOLDER.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return FileResponse(file_path)

# ==================== Health Check ====================
@app.get("/health")
def health_check():
    """Verifică starea API-ului"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }




# ==================== Material Management ====================
@app.get("/materials", response_model=List[MaterialResponse])
def get_materials(
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
):
    """Obține lista de materiale (active și inactive)"""
    materials = db.query(Material).order_by(Material.name).all()
    return materials


@app.post("/materials", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    material: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
):
  
    if current_user.role != UserRole.doctor:
        raise HTTPException(status_code=403, detail="Only doctors can create materials")
    

    if material.sku and db.query(Material).filter(Material.sku == material.sku).first():
        raise HTTPException(status_code=400, detail="SKU already exists")
    
    new_material = Material(**material.dict())
    db.add(new_material)
    db.commit()
    db.refresh(new_material)
    return new_material


@app.put("/materials/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: int,
    material: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
):
  
    if current_user.role != UserRole.doctor:
        raise HTTPException(status_code=403, detail="Only doctors can update materials")
    
    db_material = db.query(Material).filter(Material.id == material_id).first()
    if not db_material:
        raise HTTPException(status_code=404, detail="Material not found")
    

    if material.sku and material.sku != db_material.sku:
        if db.query(Material).filter(Material.sku == material.sku).first():
            raise HTTPException(status_code=400, detail="SKU already exists")
    
    for field, value in material.dict(exclude_unset=True).items():
        setattr(db_material, field, value)
    
    db.commit()
    db.refresh(db_material)
    return db_material


# ==================== Stock Management ====================

@app.get("/stock", response_model=List[StockWithMaterial]) 
def get_doctor_stock(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
    doctor_id: int = Depends(get_current_doctor_id)
):
    """Obține toate stocurile doctorului"""
    stocks = db.query(Stock).filter(Stock.doctor_id == doctor_id).all()
    
    result: List[StockWithMaterial] = []
    for stock in stocks:
        if not stock.material:
            continue
        
        material_data = MaterialBasic(
            id=stock.material.id,
            name=stock.material.name,
            unit=stock.material.unit,
            price_per_unit=float(stock.material.price_per_unit),
            sku=stock.material.sku,
            min_quantity=float(stock.material.min_quantity or 0),
            active=stock.material.active
        )
        
        stock_data = StockWithMaterial(
            id=stock.id,
            doctor_id=stock.doctor_id,
            material_id=stock.material_id,
            quantity=float(stock.quantity),
            last_updated=stock.last_updated,
            material=material_data
        )
        result.append(stock_data)
    
    return result


@app.get("/stock/summary", response_model=StockSummary)
def get_stock_summary(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
    doctor_id: int = Depends(get_current_doctor_id)
):
    """Obține sumarul stocului (total articole, valoare, alerte)"""
    stocks = db.query(Stock).filter(Stock.doctor_id == doctor_id).all()
    
    total_items = len(stocks)
    total_value = 0
    low_stock_count = 0
    
    for stock in stocks:
        material = db.query(Material).filter(Material.id == stock.material_id).first()
        if material:
            total_value += float(stock.quantity) * float(material.price_per_unit)
            if stock.quantity < material.min_quantity:
                low_stock_count += 1
    
    return {
        "total_items": total_items,
        "total_value": total_value,
        "low_stock_count": low_stock_count
    }


@app.get("/stock/alerts", response_model=LowStockAlertsResponse)
def get_low_stock_alerts(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
    doctor_id: int = Depends(get_current_doctor_id)
):
    """Obține alertele pentru stocuri scăzute"""
    stocks = db.query(Stock).filter(Stock.doctor_id == doctor_id).all()
    
    alerts = []
    for stock in stocks:
        material = db.query(Material).filter(Material.id == stock.material_id).first()
        if material and stock.quantity < material.min_quantity:
            alerts.append({
                "material_id": material.id,
                "material_name": material.name,
                "current_quantity": float(stock.quantity),
                "min_quantity": float(material.min_quantity),
                "unit": material.unit
            })
    
    return {"alerts": alerts}

@app.post("/stock", response_model=StockResponse, status_code=status.HTTP_201_CREATED)
def add_stock(
    stock_data: StockUpdate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
    doctor_id: int = Depends(get_current_doctor_id)
):
    """Adaugă sau actualizează stocul pentru un material"""
    material = db.query(Material).filter(Material.id == stock_data.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    existing_stock = db.query(Stock).filter(
        and_(Stock.doctor_id == doctor_id, Stock.material_id == stock_data.material_id)
    ).first()
    
    if existing_stock:
        old_quantity = existing_stock.quantity
        existing_stock.quantity += stock_data.quantity_change
        
        if existing_stock.quantity < 0:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        
        db.commit()
        db.refresh(existing_stock)
        
        stock_change = StockChange(
            doctor_id=doctor_id,
            material_id=stock_data.material_id,
            quantity_change=stock_data.quantity_change,
            reason=stock_data.reason or "Stock adjustment"
        )
        db.add(stock_change)
        db.commit()

        # ── Alertă stoc scăzut ──
        if existing_stock.quantity < material.min_quantity:
            existing_notif = db.query(Notification).filter(
                Notification.user_id == current_user.id,
                Notification.type == "low_stock",
                Notification.entity_id == material.id,
                Notification.is_read == False,
            ).first()
            if not existing_notif:
                create_notification(db, current_user.id,
                    type="low_stock",
                    title="Low Stock Alert",
                    body=f"{material.name} is running low ({float(existing_stock.quantity)} {material.unit} remaining).",
                    entity_type="stock", entity_id=material.id)
                db.commit()

        return existing_stock
    else:
        if stock_data.quantity_change < 0:
            raise HTTPException(status_code=400, detail="Cannot create stock with negative quantity")
        
        new_stock = Stock(
            doctor_id=doctor_id,
            material_id=stock_data.material_id,
            quantity=stock_data.quantity_change
        )
        db.add(new_stock)
        db.commit()
        db.refresh(new_stock)

        stock_change = StockChange(
            doctor_id=doctor_id,
            material_id=stock_data.material_id,
            quantity_change=stock_data.quantity_change,
            reason=stock_data.reason or "Initial stock"
        )
        db.add(stock_change)
        db.commit()

        # ── Alertă stoc scăzut (și la stock nou) ──
        if new_stock.quantity < material.min_quantity:
            create_notification(db, current_user.id,
                type="low_stock",
                title="Low Stock Alert",
                body=f"{material.name} is running low ({float(new_stock.quantity)} {material.unit} remaining).",
                entity_type="stock", entity_id=material.id)
            db.commit()

        return new_stock
    
@app.patch("/stock/{material_id}", response_model=StockResponse)
def update_stock_quantity(
    material_id: int,
    quantity: int,  
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
    doctor_id: int = Depends(get_current_doctor_id)
):
    """Setează cantitatea exactă pentru un material"""
    stock = db.query(Stock).filter(
        and_(Stock.doctor_id == doctor_id, Stock.material_id == material_id)
    ).first()
    
    if not stock:
        raise HTTPException(status_code=404, detail="Stock entry not found")
    
    old_quantity = int(stock.quantity)
    quantity_change = quantity - old_quantity
    
    stock.quantity = quantity
    db.commit()
    db.refresh(stock)

    stock_change = StockChange(
        doctor_id=doctor_id,
        material_id=material_id,
        quantity_change=quantity_change,
        reason=reason or f"Quantity set to {quantity}"
    )
    db.add(stock_change)
    db.commit()

    # ── Alertă stoc scăzut ──
    mat = db.query(Material).filter(Material.id == material_id).first()
    if mat and stock.quantity < mat.min_quantity:
        existing_notif = db.query(Notification).filter(
            Notification.user_id == current_user.id,
            Notification.type == "low_stock",
            Notification.entity_id == mat.id,
            Notification.is_read == False,
        ).first()
        if not existing_notif:
            create_notification(db, current_user.id,
                type="low_stock",
                title="Low Stock Alert",
                body=f"{mat.name} is running low ({float(stock.quantity)} {mat.unit} remaining).",
                entity_type="stock", entity_id=mat.id)
            db.commit()

    return stock


@app.delete("/stock/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stock_entry(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
    doctor_id: int = Depends(get_current_doctor_id)
):
    """Șterge o intrare de stoc (recomandat doar pentru cantitate 0)"""
    stock = db.query(Stock).filter(
        and_(Stock.doctor_id == doctor_id, Stock.material_id == material_id)
    ).first()
    
    if not stock:
        raise HTTPException(status_code=404, detail="Stock entry not found")
    

    stock_change = StockChange(
        doctor_id=doctor_id,
        material_id=material_id,
        quantity_change=-stock.quantity,  
        reason=f"Stock entry deleted (previous quantity: {stock.quantity})"
    )
    db.add(stock_change)
    
    db.delete(stock)
    db.commit()
    
    return None


# ==================== Stock History ====================
@app.get("/stock/history", response_model=List[StockChangeWithMaterial])
def get_stock_history(
    material_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
    doctor_id: int = Depends(get_current_doctor_id)
):
    """Obține istoricul schimbărilor de stoc"""
    query = db.query(StockChange).filter(StockChange.doctor_id == doctor_id)
    
    if material_id:
        query = query.filter(StockChange.material_id == material_id)
    
    changes = query.order_by(desc(StockChange.changed_at)).limit(limit).all()
    
    result = []
    for change in changes:
        material = db.query(Material).filter(Material.id == change.material_id).first()
        result.append({
            "id": change.id,
            "doctor_id": change.doctor_id,
            "material_id": change.material_id,
            "quantity_change": float(change.quantity_change),
            "reason": change.reason,
            "changed_at": change.changed_at.isoformat() if change.changed_at else None,
            "material": {
                "id": material.id,
                "name": material.name,
                "unit": material.unit
            } if material else None
        })
    
    return result


# ==================== BLOG CRUD ROUTES  ====================

# Folderul unde se salvează pozele de blog
UPLOAD_BLOG_FOLDER = Path("static/uploads/blogs")
UPLOAD_BLOG_FOLDER.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

def save_blog_image(blog_id: int | None, file: UploadFile) -> str:
    """Salvează imaginea pentru o postare de blog și returnează URL-ul public."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Invalid file")

    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}",
        )

    filename = f"blog_{blog_id or 'temp'}_{int(datetime.now().timestamp())}{file_ext}"
    file_path = UPLOAD_BLOG_FOLDER / filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")

    return f"http://localhost:8000/static/uploads/blogs/{filename}"



# ==================== CREATE BLOG ====================

@app.post("/blogs", response_model=BlogRead, status_code=status.HTTP_201_CREATED, tags=["Blog"])
def create_blog_post(
    post_type: str = Form(...),
    title: str = Form(...),
    short_description: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    external_link: Optional[str] = Form(None),
    is_active: bool = Form(False),
    featured_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    """Creează o nouă postare de blog cu posibilitate de upload imagine."""

    # Validări logice
    if post_type == "internal" and not content:
        raise HTTPException(status_code=400, detail="Content is required for internal posts.")
    if post_type == "external" and not external_link:
        raise HTTPException(status_code=400, detail="External link is required for external posts.")

    # Salvare imagine (opțional)
    image_url = save_blog_image(None, featured_image) if featured_image else None

    # Creare postare
    new_blog_post = Blog(
        author_id=current_user.id,
        post_type=post_type,
        title=title,
        short_description=short_description,
        content=content,
        external_link=external_link,
        is_active=is_active,
        featured_image_url=image_url,
        published_at=datetime.utcnow() if is_active else None,
        created_at=datetime.utcnow()
    )

    db.add(new_blog_post)
    db.commit()
    db.refresh(new_blog_post)
    return new_blog_post

# ==================== LIST BLOGS ====================

@app.get("/blogs", response_model=List[BlogRead], tags=["Blog"])
def list_blog_posts(
    db: Session = Depends(get_db),
    limit: int = Query(20, gt=0, le=100),
    offset: int = Query(0, ge=0),
    is_active: Optional[bool] = Query(None),  # allow None
    post_type: Optional[str] = Query(None),
    current_user: Optional[DBUser] = Depends(get_current_user)
):
    """Afișează lista de postări."""

    query = db.query(Blog)

    # pentru utilizatori non-admin, ascunde postările inactive dacă nu le cer
    if current_user is None or current_user.role != UserRole.administrator:
        if is_active is None:
            query = query.filter(Blog.is_active == True)
    else:
        if is_active is not None:
            query = query.filter(Blog.is_active == is_active)

    if post_type:
        query = query.filter(Blog.post_type == post_type)

    posts = query.order_by(desc(Blog.published_at), desc(Blog.created_at))\
                 .offset(offset).limit(limit).all()

    return posts


@app.get("/blogs-public", response_model=List[BlogRead], tags=["Blog Public"])
def list_public_blogs(
    db: Session = Depends(get_db),
    limit: int = Query(20, gt=0, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Returnează doar postările active pentru utilizatori publici.
    Nu necesită autentificare.
    """
    posts = db.query(Blog)\
              .filter(Blog.is_active == True)\
              .order_by(desc(Blog.published_at), desc(Blog.created_at))\
              .offset(offset).limit(limit).all()
    return posts

# ==================== GET SINGLE BLOG ====================

@app.get("/blogs/{blog_id}", response_model=BlogRead, tags=["Blog"])
def get_blog_post(
    blog_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[DBUser] = Depends(get_current_user)
):
    """Obține o singură postare după ID și incrementează vizualizările dacă e publică."""

    post = db.query(Blog).filter(Blog.id == blog_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if not post.is_active:
        is_owner = current_user and post.author_id == current_user.id
        is_admin = current_user and current_user.role == UserRole.administrator
        if not (is_owner or is_admin):
            raise HTTPException(status_code=404, detail="Post not found or access denied")

    if post.is_active:
        post.views_count += 1
        db.commit()

    return post

# ==================== UPDATE BLOG ====================

@app.patch("/blogs/{blog_id}", response_model=BlogRead, tags=["Blog"])
def update_blog_post(
    blog_id: int,
    title: Optional[str] = Form(None),
    short_description: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    external_link: Optional[str] = Form(None),
    post_type: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    featured_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    """Actualizează o postare existentă, cu posibilitate de a schimba imaginea."""

    post = db.query(Blog).filter(Blog.id == blog_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.author_id != current_user.id and current_user.role != UserRole.administrator:
        raise HTTPException(status_code=403, detail="Access denied. You are not the author or an administrator.")

    if title is not None:
        post.title = title
    if short_description is not None:
        post.short_description = short_description
    if content is not None:
        post.content = content
    if external_link is not None:
        post.external_link = external_link
    if post_type is not None:
        post.post_type = post_type
    if is_active is not None:
        post.is_active = is_active
        if is_active and not post.published_at:
            post.published_at = datetime.utcnow()

    if featured_image:
        post.featured_image_url = save_blog_image(post.id, featured_image)

    db.commit()
    db.refresh(post)
    return post

# ==================== DELETE BLOG ====================

@app.delete("/blogs/{blog_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Blog"])
def delete_blog_post(
    blog_id: int,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    """Șterge o postare de blog."""

    post = db.query(Blog).filter(Blog.id == blog_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.author_id != current_user.id and current_user.role != UserRole.administrator:
        raise HTTPException(status_code=403, detail="Access denied. You are not the author or an administrator.")

    db.delete(post)
    db.commit()
    return None

# ==================== Appointment Types ====================


# ---------------------------
# GET Appointment Types (doctor view)
# ---------------------------
@app.get("/appointment-types", response_model=List[AppointmentTypeOut])
def get_appointment_types(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
    doctor_id: int = Depends(get_current_doctor_id)
):
    """Obține tipurile de programări ale doctorului curent"""
    appointment_types = db.query(AppointmentType).filter(
        AppointmentType.doctor_id == doctor_id
    ).order_by(AppointmentType.name).all()
    
    return appointment_types


# ---------------------------
# GET Appointment Types (patient view)
# ---------------------------
@app.get("/appointment-types-patient", response_model=List[AppointmentTypeOut])
def get_appointment_types_patient(
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    """Returnează tipurile de programări pentru pacienți."""
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Access denied")

    appointment_types = db.query(AppointmentType).order_by(AppointmentType.name).all()
    return appointment_types


# ---------------------------
# CREATE Appointment Type
# ---------------------------
@app.post("/appointment-types", response_model=AppointmentTypeOut, status_code=status.HTTP_201_CREATED)
def create_appointment_type(
    appointment_type_in: AppointmentTypeCreate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
    doctor_id: int = Depends(get_current_doctor_id)
):
    """Creează un nou tip de programare pentru doctorul curent"""
    existing = db.query(AppointmentType).filter(
        AppointmentType.doctor_id == doctor_id,
        AppointmentType.name == appointment_type_in.name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Appointment type with this name already exists")
    
    new_appointment_type = AppointmentType(
        doctor_id=doctor_id,
        name=appointment_type_in.name,
        description=appointment_type_in.description,
        color=appointment_type_in.color,
        duration_minutes=appointment_type_in.duration_minutes,
        price=appointment_type_in.price
    )
    
    db.add(new_appointment_type)
    db.commit()
    db.refresh(new_appointment_type)
    return new_appointment_type


# ---------------------------
# UPDATE Appointment Type
# ---------------------------
@app.put("/appointment-types/{appointment_type_id}", response_model=AppointmentTypeOut)
def update_appointment_type(
    appointment_type_id: int, 
    appointment_type_in: AppointmentTypeUpdate, 
    db: Session = Depends(get_db)
):
    appointment_type = db.query(AppointmentType).filter(
        AppointmentType.id == appointment_type_id
    ).first()
    if appointment_type is None:
        raise HTTPException(status_code=404, detail="Appointment Type not found.")
    
    update_data = appointment_type_in.dict(exclude_unset=True)

    if "color" in update_data and update_data["color"] is None:
        update_data.pop("color")

    for field, value in update_data.items():
        setattr(appointment_type, field, value)  # aici poate fi inclus și duration_minutes

    db.commit()
    db.refresh(appointment_type)

    return appointment_type


# ---------------------------
# DELETE Appointment Type
# ---------------------------
@app.delete("/appointment-types/{appointment_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment_type(
    appointment_type_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
    doctor_id: int = Depends(get_current_doctor_id)
):
    """Șterge un tip de programare"""
    appointment_type = db.query(AppointmentType).filter(
        AppointmentType.id == appointment_type_id,
        AppointmentType.doctor_id == doctor_id
    ).first()
    
    if not appointment_type:
        raise HTTPException(status_code=404, detail="Appointment type not found")
    
    # Verifică dacă există programări cu acest tip
    existing_appointments = db.query(Appointment).filter(
        Appointment.appointment_type_id == appointment_type_id
    ).first()
    
    if existing_appointments:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete appointment type that is being used by existing appointments"
        )
    
    db.delete(appointment_type)
    db.commit()
    return None


# ---------------------------
# GET Appointment Types by Doctor (public)
# ---------------------------
@app.get("/appointment-types-by-doctor/{doctor_id}", response_model=List[AppointmentTypeOut])
def get_appointment_types_by_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    appointment_types = db.query(AppointmentType).filter(
        AppointmentType.doctor_id == doctor_id
    ).order_by(AppointmentType.name).all()
    return appointment_types

# ==================== Appointments ====================
def is_time_slot_available(
    db: Session,
    doctor_id: int,
    appointment_date: datetime,
    start_time: time,
    end_time: time,
    exclude_appointment_id: int = None
) -> bool:
    """Returnează True dacă slotul este liber pentru doctor"""

    # Verifică suprapunerea cu alte appointment-uri
    query = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date == appointment_date.date()
    )
    if exclude_appointment_id:
        query = query.filter(Appointment.id != exclude_appointment_id)

    appointments = query.all()

    for appt in appointments:
        if (start_time < appt.end_time and end_time > appt.start_time):
            return False  # Suprapunere găsită

    # Verifică dacă intervalul e în WorkSchedule
    work_schedule = db.query(WorkSchedule).filter(
        WorkSchedule.doctor_id == doctor_id,
        WorkSchedule.day_of_week == appointment_date.weekday()
    ).first()

    if not work_schedule:
        return False  # Doctorul nu lucrează în ziua respectivă

    if start_time < work_schedule.start_time or end_time > work_schedule.end_time:
        return False  # Intervalul nu e în programul de lucru

    return True


@app.get("/appointments/available-slots")
def get_available_slots(
    doctor_id: int,
    date: str,                        # format: "2025-03-15"
    duration_minutes: int = 30,
    exclude_appointment_id: int = None,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Returnează lista de sloturi libere pentru un doctor într-o zi dată.
    Fiecare slot are start_time și end_time.
    """
    from datetime import datetime, timedelta

    # Parsăm data
    try:
        appointment_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Verificăm work schedule pentru ziua respectivă (0=Mon, 6=Sun)
    work_schedule = db.query(WorkSchedule).filter(
        WorkSchedule.doctor_id == doctor_id,
        WorkSchedule.day_of_week == appointment_date.weekday()
    ).first()

    if not work_schedule:
        return {"slots": [], "message": "Doctor does not work on this day."}

    # Generăm toate sloturile posibile din work schedule
    available_slots = []
    slot_duration = timedelta(minutes=duration_minutes)

    current_start = datetime.combine(appointment_date.date(), work_schedule.start_time)
    work_end      = datetime.combine(appointment_date.date(), work_schedule.end_time)

    while current_start + slot_duration <= work_end:
        current_end = current_start + slot_duration

        slot_available = is_time_slot_available(
            db=db,
            doctor_id=doctor_id,
            appointment_date=appointment_date,
            start_time=current_start.time(),
            end_time=current_end.time(),
            exclude_appointment_id=exclude_appointment_id
        )

        if slot_available:
            available_slots.append({
                "start_time": current_start.strftime("%H:%M"),
                "end_time":   current_end.strftime("%H:%M"),
            })

        current_start += slot_duration

    return {"slots": available_slots}



@app.get("/appointments", response_model=List[AppointmentOut])
def get_appointments(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """Obține appointment-urile doctorului sau pacientului curent"""
    
    # ACESTA ESTE PUNCTUL CRITIC: FOLOSIȚI NOTAȚIA CU PUNCT
    if current_user.role == "doctor": # <--- FĂRĂ PARANTEZE DREPTE
        
        # ID-ul trebuie accesat tot cu punct
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor profile not found")
        appointments = db.query(Appointment).filter(Appointment.doctor_id == doctor.id).order_by(Appointment.appointment_date).all()
        
    # DE ASEMENEA AICI: NOTAȚIE CU PUNCT
    elif current_user.role == "patient":
        # ID-ul trebuie accesat tot cu punct
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient profile not found")
        appointments = db.query(Appointment).filter(Appointment.patient_id == patient.id).order_by(Appointment.appointment_date).all()
        
    else:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return appointments



@app.post("/appointments", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appointment_in: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """Creează o programare: pacientul pentru sine sau doctorul pentru un pacient."""
    
    target_patient_id = None
    target_doctor_id = None
    
    # 1. Verificăm cine creează și extragem ID-urile corespunzătoare
    # CORECTAT: Folosim notația cu punct (.role)
    if current_user.role == "patient":
        # Căutăm ID-ul pacientului curent
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first() # CORECTAT: .id
        if not patient:
            raise HTTPException(status_code=404, detail="Patient profile not found.")
            
        target_patient_id = patient.id
        target_doctor_id = appointment_in.doctor_id  # Pacientul alege doctorul
        
        # Pacientul trebuie să specifice doctorul
        if not target_doctor_id:
             raise HTTPException(status_code=400, detail="Doctor ID required when scheduling as a Patient.")

        
    # CORECTAT: Folosim notația cu punct (.role)
    elif current_user.role == "doctor":
        # Căutăm ID-ul doctorului curent
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first() # CORECTAT: .id
        if not doctor:
             raise HTTPException(status_code=400, detail="Doctor profile not found.")
        
        target_doctor_id = doctor.id
        
        # Doctorul trebuie să specifice patient_id-ul țintă
        if not appointment_in.patient_id:
            raise HTTPException(status_code=400, detail="Patient ID required when scheduling as a Doctor.")
            
        target_patient_id = appointment_in.patient_id
        
    else:
        # Rol nepermis (administrator sau alt rol)
        raise HTTPException(status_code=403, detail="Access denied. Only doctors or patients can create appointments.")

    # 2. Verificăm dacă slotul e disponibil pentru doctorul țintă
    available = is_time_slot_available(
        db,
        doctor_id=target_doctor_id,
        appointment_date=appointment_in.appointment_date,
        start_time=appointment_in.start_time,
        end_time=appointment_in.end_time
    )
    if not available:
        raise HTTPException(status_code=400, detail="Selected time slot is not available for this doctor.")

    # 3. Creăm programarea
    new_appointment = Appointment(
        patient_id=target_patient_id,
        doctor_id=target_doctor_id,
        appointment_type_id=appointment_in.appointment_type_id,
        appointment_date=appointment_in.appointment_date,
        start_time=appointment_in.start_time,
        end_time=appointment_in.end_time,
        description=appointment_in.description,
        message=appointment_in.message,
        status="confirmed" if current_user.role == "doctor" else "pending",
        duration_minutes=appointment_in.duration_minutes or 30
    )
    
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)

    # ── Notificare doctor: programare nouă ──
    doctor_user = db.query(DBUser).filter(
        DBUser.id == db.query(Doctor).filter(Doctor.id == target_doctor_id).first().user_id
    ).first()
    if doctor_user:
        create_notification(db, doctor_user.id,
            type="appointment_status",
            title="New Appointment Request",
            body=f"{current_user.first_name} {current_user.last_name} has requested an appointment.",
            entity_type="appointment", entity_id=new_appointment.id)

    # ── Notificare pacient: confirmare creare ──
    patient_user = db.query(DBUser).filter(
        DBUser.id == db.query(Patient).filter(Patient.id == target_patient_id).first().user_id
    ).first()
    if patient_user and patient_user.id != current_user.id:
        create_notification(db, patient_user.id,
            type="appointment_status",
            title="Appointment Scheduled",
            body=f"Your appointment has been scheduled successfully.",
            entity_type="appointment", entity_id=new_appointment.id)

    db.commit()
    return new_appointment



@app.put("/appointments/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: int,
    appointment_in: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
    doctor_id: Optional[int] = Depends(get_current_doctor_id)
):
    """Actualizează un appointment complet, orice modificare trece statusul la 'pending'"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Verificăm cine poate modifica - CORECTAT: folosim .role în loc de ["role"]
    if current_user.role == "doctor":
        if appointment.doctor_id != doctor_id:
            raise HTTPException(status_code=403, detail="Access denied")
        # Doctorul poate modifica orice câmp
        for field, value in appointment_in.dict(exclude_unset=True).items():
            setattr(appointment, field, value)

    elif current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if appointment.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Access denied")
        # Pacientul poate modifica doar anumite câmpuri
        allowed_fields = ["appointment_date", "message", "status"]
        for field, value in appointment_in.dict(exclude_unset=True).items():
            if field in allowed_fields:
                setattr(appointment, field, value)
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    # Orice modificare duce la status pending (dacă nu se setează explicit alt status)
    if "status" not in appointment_in.dict(exclude_unset=True):
        appointment.status = "pending"

    db.commit()
    db.refresh(appointment)

    # ── Notificări status schimbat ──
    new_status = appointment.status
    patient = db.query(Patient).filter(Patient.id == appointment.patient_id).first()
    doctor_obj = db.query(Doctor).filter(Doctor.id == appointment.doctor_id).first()

    if current_user.role == "doctor" and patient:
        # Doctorul a modificat → notifică pacientul
        patient_user = db.query(DBUser).filter(DBUser.id == patient.user_id).first()
        if patient_user:
            status_messages = {
                "confirmed":  "Your appointment has been confirmed!",
                "cancelled":  "Your appointment has been cancelled.",
                "finalised":  "Your appointment is complete.",
                "pending":    "Your appointment details have been updated.",
            }
            body = status_messages.get(new_status, f"Your appointment status changed to {new_status}.")
            create_notification(db, patient_user.id,
                type="appointment_status",
                title="Appointment Updated",
                body=body,
                entity_type="appointment", entity_id=appointment.id)

            # Dacă finalizat → cere feedback
            if new_status == "finalised":
                create_notification(db, patient_user.id,
                    type="feedback_request",
                    title="How was your appointment?",
                    body="Your appointment is complete. Please leave feedback for your doctor.",
                    entity_type="appointment", entity_id=appointment.id)

    elif current_user.role == "patient" and doctor_obj:
        # Pacientul a modificat → notifică doctorul
        doctor_user = db.query(DBUser).filter(DBUser.id == doctor_obj.user_id).first()
        if doctor_user:
            create_notification(db, doctor_user.id,
                type="appointment_status",
                title="Appointment Change Request",
                body=f"{current_user.first_name} {current_user.last_name} has requested changes to an appointment.",
                entity_type="appointment", entity_id=appointment.id)

    db.commit()
    return appointment


@app.patch("/appointments/{appointment_id}", response_model=AppointmentOut)
def patch_appointment(
    appointment_id: int,
    appointment_in: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
    doctor_id: Optional[int] = Depends(get_current_doctor_id)
):
    """Actualizează parțial un appointment; aceleași reguli ca la PUT"""
    return update_appointment(appointment_id, appointment_in, db, current_user, doctor_id)


@app.delete("/appointments/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
    doctor_id: Optional[int] = Depends(get_current_doctor_id)
):
    """Șterge sau anulează un appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # CORECTAT: folosim .role în loc de ["role"]
    if current_user.role == "doctor":
        if appointment.doctor_id != doctor_id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if appointment.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(appointment)
    db.commit()
    return None

# ==================== NEW: Patient-Specific Update Endpoint ====================

@app.patch("/appointments/{appointment_id}/patient-request", response_model=AppointmentOut)
def patient_request_appointment_change(
    appointment_id: int,
    appointment_in: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Endpoint special pentru pacienți să solicite modificări la programare.
    - Verifică că user-ul este pacient și proprietarul programării
    - Permite modificarea: appointment_date, start_time, end_time, message
    - Setează automat status pe 'pending' pentru aprobare doctor
    - Verifică disponibilitatea noului slot înainte de salvare
    """
    
    # 1. Verificăm că user-ul este pacient
    if current_user.role != "patient":
        raise HTTPException(
            status_code=403, 
            detail="Only patients can use this endpoint. Doctors should use the standard update endpoint."
        )
    
    # 2. Găsim pacientul curent
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    # 3. Găsim programarea
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # 4. Verificăm că pacientul este proprietarul programării
    if appointment.patient_id != patient.id:
        raise HTTPException(
            status_code=403, 
            detail="You can only modify your own appointments"
        )
    
    # 5. Verificăm că programarea nu este deja cancelled
    if appointment.status == "cancelled":
        raise HTTPException(
            status_code=400, 
            detail="Cannot modify a cancelled appointment"
        )
    
    # 6. Extragem câmpurile permise pentru pacienți
    allowed_fields = ["appointment_date", "start_time", "end_time", "message"]
    update_data = appointment_in.dict(exclude_unset=True)
    
    # Filtrăm doar câmpurile permise
    filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if not filtered_data:
        raise HTTPException(
            status_code=400, 
            detail="No valid fields to update. Patients can only modify: appointment_date, start_time, end_time, message"
        )
    
    # 7. Dacă se modifică data sau timpul, verificăm disponibilitatea
    needs_time_check = any(field in filtered_data for field in ["appointment_date", "start_time", "end_time"])
    
    if needs_time_check:
        # Folosim valorile noi sau păstrăm cele vechi
        new_date = filtered_data.get("appointment_date", appointment.appointment_date)
        new_start = filtered_data.get("start_time", appointment.start_time)
        new_end = filtered_data.get("end_time", appointment.end_time)
        
        # Convertim la datetime dacă e nevoie
        if isinstance(new_date, str):
            from datetime import datetime
            new_date = datetime.strptime(new_date, "%Y-%m-%d").date()
        
        # Convertim la time dacă e nevoie
        if isinstance(new_start, str):
            from datetime import datetime
            new_start = datetime.strptime(new_start, "%H:%M:%S").time()
        if isinstance(new_end, str):
            from datetime import datetime
            new_end = datetime.strptime(new_end, "%H:%M:%S").time()
        
        # Verificăm că end_time > start_time
        if new_end <= new_start:
            raise HTTPException(
                status_code=400, 
                detail="End time must be after start time"
            )
        
        # Verificăm disponibilitatea slotului (excluzând appointment-ul curent)
        from datetime import datetime as dt
        check_date = dt.combine(new_date, new_start) if hasattr(new_date, 'year') else dt.strptime(str(new_date), "%Y-%m-%d")
        
        is_available = is_time_slot_available(
            db=db,
            doctor_id=appointment.doctor_id,
            appointment_date=check_date,
            start_time=new_start,
            end_time=new_end,
            exclude_appointment_id=appointment_id
        )
        
        if not is_available:
            raise HTTPException(
                status_code=400, 
                detail="The requested time slot is not available. Please choose another time."
            )
    
    # 8. Aplicăm modificările
    for field, value in filtered_data.items():
        setattr(appointment, field, value)
    
    # 9. Setăm statusul pe 'pending' pentru că pacientul a cerut modificări
    appointment.status = "pending"
    
    # 10. Salvăm în DB
    db.commit()
    db.refresh(appointment)

    # ── Notifică doctorul ──
    doctor_obj = db.query(Doctor).filter(Doctor.id == appointment.doctor_id).first()
    if doctor_obj:
        doctor_user = db.query(DBUser).filter(DBUser.id == doctor_obj.user_id).first()
        if doctor_user:
            create_notification(db, doctor_user.id,
                type="appointment_status",
                title="Appointment Change Request",
                body=f"{current_user.first_name} {current_user.last_name} has requested changes to an appointment.",
                entity_type="appointment", entity_id=appointment.id)
        db.commit()

    return appointment



#VIEW DOCTORS
@app.get("/doctors", response_model=List[Dict])
def get_doctors(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Returnează lista tuturor doctorilor cu datele lor personale și detalii medicale.
    Oricine logat poate vedea lista doctorilor.
    """
    doctors = (
        db.query(Doctor)
        .join(DBUser, Doctor.user_id == DBUser.id)
        .all()
    )

    result = []
    for doc in doctors:
        user = db.query(DBUser).filter(DBUser.id == doc.user_id).first()
        result.append({
            "id": user.id,
            "doctorId": doc.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "gender": user.gender.value if user.gender else None,
            "profile_picture": user.profile_picture,
            "specialty": doc.specialty,
            "description": doc.description,
            "accreditation": doc.accreditation,
            "country": user.country,
            "county": user.county,
            "city": user.city,
            "address": user.address,
            "date_of_birth":user.birth_date,
        })


    return result

# ==================== GET PATIENT INFO BY ID ====================

@app.get("/patients/{patient_id}")
def get_patient_info(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Obține informațiile unui pacient după ID.
    Folosit de doctori pentru a afișa detaliile pacienților în appointments.
    """
    
    # Verificăm că user-ul este doctor
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=403, 
            detail="Only doctors can access patient information"
        )
    
    # Găsim pacientul
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Găsim user-ul asociat cu pacientul
    user = db.query(DBUser).filter(DBUser.id == patient.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User information not found")
    
    # Returnăm informațiile pacientului
    return {
        "id": patient.id,
        "user_id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone": user.phone,
        "gender": user.gender.value if user.gender else None,
        "birth_date": user.birth_date,
        "address": user.address,
        "city": user.city,
        "county": user.county,
        "country": user.country
    }


# WORK SCHEDULE
# Create
@app.post("/work-schedules", response_model=WorkScheduleOut)
def create_or_update_work_schedule(
    schedule_in: WorkScheduleCreate,
    db: Session = Depends(get_db),
    doctor_id: int = Depends(get_current_doctor_id)
):
    # caută dacă există deja o zi pentru doctor
    schedule = db.query(WorkSchedule).filter(
        WorkSchedule.doctor_id == doctor_id,
        WorkSchedule.day_of_week == schedule_in.day_of_week
    ).first()

    if schedule:
        # UPDATE dacă există
        for field, value in schedule_in.dict(exclude_unset=True).items():
            setattr(schedule, field, value)
        db.commit()
        db.refresh(schedule)
        return schedule
    else:
        # CREATE dacă nu există
        new_schedule = WorkSchedule(
            doctor_id=doctor_id,
            day_of_week=schedule_in.day_of_week,
            start_time=schedule_in.start_time,
            end_time=schedule_in.end_time
        )
        db.add(new_schedule)
        db.commit()
        db.refresh(new_schedule)
        return new_schedule

# Read all schedules for current doctor
@app.get("/work-schedules", response_model=list[WorkScheduleOut])
def get_work_schedules(db: Session = Depends(get_db), doctor_id: int = Depends(get_current_doctor_id)):
    schedules = db.query(WorkSchedule).filter(WorkSchedule.doctor_id == doctor_id).all()
    return schedules

# Update
@app.put("/work-schedules/{schedule_id}", response_model=WorkScheduleOut)
def update_work_schedule(
    schedule_id: int,
    schedule_in: WorkScheduleUpdate,
    db: Session = Depends(get_db),
    doctor_id: int = Depends(get_current_doctor_id)
):
    schedule = db.query(WorkSchedule).filter(
        WorkSchedule.id == schedule_id,
        WorkSchedule.doctor_id == doctor_id
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Work schedule not found")

    for field, value in schedule_in.dict(exclude_unset=True).items():
        setattr(schedule, field, value)

    db.commit()
    db.refresh(schedule)
    return schedule

# Delete
@app.delete("/work-schedules/{schedule_id}", status_code=204)
def delete_work_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    doctor_id: int = Depends(get_current_doctor_id)
):
    schedule = db.query(WorkSchedule).filter(
        WorkSchedule.id == schedule_id,
        WorkSchedule.doctor_id == doctor_id
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Work schedule not found")
    db.delete(schedule)
    db.commit()
    return

@app.get("/work-schedules/{doctor_id}/{date}")
def get_schedule_for_day(doctor_id: int, date: str, db: Session = Depends(get_db)):
    dt = datetime.strptime(date, "%Y-%m-%d")
    day_of_week = dt.weekday()  # 0 = Monday, 6 = Sunday

    schedule = db.query(WorkSchedule).filter(
        WorkSchedule.doctor_id == doctor_id,
        WorkSchedule.day_of_week == day_of_week
    ).first()

    if not schedule:
        return {"workHours": None, "busySlots": []}

    # Obține programările existente pentru ziua respectivă
    busy_appointments = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date == date
    ).all()

    busy_slots = [{"start": a.start_time.strftime("%H:%M"), "end": a.end_time.strftime("%H:%M")} for a in busy_appointments]

    return {
        "workHours": {
            "start": schedule.start_time.strftime("%H:%M"),
            "end": schedule.end_time.strftime("%H:%M")
        },
        "busySlots": busy_slots
    }



# ============ FEEDBACK ENDPOINTS ============

@app.post("/feedback/doctor-to-patient", response_model=FeedbackResponse, status_code=201, tags=["Feedback"])
async def create_doctor_to_patient_feedback(
    feedback_data: FeedbackDoctorToPatientCreate,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)  
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


@app.post("/feedback/patient-to-doctor", response_model=FeedbackResponse, status_code=201, tags=["Feedback"])
async def create_patient_to_doctor_feedback(
    feedback_data: FeedbackPatientToDoctorCreate,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    """Pacient dă feedback la doctor"""
    
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


@app.post("/feedback/app-feedback", response_model=FeedbackResponse, status_code=201, tags=["Feedback"])
async def create_app_feedback(
    feedback_data: FeedbackUserToAppCreate,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    """Utilizator dă feedback la aplicație"""
    
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


@app.get("/feedback/my-feedbacks", response_model=List[FeedbackResponse], tags=["Feedback"])
async def get_my_feedbacks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    category: Optional[FeedbackCategory] = None,
    status_filter: Optional[FeedbackStatus] = None,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    """Obține feedback-urile date"""
    
    query = db.query(Feedback).filter(Feedback.from_user_id == current_user.id)
    
    if category:
        query = query.filter(Feedback.feedback_category == category)
    
    if status_filter:
        query = query.filter(Feedback.status == status_filter)
    
    feedbacks = query.order_by(Feedback.created_at.desc()).offset(skip).limit(limit).all()
    return feedbacks


@app.get("/feedback/received", response_model=List[FeedbackResponse], tags=["Feedback"])
async def get_received_feedbacks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[FeedbackStatus] = None,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
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


@app.get("/feedback/app-feedbacks", response_model=List[FeedbackResponse], tags=["Feedback"])
async def get_app_feedbacks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    severity: Optional[str] = None,
    status_filter: Optional[FeedbackStatus] = None,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
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


@app.get("/feedback/{feedback_id}", response_model=FeedbackDetailResponse, tags=["Feedback"])
async def get_feedback_by_id(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
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


@app.get("/feedback/doctor/{doctor_id}/stats", response_model=DoctorFeedbackStats, tags=["Feedback"])
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


@app.patch("/feedback/{feedback_id}/status", response_model=FeedbackResponse, tags=["Feedback"])
async def update_feedback_status(
    feedback_id: int,
    status_data: FeedbackStatusUpdate,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
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


@app.post("/feedback/{feedback_id}/respond", response_model=FeedbackResponse, tags=["Feedback"])
async def respond_to_feedback(
    feedback_id: int,
    response_data: FeedbackResponseCreate,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
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


@app.delete("/feedback/{feedback_id}", status_code=204, tags=["Feedback"])
async def delete_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
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



# ==================== ADMIN USER MANAGEMENT ====================

@app.get("/admin/users", response_model=List[Dict])
def get_all_users(
    user_type: Optional[str] = Query(None, description="Filter by user type: doctor, patient, administrator"),
    db: Session = Depends(get_db),
    current_user: Optional[DBUser] = Depends(get_current_user)
):

    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    
    if user_role != "administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only administrators can access this endpoint."
        )
    
    query = db.query(DBUser)
    
    if user_type:
        query = query.filter(DBUser.role == user_type)
    
    users = query.all()
    
    result = []
    for user in users:
        user_data = {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "gender": user.gender.value if user.gender and hasattr(user.gender, 'value') else user.gender,
            "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
            "status": user.status.value if hasattr(user.status, 'value') else str(user.status),
            "profile_picture": user.profile_picture,
            "country": user.country,
            "county": user.county,
            "city": user.city,
            "address": user.address,
            "birth_date": user.birth_date.isoformat() if user.birth_date else None,
            "creation_date": user.creation_date.isoformat() if user.creation_date else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
        }
        
        if user.role == UserRole.doctor and user.doctor:
            user_data["doctor"] = {
                "doctorId": user.doctor.id,
                "specialty": user.doctor.specialty,
                "description": user.doctor.description,
                "accreditation": user.doctor.accreditation,
            }
        elif user.role == UserRole.patient and user.patient:
            user_data["patient"] = {
                "patientId": user.patient.id,
                "description": user.patient.description,
            }
        
        result.append(user_data)
    
    return result


@app.post("/admin/users", status_code=status.HTTP_201_CREATED)
def create_user_by_admin(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: Optional[DBUser] = Depends(get_current_user)  
):
    """
    Create a new user (admin only).
    """
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    
    if user_role != "administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only administrators can create users."
        )
    
    # Check if email already exists
    if db.query(DBUser).filter(DBUser.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    new_user = DBUser(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        password=get_password_hash(user_data.password),
        role=user_data.role,
        gender=user_data.gender,
        birth_date=user_data.birth_date,
        phone=user_data.phone,
        country=user_data.country,
        county=user_data.county,
        city=user_data.city,
        address=user_data.address,
        creation_date=datetime.utcnow()
        
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create role-specific profile
    if user_data.role == UserRole.doctor:
        doctor = Doctor(
            user_id=new_user.id,
            specialty=user_data.specialty if hasattr(user_data, 'specialty') else None,
            description=user_data.description if hasattr(user_data, 'description') else None,
            accreditation=user_data.accreditation if hasattr(user_data, 'accreditation') else None
        )
        db.add(doctor)
    elif user_data.role == UserRole.patient:
        patient = Patient(
            user_id=new_user.id,
            description=user_data.description if hasattr(user_data, 'description') else None
        )
        db.add(patient)
    
    db.commit()
    
    return {
        "message": "User created successfully",
        "user_id": new_user.id
    }


@app.put("/admin/users/{user_id}")
def update_user_by_admin(
    user_id: int,
    update_data: dict,
    db: Session = Depends(get_db),
    current_user: Optional[DBUser] = Depends(get_current_user)
):
    """
    Update user information (admin only).
    """
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    
    if user_role != "administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only administrators can update users."
        )
    
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update basic fields
    allowed_fields = [
        "first_name", "last_name", "email", "phone", "gender",
        "country", "county", "city", "address", "status", "birth_date"
    ]
    
    for field in allowed_fields:
        if field in update_data and update_data[field] is not None:
            setattr(user, field, update_data[field])
    
    # Update doctor-specific fields
    if user.role == UserRole.doctor and "doctor" in update_data:
        doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
        if doctor:
            if "specialty" in update_data["doctor"]:
                doctor.specialty = update_data["doctor"]["specialty"]
            if "description" in update_data["doctor"]:
                doctor.description = update_data["doctor"]["description"]
            if "accreditation" in update_data["doctor"]:
                doctor.accreditation = update_data["doctor"]["accreditation"]
    
    # Update patient-specific fields
    if user.role == UserRole.patient and "patient" in update_data:
        patient = db.query(Patient).filter(Patient.user_id == user.id).first()
        if patient and "description" in update_data["patient"]:
            patient.description = update_data["patient"]["description"]
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": "User updated successfully",
        "user": serialize_user(user)
    }


@app.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_by_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[DBUser] = Depends(get_current_user)
):
    """
    Delete a user (admin only).
    """
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    
    if user_role != "administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only administrators can delete users."
        )
    
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account"
        )
    
    # Delete profile picture if exists
    if user.profile_picture:
        try:
            profile_pic_path = UPLOAD_FOLDER / user.profile_picture.split('/')[-1]
            if profile_pic_path.exists():
                profile_pic_path.unlink()
        except Exception as e:
            print(f"Error deleting profile picture: {e}")
    
    # Delete role-specific data (CASCADE will handle related records)
    if user.role == UserRole.doctor:
        doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
        if doctor:
            db.delete(doctor)
    
    if user.role == UserRole.patient:
        patient = db.query(Patient).filter(Patient.user_id == user.id).first()
        if patient:
            db.delete(patient)
    
    db.delete(user)
    db.commit()
    
    return None




#=================== CHAT ================
@app.get("/messages/conversations")
def get_conversations(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns a list of all unique conversations for the current user,
    showing the last message and unread count for each.
    """
    # Find all unique users the current user has chatted with
    sent_to = db.query(Message.receiver_id.label("other_id")).filter(
        Message.sender_id == current_user.id
    )
    received_from = db.query(Message.sender_id.label("other_id")).filter(
        Message.receiver_id == current_user.id
    )
    
    # Union of all conversation partners
    conversation_partner_ids = sent_to.union(received_from).all()
    partner_ids = [row.other_id for row in conversation_partner_ids]

    conversations = []

    for partner_id in partner_ids:
        # Get the other user
        other_user = db.query(DBUser).filter(DBUser.id == partner_id).first()
        if not other_user:
            continue

        # Get last message
        last_message = db.query(Message).filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == partner_id),
                and_(Message.sender_id == partner_id, Message.receiver_id == current_user.id)
            )
        ).order_by(desc(Message.timestamp)).first()

        if not last_message:
            continue

        # Count unread messages from this partner
        unread_count = db.query(func.count(Message.id)).filter(
            Message.sender_id == partner_id,
            Message.receiver_id == current_user.id,
            Message.is_read == False
        ).scalar()

        conversations.append({
            "other_user_id": other_user.id,
            "other_user_first_name": other_user.first_name,
            "other_user_last_name": other_user.last_name,
            "other_user_role": other_user.role.value if hasattr(other_user.role, 'value') else str(other_user.role),
            "other_user_profile_picture": other_user.profile_picture,
            "last_message_content": last_message.content,
            "last_message_timestamp": last_message.timestamp.isoformat(),
            "last_message_sender_id": last_message.sender_id,
            "unread_count": unread_count or 0
        })

    # Sort by last message timestamp descending
    conversations.sort(key=lambda x: x["last_message_timestamp"], reverse=True)
    return conversations


@app.get("/messages/unread-count")
def get_total_unread_count(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns total number of unread messages for the current user."""
    count = db.query(func.count(Message.id)).filter(
        Message.receiver_id == current_user.id,
        Message.is_read == False
    ).scalar()
    return {"unread_count": count or 0}


@app.get("/messages/{other_user_id}")
def get_messages(
    other_user_id: int,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns all messages between the current user and another user.
    Also marks all incoming messages as read.
    """
    # Verify the other user exists
    other_user = db.query(DBUser).filter(DBUser.id == other_user_id).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Mark all messages from other_user to current_user as read
    db.query(Message).filter(
        Message.sender_id == other_user_id,
        Message.receiver_id == current_user.id,
        Message.is_read == False
    ).update({"is_read": True})
    db.commit()

    # Fetch messages between the two users
    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_id == current_user.id, Message.receiver_id == other_user_id),
            and_(Message.sender_id == other_user_id, Message.receiver_id == current_user.id)
        )
    ).order_by(Message.timestamp.asc()).offset(offset).limit(limit).all()

    result = []
    for msg in messages:
        sender = db.query(DBUser).filter(DBUser.id == msg.sender_id).first()
        result.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "content": msg.content,
            "timestamp": msg.timestamp.isoformat(),
            "is_read": msg.is_read,
            "appointment_id": msg.appointment_id,
            "sender_first_name": sender.first_name if sender else "Unknown",
            "sender_last_name": sender.last_name if sender else "",
            "sender_profile_picture": sender.profile_picture if sender else None,
        })

    return result


@app.post("/messages", status_code=status.HTTP_201_CREATED)
def send_message(
    msg_data: MessageCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to another user."""
    # Verify receiver exists
    receiver = db.query(DBUser).filter(DBUser.id == msg_data.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    # Prevent sending message to yourself
    if msg_data.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send message to yourself")

    # Validate appointment_id if provided
    if msg_data.appointment_id:
        appointment = db.query(Appointment).filter(
            Appointment.id == msg_data.appointment_id
        ).first()
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")

    new_message = Message(
        sender_id=current_user.id,
        receiver_id=msg_data.receiver_id,
        content=msg_data.content.strip(),
        appointment_id=msg_data.appointment_id,
        timestamp=datetime.utcnow(),
        is_read=False
    )

    db.add(new_message)
    db.commit()
    db.refresh(new_message)

    # ── Notificare receptor ──
    create_notification(db, msg_data.receiver_id,
        type="new_message",
        title="New Message",
        body=f"{current_user.first_name} {current_user.last_name} sent you a message.",
        entity_type="message", entity_id=new_message.id)
    db.commit()

    return {
        "id": new_message.id,
        "sender_id": new_message.sender_id,
        "receiver_id": new_message.receiver_id,
        "content": new_message.content,
        "timestamp": new_message.timestamp.isoformat(),
        "is_read": new_message.is_read,
        "appointment_id": new_message.appointment_id,
        "sender_first_name": current_user.first_name,
        "sender_last_name": current_user.last_name,
        "sender_profile_picture": current_user.profile_picture,
    }


@app.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    message_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a message (only sender can delete their own messages)."""
    message = db.query(Message).filter(Message.id == message_id).first()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")

    db.delete(message)
    db.commit()
    return None


@app.get("/doctor/appointment-patients")
def get_doctor_appointment_patients(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returnează lista unică de pacienți care au sau au avut programări
    cu doctorul curent. Folosit în chat pentru New Conversation.
    """
    if current_user.role != UserRole.doctor:
        raise HTTPException(status_code=403, detail="Only doctors can access this endpoint")

    # Găsim doctor_id pentru userul curent
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    # Găsim toți pacienții unici din programările acestui doctor
    patient_ids = db.query(Appointment.patient_id)\
        .filter(Appointment.doctor_id == doctor.id)\
        .distinct()\
        .all()

    patient_ids = [row[0] for row in patient_ids]

    result = []
    for patient_id in patient_ids:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            continue
        user = db.query(DBUser).filter(DBUser.id == patient.user_id).first()
        if not user:
            continue
        result.append({
            "id": user.id,           
            "patient_id": patient.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "profile_picture": user.profile_picture,
        })

    return result



DOCUMENTS_FOLDER = Path("static/uploads/medical_documents")
DOCUMENTS_FOLDER.mkdir(parents=True, exist_ok=True)


# ── Helpers ──────────────────────────────────────────────────

def serialize_medical_record(record: MedicalRecord, db: Session) -> dict:
    patient_user = db.query(DBUser).filter(DBUser.id == record.patient.user_id).first()
    doctor_user  = db.query(DBUser).filter(DBUser.id == record.doctor.user_id).first()
    return {
        "id":                 record.id,
        "patient_id":         record.patient_id,
        "doctor_id":          record.doctor_id,
        "patient_name":       f"{patient_user.first_name} {patient_user.last_name}" if patient_user else "Unknown",
        "patient_picture":    patient_user.profile_picture if patient_user else None,
        "doctor_name":        f"{doctor_user.first_name} {doctor_user.last_name}" if doctor_user else "Unknown",
        "doctor_specialty":   record.doctor.specialty,
        "blood_type":         record.blood_type,
        "allergies":          record.allergies,
        "chronic_conditions": record.chronic_conditions,
        "notes":              record.notes,
        "created_at":         record.created_at,
        "updated_at":         record.updated_at,
        "treatments": [
            {
                "id":             t.id,
                "tooth_number":   t.tooth_number,
                "procedure_name": t.procedure_name,
                "description":    t.description,
                "cost":           float(t.cost) if t.cost else None,
                "treatment_date": t.treatment_date,
                "status":         t.status,
                "appointment_id": t.appointment_id,
            }
            for t in sorted(record.treatments, key=lambda x: x.treatment_date, reverse=True)
        ],
        "prescriptions": [
            {
                "id":              p.id,
                "medication_name": p.medication_name,
                "dosage":          p.dosage,
                "frequency":       p.frequency,
                "duration":        p.duration,
                "notes":           p.notes,
                "prescribed_date": p.prescribed_date,
                "appointment_id":  p.appointment_id,
            }
            for p in sorted(record.prescriptions, key=lambda x: x.prescribed_date, reverse=True)
        ],
        "documents": [
            {
                "id":             d.id,
                "file_name":      d.file_name,
                "file_url":       f"http://localhost:8000/medical-documents/{d.id}/file",
                "file_type":      d.file_type,
                "file_size":      d.file_size,
                "document_type":  d.document_type,
                "description":    d.description,
                "uploaded_at":    d.uploaded_at,
                "appointment_id": d.appointment_id,
            }
            for d in sorted(record.documents, key=lambda x: x.uploaded_at, reverse=True)
        ],
    }


def get_doctor_or_403(current_user, db: Session) -> Doctor:
    """Returnează doctorul curent sau aruncă 403."""
    if current_user.role != UserRole.doctor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can perform this action"
        )
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    return doctor


def get_record_for_doctor(record_id: int, doctor: Doctor, db: Session) -> MedicalRecord:
    """Returnează fișa medicală dacă aparține doctorului, altfel 404/403."""
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical record not found")
    if record.doctor_id != doctor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return record


# ══════════════════════════════════════════════════════════════
# MEDICAL RECORDS
# ══════════════════════════════════════════════════════════════

@app.get("/medical-records", response_model=List[MedicalRecordResponse])
def get_medical_records(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Doctor  → returnează toate fișele pacienților săi.
    Patient → returnează fișele sale de la toți doctorii.
    """
    if current_user.role == UserRole.doctor:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")
        records = db.query(MedicalRecord).filter(MedicalRecord.doctor_id == doctor.id).all()
    else:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")
        records = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient.id).all()

    return [serialize_medical_record(r, db) for r in records]


@app.get("/medical-records/{record_id}", response_model=MedicalRecordResponse)
def get_medical_record(
    record_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returnează o fișă medicală după ID."""
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical record not found")

    if current_user.role == UserRole.doctor:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if record.doctor_id != doctor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    else:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if record.patient_id != patient.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return serialize_medical_record(record, db)


@app.post("/medical-records", response_model=MedicalRecordResponse, status_code=status.HTTP_201_CREATED)
def create_medical_record(
    data: MedicalRecordCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Creează o fișă medicală nouă pentru un pacient. Doar doctori."""
    doctor = get_doctor_or_403(current_user, db)

    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    existing = db.query(MedicalRecord).filter(
        MedicalRecord.patient_id == data.patient_id,
        MedicalRecord.doctor_id == doctor.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Medical record already exists for this patient"
        )

    record = MedicalRecord(
        patient_id=data.patient_id,
        doctor_id=doctor.id,
        blood_type=data.blood_type,
        allergies=data.allergies,
        chronic_conditions=data.chronic_conditions,
        notes=data.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_medical_record(record, db)


@app.put("/medical-records/{record_id}", response_model=MedicalRecordResponse)
def update_medical_record(
    record_id: int,
    data: MedicalRecordUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizează datele generale ale fișei medicale. Doar doctori."""
    doctor = get_doctor_or_403(current_user, db)
    record = get_record_for_doctor(record_id, doctor, db)

    if data.blood_type is not None:         record.blood_type = data.blood_type
    if data.allergies is not None:          record.allergies = data.allergies
    if data.chronic_conditions is not None: record.chronic_conditions = data.chronic_conditions
    if data.notes is not None:              record.notes = data.notes
    record.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(record)

    # ── Notifică pacientul ──
    patient_obj = db.query(Patient).filter(Patient.id == record.patient_id).first()
    if patient_obj:
        create_notification(db, patient_obj.user_id,
            type="medical_record_updated",
            title="Medical Record Updated",
            body="Your doctor has updated your medical record.",
            entity_type="medical_record", entity_id=record.id)
        db.commit()

    return serialize_medical_record(record, db)


@app.delete("/medical-records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medical_record(
    record_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Șterge o fișă medicală completă cu tot ce conține. Doar doctori."""
    doctor = get_doctor_or_403(current_user, db)
    record = get_record_for_doctor(record_id, doctor, db)

    for doc in record.documents:
        try:
            Path(doc.file_path).unlink(missing_ok=True)
        except Exception:
            pass

    db.delete(record)
    db.commit()
    return None


# ══════════════════════════════════════════════════════════════
# TREATMENTS
# ══════════════════════════════════════════════════════════════

@app.post("/medical-records/{record_id}/treatments", response_model=TreatmentResponse, status_code=status.HTTP_201_CREATED)
def add_treatment(
    record_id: int,
    data: TreatmentCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adaugă un tratament la fișa medicală. Doar doctori."""
    doctor = get_doctor_or_403(current_user, db)
    record = get_record_for_doctor(record_id, doctor, db)

    treatment = Treatment(
        medical_record_id=record_id,
        tooth_number=data.tooth_number,
        procedure_name=data.procedure_name,
        description=data.description,
        cost=data.cost,
        treatment_date=data.treatment_date,
        status=data.status,
        appointment_id=data.appointment_id,
    )
    db.add(treatment)
    record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(treatment)

    # ── Notifică pacientul ──
    patient_obj = db.query(Patient).filter(Patient.id == record.patient_id).first()
    if patient_obj:
        create_notification(db, patient_obj.user_id,
            type="medical_record_updated",
            title="New Treatment Added",
            body=f"Dr. {current_user.last_name} added a new treatment to your medical record.",
            entity_type="medical_record", entity_id=record.id)
        db.commit()

    return treatment


@app.put("/medical-records/treatments/{treatment_id}", response_model=TreatmentResponse)
def update_treatment(
    treatment_id: int,
    data: TreatmentCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizează un tratament. Doar doctori."""
    doctor = get_doctor_or_403(current_user, db)

    treatment = db.query(Treatment).filter(Treatment.id == treatment_id).first()
    if not treatment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Treatment not found")
    if treatment.medical_record.doctor_id != doctor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    treatment.tooth_number   = data.tooth_number
    treatment.procedure_name = data.procedure_name
    treatment.description    = data.description
    treatment.cost           = data.cost
    treatment.treatment_date = data.treatment_date
    treatment.status         = data.status
    treatment.appointment_id = data.appointment_id
    treatment.medical_record.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(treatment)
    return treatment


@app.delete("/medical-records/treatments/{treatment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_treatment(
    treatment_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Șterge un tratament. Doar doctori."""
    doctor = get_doctor_or_403(current_user, db)

    treatment = db.query(Treatment).filter(Treatment.id == treatment_id).first()
    if not treatment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Treatment not found")
    if treatment.medical_record.doctor_id != doctor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    db.delete(treatment)
    db.commit()
    return None


# ══════════════════════════════════════════════════════════════
# PRESCRIPTIONS
# ══════════════════════════════════════════════════════════════

@app.post("/medical-records/{record_id}/prescriptions", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED)
def add_prescription(
    record_id: int,
    data: PrescriptionCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adaugă o rețetă la fișa medicală. Doar doctori."""
    doctor = get_doctor_or_403(current_user, db)
    record = get_record_for_doctor(record_id, doctor, db)

    prescription = Prescription(
        medical_record_id=record_id,
        medication_name=data.medication_name,
        dosage=data.dosage,
        frequency=data.frequency,
        duration=data.duration,
        notes=data.notes,
        prescribed_date=data.prescribed_date,
        appointment_id=data.appointment_id,
    )
    db.add(prescription)
    record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prescription)

    # ── Notifică pacientul ──
    patient_obj = db.query(Patient).filter(Patient.id == record.patient_id).first()
    if patient_obj:
        create_notification(db, patient_obj.user_id,
            type="medical_record_updated",
            title="New Prescription Added",
            body=f"Dr. {current_user.last_name} added a new prescription to your medical record.",
            entity_type="medical_record", entity_id=record.id)
        db.commit()

    return prescription


@app.put("/medical-records/prescriptions/{prescription_id}", response_model=PrescriptionResponse)
def update_prescription(
    prescription_id: int,
    data: PrescriptionCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizează o rețetă. Doar doctori."""
    doctor = get_doctor_or_403(current_user, db)

    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")
    if prescription.medical_record.doctor_id != doctor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    prescription.medication_name = data.medication_name
    prescription.dosage          = data.dosage
    prescription.frequency       = data.frequency
    prescription.duration        = data.duration
    prescription.notes           = data.notes
    prescription.prescribed_date = data.prescribed_date
    prescription.appointment_id  = data.appointment_id
    prescription.medical_record.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(prescription)
    return prescription


@app.delete("/medical-records/prescriptions/{prescription_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prescription(
    prescription_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Șterge o rețetă. Doar doctori."""
    doctor = get_doctor_or_403(current_user, db)

    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")
    if prescription.medical_record.doctor_id != doctor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    db.delete(prescription)
    db.commit()
    return None


# ══════════════════════════════════════════════════════════════
# DOCUMENTS
# ══════════════════════════════════════════════════════════════

@app.post("/medical-records/{record_id}/documents", response_model=MedicalDocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    record_id: int,
    document_type: str = Form('other'),
    description: Optional[str] = Form(None),
    appointment_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Uploadează un document. Necesită multipart/form-data. Doar doctori."""
    doctor = get_doctor_or_403(current_user, db)
    record = get_record_for_doctor(record_id, doctor, db)

    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    file_type = "pdf" if file_ext == ".pdf" else "image"
    filename  = f"rec_{record_id}_{datetime.now().timestamp()}{file_ext}"
    file_path = DOCUMENTS_FOLDER / filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_size = file_path.stat().st_size
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to save file: {str(e)}")

    doc = MedicalDocument(
        medical_record_id=record_id,
        appointment_id=appointment_id,
        file_name=file.filename,
        file_path=str(file_path),
        file_type=file_type,
        file_size=file_size,
        document_type=document_type,
        description=description,
    )
    db.add(doc)
    record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(doc)

    # file_url nu e stocat în model, îl construim la returnare
    return {
        "id":             doc.id,
        "file_name":      doc.file_name,
        "file_url":       f"http://localhost:8000/medical-documents/{doc.id}/file",
        "file_type":      doc.file_type,
        "file_size":      doc.file_size,
        "document_type":  doc.document_type,
        "description":    doc.description,
        "uploaded_at":    doc.uploaded_at,
        "appointment_id": doc.appointment_id,
    }


@app.get("/medical-documents/{document_id}/file")
def get_document_file(
    document_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Servește fișierul fizic al unui document medical."""
    doc = db.query(MedicalDocument).filter(MedicalDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    record = doc.medical_record
    if current_user.role == UserRole.doctor:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if record.doctor_id != doctor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    else:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if record.patient_id != patient.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    file_path = Path(doc.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on server")

    return FileResponse(file_path, filename=doc.file_name)


@app.delete("/medical-records/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Șterge un document și fișierul fizic asociat. Doar doctori."""
    doctor = get_doctor_or_403(current_user, db)

    doc = db.query(MedicalDocument).filter(MedicalDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if doc.medical_record.doctor_id != doctor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    try:
        Path(doc.file_path).unlink(missing_ok=True)
    except Exception:
        pass

    db.delete(doc)
    db.commit()
    return None


#=================== SUPPORT TICKETS ==========================
TICKET_UPLOAD_DIR = Path("static/uploads/ticket_attachments")
TICKET_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def serialize_ticket(ticket: SupportTicket, db: Session) -> dict:
    user = db.query(DBUser).filter(DBUser.id == ticket.user_id).first()
    messages_out = []
    for m in ticket.messages:
        sender = db.query(DBUser).filter(DBUser.id == m.user_id).first()
        messages_out.append({
            "id":          m.id,
            "ticket_id":   m.ticket_id,
            "user_id":     m.user_id,
            "message":     m.message,
            "is_admin":    m.is_admin,
            "created_at":  m.created_at,
            "sender_name": f"{sender.first_name} {sender.last_name}" if sender else "Unknown",
        })
    return {
        "id":              ticket.id,
        "user_id":         ticket.user_id,
        "subject":         ticket.subject,
        "description":     ticket.description,
        "category":        ticket.category,
        "priority":        ticket.priority,
        "status":          ticket.status,
        "attachment_path": ticket.attachment_path,
        "created_at":      ticket.created_at,
        "updated_at":      ticket.updated_at,
        "messages":        messages_out,
        "submitter_name":  f"{user.first_name} {user.last_name}" if user else "Unknown",
        "submitter_role":  user.role.value if user and hasattr(user.role, 'value') else str(user.role) if user else "unknown",
    }


# ---------------------------
# CREATE Ticket (with optional file)
# ---------------------------
@app.post("/support-tickets", status_code=status.HTTP_201_CREATED)
async def create_support_ticket(
    subject    : str = Form(...),
    description: str = Form(...),
    category   : str = Form("general"),
    priority   : str = Form("medium"),
    attachment : Optional[UploadFile] = File(None),
    current_user=Depends(get_current_user),
    db         : Session = Depends(get_db),
):
    attachment_path = None
    if attachment and attachment.filename:
        ext = Path(attachment.filename).suffix
        filename = f"ticket_{current_user.id}_{int(datetime.utcnow().timestamp())}{ext}"
        file_path = TICKET_UPLOAD_DIR / filename
        with open(file_path, "wb") as f:
            shutil.copyfileobj(attachment.file, f)
        attachment_path = str(file_path)

    ticket = SupportTicket(
        user_id        =current_user.id,
        subject        =subject,
        description    =description,
        category       =category,
        priority       =priority,
        attachment_path=attachment_path,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # ── Notifică toți adminii ──
    admins = db.query(DBUser).filter(DBUser.role == UserRole.administrator).all()
    for admin in admins:
        create_notification(db, admin.id,
            type="new_ticket",
            title="New Support Ticket",
            body=f"{current_user.first_name} {current_user.last_name} submitted: \"{subject}\".",
            entity_type="ticket", entity_id=ticket.id)
    db.commit()

    return serialize_ticket(ticket, db)


# ---------------------------
# GET My Tickets (doctor / patient)
# ---------------------------
@app.get("/support-tickets/my")
def get_my_tickets(
    current_user=Depends(get_current_user),
    db          : Session = Depends(get_db),
):
    tickets = (
        db.query(SupportTicket)
        .filter(SupportTicket.user_id == current_user.id)
        .order_by(SupportTicket.created_at.desc())
        .all()
    )
    return [serialize_ticket(t, db) for t in tickets]


# ---------------------------
# GET All Tickets (admin only)
# ---------------------------
@app.get("/support-tickets/all")
def get_all_tickets(
    current_user=Depends(get_current_user),
    db          : Session = Depends(get_db),
):
    if current_user.role != UserRole.administrator:
        raise HTTPException(status_code=403, detail="Admin only")
    tickets = (
        db.query(SupportTicket)
        .order_by(SupportTicket.updated_at.desc())
        .all()
    )
    return [serialize_ticket(t, db) for t in tickets]


# ---------------------------
# GET Single Ticket
# ---------------------------
@app.get("/support-tickets/{ticket_id}")
def get_ticket(
    ticket_id   : int,
    current_user=Depends(get_current_user),
    db          : Session = Depends(get_db),
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if current_user.role != UserRole.administrator and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return serialize_ticket(ticket, db)


# ---------------------------
# UPDATE Ticket Status / Priority (admin only)
# ---------------------------
@app.patch("/support-tickets/{ticket_id}/status")
def update_ticket_status(
    ticket_id   : int,
    body        : SupportTicketUpdate,
    current_user=Depends(get_current_user),
    db          : Session = Depends(get_db),
):
    if current_user.role != UserRole.administrator:
        raise HTTPException(status_code=403, detail="Admin only")
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if body.status:
        ticket.status = body.status
    if body.priority:
        ticket.priority = body.priority
    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    return serialize_ticket(ticket, db)


# ---------------------------
# POST Message in Ticket
# ---------------------------
@app.post("/support-tickets/{ticket_id}/messages")
def add_ticket_message(
    ticket_id   : int,
    body        : TicketMessageCreate,
    current_user=Depends(get_current_user),
    db          : Session = Depends(get_db),
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if current_user.role != UserRole.administrator and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    msg = TicketMessage(
        ticket_id=ticket_id,
        user_id  =current_user.id,
        message  =body.message,
        is_admin =current_user.role == UserRole.admin,
    )
    db.add(msg)

    # Auto-set to in_progress when admin replies to open ticket
    if current_user.role == UserRole.administrator and ticket.status == "open":
        ticket.status = "in_progress"

    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)

    # ── Notificări mesaj nou în ticket ──
    if current_user.role == UserRole.administrator:
        # Admin a răspuns → notifică proprietarul
        create_notification(db, ticket.user_id,
            type="ticket_update",
            title="New Reply on Your Ticket",
            body=f"Support replied to your ticket: \"{ticket.subject}\".",
            entity_type="ticket", entity_id=ticket.id)
    else:
        # Userul a scris → notifică toți adminii
        admins = db.query(DBUser).filter(DBUser.role == UserRole.administrator).all()
        for admin in admins:
            create_notification(db, admin.id,
                type="new_ticket",
                title="Ticket Reply",
                body=f"{current_user.first_name} {current_user.last_name} replied on: \"{ticket.subject}\".",
                entity_type="ticket", entity_id=ticket.id)
    db.commit()

    return serialize_ticket(ticket, db)



# ---------------------------
# GET Admin Dashboard Stats
# ---------------------------
@app.get("/admin/stats")
def get_admin_stats(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.administrator:
        raise HTTPException(status_code=403, detail="Admin only")

    # ── Totals ────────────────────────────────────────────────
    total_users        = db.query(func.count(DBUser.id)).scalar()
    total_doctors      = db.query(func.count(Doctor.id)).scalar()
    total_patients     = db.query(func.count(Patient.id)).scalar()
    total_appointments = db.query(func.count(Appointment.id)).scalar()
    total_blogs        = db.query(func.count(Blog.id)).scalar()
    active_blogs       = db.query(func.count(Blog.id)).filter(Blog.is_active == True).scalar()
    total_tickets      = db.query(func.count(SupportTicket.id)).scalar()
    open_tickets       = db.query(func.count(SupportTicket.id)).filter(SupportTicket.status == "open").scalar()

    # ── User growth — last 6 months ───────────────────────────
    user_growth = []
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        d = datetime(now.year, now.month, 1) - __import__('dateutil.relativedelta', fromlist=['relativedelta']).relativedelta(months=i)
        count = db.query(func.count(DBUser.id)).filter(
            extract('year',  DBUser.creation_date) == d.year,
            extract('month', DBUser.creation_date) == d.month,
        ).scalar()
        user_growth.append({
            "month": d.strftime("%b %y"),
            "users": count or 0,
        })

    # ── Appointments per month — last 6 months ────────────────
    appts_per_month = []
    for i in range(5, -1, -1):
        d = datetime(now.year, now.month, 1) - __import__('dateutil.relativedelta', fromlist=['relativedelta']).relativedelta(months=i)
        count = db.query(func.count(Appointment.id)).filter(
            extract('year',  Appointment.appointment_date) == d.year,
            extract('month', Appointment.appointment_date) == d.month,
        ).scalar()
        appts_per_month.append({
            "month": d.strftime("%b %y"),
            "appointments": count or 0,
        })

    # ── Appointments by status ────────────────────────────────
    status_rows = db.query(
        Appointment.status, func.count(Appointment.id)
    ).group_by(Appointment.status).all()
    appts_by_status = [{"status": s, "count": c} for s, c in status_rows]

    # ── Appointments by specialty ─────────────────────────────
    specialty_rows = db.query(
        Doctor.specialty, func.count(Appointment.id)
    ).join(Appointment, Appointment.doctor_id == Doctor.id)\
     .group_by(Doctor.specialty).all()
    appts_by_specialty = [{"specialty": s or "Unknown", "count": c} for s, c in specialty_rows]

    # ── Support tickets by status ─────────────────────────────
    ticket_rows = db.query(
        SupportTicket.status, func.count(SupportTicket.id)
    ).group_by(SupportTicket.status).all()
    tickets_by_status = [{"status": s, "count": c} for s, c in ticket_rows]

    # ── Blog posts per month — last 6 months ──────────────────
    blogs_per_month = []
    for i in range(5, -1, -1):
        d = datetime(now.year, now.month, 1) - __import__('dateutil.relativedelta', fromlist=['relativedelta']).relativedelta(months=i)
        count = db.query(func.count(Blog.id)).filter(
            extract('year',  Blog.created_at) == d.year,
            extract('month', Blog.created_at) == d.month,
        ).scalar()
        blogs_per_month.append({
            "month": d.strftime("%b %y"),
            "posts": count or 0,
        })

    # ── Doctors vs Patients ratio ─────────────────────────────
    user_role_split = [
        {"role": "Doctors",  "count": total_doctors},
        {"role": "Patients", "count": total_patients},
    ]

    # ── Recent tickets (last 5) ───────────────────────────────
    recent_tickets = db.query(SupportTicket)\
        .order_by(SupportTicket.created_at.desc())\
        .limit(5).all()
    recent_tickets_out = []
    for t in recent_tickets:
        user = db.query(DBUser).filter(DBUser.id == t.user_id).first()
        recent_tickets_out.append({
            "id":             t.id,
            "subject":        t.subject,
            "status":         t.status,
            "priority":       t.priority,
            "submitter_name": f"{user.first_name} {user.last_name}" if user else "Unknown",
            "submitter_role": user.role.value if user and hasattr(user.role, 'value') else str(user.role) if user else "unknown",
            "created_at":     t.created_at,
        })

    # ── Recent users (last 5) ─────────────────────────────────
    recent_users = db.query(DBUser)\
        .order_by(DBUser.creation_date.desc())\
        .limit(5).all()
    recent_users_out = [{
        "id":         u.id,
        "name":       f"{u.first_name} {u.last_name}",
        "email":      u.email,
        "role":       u.role.value if hasattr(u.role, 'value') else str(u.role),
        "created_at": u.creation_date,
    } for u in recent_users]

    return {
        "totals": {
            "users":        total_users,
            "doctors":      total_doctors,
            "patients":     total_patients,
            "appointments": total_appointments,
            "blogs":        total_blogs,
            "active_blogs": active_blogs,
            "tickets":      total_tickets,
            "open_tickets": open_tickets,
        },
        "user_growth":        user_growth,
        "appts_per_month":    appts_per_month,
        "appts_by_status":    appts_by_status,
        "appts_by_specialty": appts_by_specialty,
        "tickets_by_status":  tickets_by_status,
        "blogs_per_month":    blogs_per_month,
        "user_role_split":    user_role_split,
        "recent_tickets":     recent_tickets_out,
        "recent_users":       recent_users_out,
    }


#=======================NOTIFICATIONS==============================
scheduler = BackgroundScheduler()

def get_db_for_scheduler():
    db = SessionLocal()
    try:
        return db
    finally:
        pass  

scheduler.add_job(lambda: create_appointment_reminder(SessionLocal()), 'cron', hour=8)
scheduler.add_job(lambda: create_weekly_signup_summary(SessionLocal()), 'cron', day_of_week='sun', hour=20)
scheduler.start()

# ── Helper: create a notification ────────────────────────────
def create_notification(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    body: str,
    entity_type: str = None,
    entity_id: int = None,
):
    """Utility called internally whenever an event occurs."""
    notif = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(notif)



def create_weekly_signup_summary(db: Session):
    """
    Call this once a week (e.g. via APScheduler or a cron job).
    Creates a summary notification for all admins.
    """
    from datetime import timedelta
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    new_doctors  = db.query(func.count(DBUser.id)).filter(
        DBUser.role == UserRole.doctor,
        DBUser.creation_date >= one_week_ago
    ).scalar() or 0
    new_patients = db.query(func.count(DBUser.id)).filter(
        DBUser.role == UserRole.patient,
        DBUser.creation_date >= one_week_ago
    ).scalar() or 0

    admins = db.query(DBUser).filter(DBUser.role == UserRole.administrator).all()
    for admin in admins:
        create_notification(
            db, admin.id,
            type="weekly_signup_summary",
            title="Weekly Signup Summary",
            body=f"This week: {new_doctors} new doctor(s) and {new_patients} new patient(s) registered.",
        )
    db.commit()


def create_appointment_reminder(db: Session):
    """
    Call this daily (e.g. via APScheduler).
    Notifies patients + doctors about appointments tomorrow.
    """
    from datetime import timedelta, date
    tomorrow = (datetime.utcnow() + timedelta(days=1)).date()

    appointments = db.query(Appointment).filter(
        func.date(Appointment.appointment_date) == tomorrow
    ).all()

    for appt in appointments:
        patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
        doctor  = db.query(Doctor).filter(Doctor.id == appt.doctor_id).first()

        if patient:
            create_notification(
                db, patient.user_id,
                type="appointment_reminder",
                title="Appointment Tomorrow",
                body=f"Reminder: you have an appointment tomorrow at {appt.start_time.strftime('%H:%M')}.",
                entity_type="appointment", entity_id=appt.id,
            )
        if doctor:
            create_notification(
                db, doctor.user_id,
                type="appointment_reminder",
                title="Appointment Tomorrow",
                body=f"Reminder: you have a patient appointment tomorrow at {appt.start_time.strftime('%H:%M')}.",
                entity_type="appointment", entity_id=appt.id,
            )
    db.commit()


def check_low_stock_and_notify(db: Session, doctor_id: int, doctor_user_id: int):
    """
    Call after any stock change.
    Creates a low_stock notification if any material is below min_quantity.
    """
    stocks = db.query(Stock).filter(Stock.doctor_id == doctor_id).all()
    for stock in stocks:
        material = db.query(Material).filter(Material.id == stock.material_id).first()
        if material and stock.quantity < material.min_quantity:
            # Avoid duplicate unread low_stock notifications for same material
            existing = db.query(Notification).filter(
                Notification.user_id == doctor_user_id,
                Notification.type == "low_stock",
                Notification.entity_id == material.id,
                Notification.is_read == False,
            ).first()
            if not existing:
                create_notification(
                    db, doctor_user_id,
                    type="low_stock",
                    title="Low Stock Alert",
                    body=f"{material.name} is running low ({float(stock.quantity)} {material.unit} remaining).",
                    entity_type="stock", entity_id=material.id,
                )
    db.commit()


def notify_feedback_request(db: Session, appointment_id: int):
    """
    Call when appointment status changes to 'finalised'.
    Asks the patient to leave feedback.
    """
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        return
    patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
    if not patient:
        return
    create_notification(
        db, patient.user_id,
        type="feedback_request",
        title="How was your appointment?",
        body="Your appointment has ended. Please take a moment to leave feedback for your doctor.",
        entity_type="appointment", entity_id=appointment_id,
    )
    db.commit()


# ── API Routes ────────────────────────────────────────────────

@app.get("/notifications")
def get_notifications(
    limit: int = Query(20, le=50),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns the latest notifications for the current user."""
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id":          n.id,
            "type":        n.type,
            "title":       n.title,
            "body":        n.body,
            "is_read":     n.is_read,
            "entity_type": n.entity_type,
            "entity_id":   n.entity_id,
            "created_at":  n.created_at,
        }
        for n in notifications
    ]


@app.get("/notifications/unread-count")
def get_unread_count(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns total unread notification count — used for the bell badge."""
    count = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).scalar()
    return {"count": count or 0}


@app.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a single notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"ok": True}


@app.patch("/notifications/read-all")
def mark_all_read(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read for the current user."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}


@app.delete("/notifications/{notification_id}")
def delete_notification(
    notification_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a notification."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return {"ok": True}