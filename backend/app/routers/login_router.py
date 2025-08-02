from fastapi import APIRouter, Depends, HTTPException, status, Form, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.dependencies import get_db
from app.services.login_service import login_user
from app.security.auth import get_current_user
from app.schemas.schemas import UsuarioOut
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    print(f"🔐 LOGIN ATTEMPT - Username: {form_data.username}")
    try:
        result = login_user(db, form_data.username, form_data.password)
        print(f"✅ LOGIN SUCCESS - Token: {result['access_token'][:50]}...")
        return result
    except Exception as e:
        print(f"❌ LOGIN ERROR - {e}")
        raise e

@router.get("/me", response_model=UsuarioOut)
def get_current_user_info(current_user: UsuarioOut = Depends(get_current_user)):
    """Obtener información del usuario autenticado"""
    return current_user

@router.get("/me")
def get_current_user_info(current_user: UsuarioOut = Depends(get_current_user)):
    return current_user

@router.post("/login-debug")
def login_debug(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    print(f"DEBUG - Username recibido: {form_data.username}")
    print(f"DEBUG - Password recibido: {form_data.password}")
    return {"username": form_data.username, "password": form_data.password}

@router.post("/login-test")
def login_test(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        result = login_user(db, form_data.username, form_data.password)
        print(f"DEBUG - Login exitoso: {result}")
        return result
    except Exception as e:
        print(f"DEBUG - Error en login: {e}")
        raise e
