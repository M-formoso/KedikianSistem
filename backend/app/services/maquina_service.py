# Servicio para operaciones de Maquina

from app.db.models import Maquina
from app.schemas.schemas import MaquinaSchema, MaquinaCreate, MaquinaOut
from sqlalchemy.orm import Session
from typing import List, Optional

def get_maquinas(db: Session) -> List[MaquinaOut]:
    maquinas = db.query(Maquina).all()
    return [MaquinaOut(
        id=m.id,
        nombre=m.nombre,
        estado=m.estado,
        horas_uso=m.horas_uso,
        proyecto_id=m.proyecto_id
    ) for m in maquinas]

def get_maquina(db: Session, maquina_id: int) -> Optional[MaquinaOut]:
    m = db.query(Maquina).filter(Maquina.id == maquina_id).first()
    if m:
        return MaquinaOut(
            id=m.id,
            nombre=m.nombre,
            estado=m.estado,
            horas_uso=m.horas_uso,
            proyecto_id=m.proyecto_id
        )
    return None

def create_maquina(db: Session, maquina: MaquinaCreate) -> MaquinaOut:
    nueva_maquina = Maquina(**maquina.model_dump())
    db.add(nueva_maquina)
    db.commit()
    db.refresh(nueva_maquina)
    return MaquinaOut(
        id=nueva_maquina.id,
        nombre=nueva_maquina.nombre,
        estado=nueva_maquina.estado,
        horas_uso=nueva_maquina.horas_uso,
        proyecto_id=nueva_maquina.proyecto_id
    )

def update_maquina(db: Session, maquina_id: int, maquina: MaquinaSchema) -> Optional[MaquinaOut]:
    existing_maquina = db.query(Maquina).filter(Maquina.id == maquina_id).first()
    if existing_maquina:
        for field, value in maquina.model_dump().items():
            setattr(existing_maquina, field, value)
        db.commit()
        db.refresh(existing_maquina)
        return MaquinaOut(
            id=existing_maquina.id,
            nombre=existing_maquina.nombre,
            estado=existing_maquina.estado,
            horas_uso=existing_maquina.horas_uso,
            proyecto_id=existing_maquina.proyecto_id
        )
    return None

def delete_maquina(db: Session, maquina_id: int) -> bool:
    maquina = db.query(Maquina).filter(Maquina.id == maquina_id).first()
    if maquina:
        db.delete(maquina)
        db.commit()
        return True
    return False

def get_all_maquinas_paginated(db: Session, skip: int = 0, limit: int = 15) -> List[MaquinaOut]:
    maquinas = db.query(Maquina).offset(skip).limit(limit).all()
    return [MaquinaOut.model_validate(m) for m in maquinas]