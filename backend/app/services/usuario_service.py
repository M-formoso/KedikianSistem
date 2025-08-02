from app.db.models import Usuario
from app.schemas.schemas import UsuarioSchema, UsuarioOut, UsuarioCreate, RolEnum
from sqlalchemy.orm import Session
from typing import List, Optional
from passlib.context import CryptContext
from datetime import datetime

# Servicio para operaciones de Usuario

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_usuarios(db: Session) -> List[UsuarioOut]:
    usuarios = db.query(Usuario).all()
    return [UsuarioOut(
        id=u.id,
        nombre=u.nombre,
        email=u.email,
        estado=u.estado,
        roles=RolEnum(u.roles) if u.roles else RolEnum.OPERARIO,
        fecha_creacion=u.fecha_creacion
    ) for u in usuarios]

def get_usuario(db: Session, usuario_id: int) -> Optional[UsuarioOut]:
    u = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if u:
        return UsuarioOut(
            id=u.id,
            nombre=u.nombre,
            email=u.email,
            estado=u.estado,
            roles=RolEnum(u.roles) if u.roles else RolEnum.OPERARIO,
            fecha_creacion=u.fecha_creacion
        )
    return None

def create_usuario(db: Session, usuario: UsuarioCreate) -> UsuarioOut:
    # Hashear la contraseña antes de guardar
    hashed_password = pwd_context.hash(usuario.hash_contrasena)
    nuevo_usuario = Usuario(
        nombre=usuario.nombre,
        email=usuario.email,
        hash_contrasena=hashed_password,
        estado=usuario.estado,
        roles=usuario.roles.value,  # Usar el valor del enum
        fecha_creacion=usuario.fecha_creacion or datetime.now()
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    
    return UsuarioOut(
        id=nuevo_usuario.id,
        nombre=nuevo_usuario.nombre,
        email=nuevo_usuario.email,
        estado=nuevo_usuario.estado,
        roles=RolEnum(nuevo_usuario.roles),  # Convertir de string a enum
        fecha_creacion=nuevo_usuario.fecha_creacion
    )

def update_usuario(db: Session, usuario_id: int, usuario: UsuarioSchema) -> Optional[UsuarioOut]:
    existing_usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if existing_usuario:
        data = usuario.model_dump()
        # Convertir enum a string para la base de datos
        if 'roles' in data and hasattr(data['roles'], 'value'):
            data['roles'] = data['roles'].value
        for field, value in data.items():
            if field != 'id':  # No actualizar el ID
                setattr(existing_usuario, field, value)
        db.commit()
        db.refresh(existing_usuario)
        return UsuarioOut(
            id=existing_usuario.id,
            nombre=existing_usuario.nombre,
            email=existing_usuario.email,
            estado=existing_usuario.estado,
            roles=RolEnum(existing_usuario.roles),
            fecha_creacion=existing_usuario.fecha_creacion
        )
    return None

def delete_usuario(db: Session, usuario_id: int) -> bool:
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if usuario:
        db.delete(usuario)
        db.commit()
        return True
    return False

def get_usuario_by_email(db: Session, email: str) -> Optional[UsuarioOut]:
    u = db.query(Usuario).filter(Usuario.email == email).first()
    if u:
        return UsuarioOut(
            id=u.id,
            nombre=u.nombre,
            email=u.email,
            estado=u.estado,
            roles=u.roles.split(',') if u.roles else [],
            fecha_creacion=u.fecha_creacion,
            hash_contrasena=u.hash_contrasena
        )
    return None

def get_all_usuarios_paginated(db: Session, skip: int = 0, limit: int = 15) -> List[UsuarioOut]:
    usuarios = db.query(Usuario).offset(skip).limit(limit).all()
    return [UsuarioOut.model_validate(u) for u in usuarios]