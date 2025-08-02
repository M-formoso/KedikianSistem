# Servicio para operaciones de Arrendamiento

from app.db.models import Arrendamiento
from app.schemas.schemas import ArrendamientoSchema, ArrendamientoCreate, ArrendamientoOut
from sqlalchemy.orm import Session
from typing import List, Optional

def get_arrendamientos(db: Session) -> List[ArrendamientoOut]:
    arrs = db.query(Arrendamiento).all()
    return [ArrendamientoOut(
        id=a.id,
        proyecto_id=a.proyecto_id,
        maquina_id=a.maquina_id,
        horas_uso=a.horas_uso,
        fecha_asignacion=a.fecha_asignacion
    ) for a in arrs]

def get_arrendamiento(db: Session, arrendamiento_id: int) -> Optional[ArrendamientoOut]:
    a = db.query(Arrendamiento).filter(Arrendamiento.id == arrendamiento_id).first()
    if a:
        return ArrendamientoOut(
            id=a.id,
            proyecto_id=a.proyecto_id,
            maquina_id=a.maquina_id,
            horas_uso=a.horas_uso,
            fecha_asignacion=a.fecha_asignacion
        )
    return None

def create_arrendamiento(db: Session, arrendamiento: ArrendamientoCreate) -> ArrendamientoOut:
    nuevo_arr = Arrendamiento(**arrendamiento.model_dump())
    db.add(nuevo_arr)
    db.commit()
    db.refresh(nuevo_arr)
    return ArrendamientoOut(
        id=nuevo_arr.id,
        proyecto_id=nuevo_arr.proyecto_id,
        maquina_id=nuevo_arr.maquina_id,
        horas_uso=nuevo_arr.horas_uso,
        fecha_asignacion=nuevo_arr.fecha_asignacion
    )

def update_arrendamiento(db: Session, arrendamiento_id: int, arrendamiento: ArrendamientoSchema) -> Optional[ArrendamientoOut]:
    existing_arr = db.query(Arrendamiento).filter(Arrendamiento.id == arrendamiento_id).first()
    if existing_arr:
        for field, value in arrendamiento.model_dump().items():
            setattr(existing_arr, field, value)
        db.commit()
        db.refresh(existing_arr)
        return ArrendamientoOut(
            id=existing_arr.id,
            proyecto_id=existing_arr.proyecto_id,
            maquina_id=existing_arr.maquina_id,
            horas_uso=existing_arr.horas_uso,
            fecha_asignacion=existing_arr.fecha_asignacion
        )
    return None

def delete_arrendamiento(db: Session, arrendamiento_id: int) -> bool:
    arr = db.query(Arrendamiento).filter(Arrendamiento.id == arrendamiento_id).first()
    if arr:
        db.delete(arr)
        db.commit()
        return True
    return False

def get_all_arrendamientos_paginated(db: Session, skip: int = 0, limit: int = 15) -> List[ArrendamientoOut]:
    arrs = db.query(Arrendamiento).offset(skip).limit(limit).all()
    return [ArrendamientoOut(
        id=a.id,
        proyecto_id=a.proyecto_id,
        maquina_id=a.maquina_id,
        horas_uso=a.horas_uso,
        fecha_asignacion=a.fecha_asignacion
    ) for a in arrs]
