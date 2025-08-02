from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db.models import Usuario
from passlib.context import CryptContext
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user():
    db = SessionLocal()
    try:
        # Verificar si ya existe un usuario administrador
        existing_admin = db.query(Usuario).filter(Usuario.email == "admin@kedikian.com").first()
        if existing_admin:
            print("Usuario administrador ya existe")
            return
        
        # Crear hash de la contraseña
        hashed_password = pwd_context.hash("admin123")
        
        # Crear usuario administrador
        admin_user = Usuario(
            nombre="Administrador",
            email="admin@kedikian.com",
            hash_contrasena=hashed_password,
            estado=True,
            roles="admin",
            fecha_creacion=datetime.now()
        )
        
        db.add(admin_user)
        db.commit()
        print("Usuario administrador creado exitosamente")
        print("Email: admin@kedikian.com")
        print("Password: admin123")
        
    except Exception as e:
        print(f"Error al crear usuario administrador: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user() 