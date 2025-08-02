from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.db.models import Usuario
from app.services.usuario_service import get_usuario_by_email
from app.security.auth import create_access_token
from passlib.context import CryptContext
import base64

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def authenticate_user(db: Session, email: str, password: str) -> Usuario:
    user = get_usuario_by_email(db, email)
    if not user or not user.hash_contrasena:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        if not pwd_context.verify(password, user.hash_contrasena):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def login_user(db: Session, email: str, password: str):
    # Decodificar credenciales en base64
    email_decoded = base64.b64decode(email).decode('utf-8')
    password_decoded = base64.b64decode(password).decode('utf-8')
    user = authenticate_user(db, email_decoded, password_decoded)
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}
