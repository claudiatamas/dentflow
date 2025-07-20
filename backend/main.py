from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from dependencies import get_doctor_id
from database import SessionLocal
from models import User, Doctor, Patient, Stock, StockChange, Material
from schemas import UserCreate, UserLogin, UserRole,  MaterialCreate, MaterialOut, StockOut, StockUpdate,StockChangeCreate, StockChangeOut
from passlib.context import CryptContext
from jose import JWTError, jwt 
from datetime import datetime, timedelta
import os
from typing import Optional
import shutil
from fastapi.security import OAuth2PasswordBearer
from typing import List

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


SECRET_KEY = "secretkey123"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

UPLOAD_FOLDER = "static/uploads/profile_pictures"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



def create_access_token(data: dict, expires_delta: timedelta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)):
    to_encode = data.copy()
    expire = datetime.now() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)



def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)



def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


@app.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = pwd_context.hash(user.password)
    new_user = User(
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        password=hashed_password,
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

    return {"message": "User created successfully", "redirect": "/login"}



@app.post("/login")
def login_for_access_token(form_data: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == form_data.email).first()
    if not db_user or not verify_password(form_data.password, db_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={
        "sub": db_user.email,
        "role": db_user.role.value if hasattr(db_user.role, 'value') else str(db_user.role)
    })

    role_str = db_user.role.value if hasattr(db_user.role, 'value') else str(db_user.role)
    
    if role_str == "administrator":
        redirect_url = "/dashboard_admin"
    elif role_str == "doctor":
        redirect_url = "/dashboard_doctor"
    elif role_str == "patient":
        redirect_url = "/dashboard_patient"
    else:
        raise HTTPException(status_code=400, detail="Invalid user role")

    return {"access_token": access_token, "token_type": "bearer", "redirect": redirect_url}



@app.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    base_data = {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "role": user.role.value,
        "phone": user.phone,
        "gender": user.gender.value if user.gender else None,
        "creation_date": user.creation_date.isoformat() if user.creation_date else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "profile_picture": user.profile_picture,
        "status": user.status.value,
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
    elif user.role == UserRole.patient and user.patient:
        base_data["patient"] = {
            "medical_history": user.patient.medical_history if hasattr(user.patient, "medical_history") else None,
        }

    return base_data

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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    fields = {
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

    for field, value in fields.items():
        if value is not None:
            setattr(user, field, value)


    if profile_picture and profile_picture.filename:
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        filename = f"user_{user.id}_{profile_picture.filename}"
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(profile_picture.file, buffer)
        

        user.profile_picture = f"http://localhost:8000/uploads/{filename}"


    if user.role.name == "doctor":
        doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
        if doctor:
            if specialty: doctor.specialty = specialty
            if description: doctor.description = description
            if accreditation: doctor.accreditation = accreditation

    db.commit()
    db.refresh(user)

    base_data = {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "role": user.role.value,
        "phone": user.phone,
        "gender": user.gender.value if user.gender else None,
        "creation_date": user.creation_date.isoformat() if user.creation_date else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "profile_picture": user.profile_picture,
        "status": user.status.value,
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
    elif user.role == UserRole.PATIENT and user.patient:
        base_data["patient"] = {
            "medical_history": user.patient.medical_history if hasattr(user.patient, "medical_history") else None,
        }

    return base_data


@app.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")


#STOCK MANAGEMENT
@app.get("/materials", response_model=List[MaterialOut])
def read_materials(
    db: Session = Depends(get_db),
    doctor_id: int = Depends(get_doctor_id)
):
    if doctor_id is None:
        raise HTTPException(status_code=400, detail="User is not assigned to a doctor")

    materials = db.query(Material).filter(Material.doctor_id == doctor_id).all()
    return materials


@app.post("/materials", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
def create_material(
    material: MaterialCreate,
    db: Session = Depends(get_db),
    doctor_id: int = Depends(get_doctor_id)
):
    if material.sku and db.query(Material).filter(Material.sku == material.sku).first():
        raise HTTPException(status_code=400, detail="SKU already exists")

    mat = Material(**material.dict())
    db.add(mat)
    db.commit()
    db.refresh(mat)
    return mat

# --------------- STOCK ---------------
@app.get("/stock", response_model=List[StockOut])
def read_stock(
    db: Session = Depends(get_db),
    doctor_id: int = Depends(get_doctor_id)
):
    doc_id = doctor_id.doctor_id
    if doc_id is None:
        raise HTTPException(status_code=400, detail="User is not assigned to a doctor")
    return db.query(Stock).filter(Stock.doctor_id == doc_id).all()

@app.put("/stock/{stock_id}", response_model=StockOut)
def update_stock_quantity(
    stock_id: int,
    stock_update: StockUpdate,
    db: Session = Depends(get_db),
    doctor_id: int = Depends(get_doctor_id)
):
    doc_id = doctor_id.doctor_id
    stock = db.query(Stock).filter(Stock.id == stock_id, Stock.doctor_id == doc_id).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock item not found")

    if stock_update.quantity is not None:
        if stock_update.quantity < 0:
            raise HTTPException(status_code=400, detail="Quantity cannot be negative")
        stock.quantity = stock_update.quantity
        stock.last_updated = datetime.utcnow()

    db.commit()
    db.refresh(stock)
    return stock

@app.post("/stock_changes", response_model=StockChangeOut, status_code=status.HTTP_201_CREATED)
def add_stock_change(
    change: StockChangeCreate,
    db: Session = Depends(get_db),
    doctor_id: User = Depends(get_doctor_id),
):
    doc_id = doctor_id.doctor_id
    stock = db.query(Stock).filter(
        Stock.doctor_id == doc_id,
        Stock.material_id == change.material_id
    ).first()

    if not stock:
        stock = Stock(
            doctor_id=doc_id,
            material_id=change.material_id,
            quantity=0,
            last_updated=datetime.utcnow()
        )
        db.add(stock)
        db.commit()
        db.refresh(stock)

    new_qty = stock.quantity + change.change_amount
    if new_qty < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    stock.quantity = new_qty
    stock.last_updated = datetime.utcnow()

    sc = StockChange(
        doctor_id=doc_id,
        material_id=change.material_id,
        change_amount=change.change_amount,
        reason=change.reason,
        changed_at=datetime.utcnow()
    )
    db.add(sc)
    db.commit()
    db.refresh(sc)
    return sc