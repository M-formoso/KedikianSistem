# Servicio para operaciones de Contrato
from app.db.models import Contrato
from app.schemas.schemas import ContratoSchema, ContratoCreate, ContratoOut
from sqlalchemy.orm import Session
from typing import List, Optional

def get_contratos(db: Session) -> List[ContratoOut]:
    contratos = db.query(Contrato).all()
    return [ContratoOut(
        id=c.id,
        proyecto_id=c.proyecto_id,
        detalle=c.detalle,
        cliente=c.cliente,
        importe_total=c.importe_total,
        fecha_inicio=c.fecha_inicio,
        fecha_terminacion=c.fecha_terminacion
    ) for c in contratos]

def get_contrato(db: Session, contrato_id: int) -> Optional[ContratoOut]:
    c = db.query(Contrato).filter(Contrato.id == contrato_id).first()
    if c:
        return ContratoOut(
            id=c.id,
            proyecto_id=c.proyecto_id,
            detalle=c.detalle,
            cliente=c.cliente,
            importe_total=c.importe_total,
            fecha_inicio=c.fecha_inicio,
            fecha_terminacion=c.fecha_terminacion
        )
    return None

def create_contrato(db: Session, contrato: ContratoCreate) -> ContratoOut:
    nuevo_contrato = Contrato(**contrato.model_dump())
    db.add(nuevo_contrato)
    db.commit()
    db.refresh(nuevo_contrato)
    return ContratoOut(
        id=nuevo_contrato.id,
        proyecto_id=nuevo_contrato.proyecto_id,
        detalle=nuevo_contrato.detalle,
        cliente=nuevo_contrato.cliente,
        importe_total=nuevo_contrato.importe_total,
        fecha_inicio=nuevo_contrato.fecha_inicio,
        fecha_terminacion=nuevo_contrato.fecha_terminacion
    )

def update_contrato(db: Session, contrato_id: int, contrato: ContratoSchema) -> Optional[ContratoOut]:
    existing_contrato = db.query(Contrato).filter(Contrato.id == contrato_id).first()
    if existing_contrato:
        for field, value in contrato.model_dump().items():
            setattr(existing_contrato, field, value)
        db.commit()
        db.refresh(existing_contrato)
        return ContratoOut(
            id=existing_contrato.id,
            proyecto_id=existing_contrato.proyecto_id,
            detalle=existing_contrato.detalle,
            cliente=existing_contrato.cliente,
            importe_total=existing_contrato.importe_total,
            fecha_inicio=existing_contrato.fecha_inicio,
            fecha_terminacion=existing_contrato.fecha_terminacion
        )
    return None

def delete_contrato(db: Session, contrato_id: int) -> bool:
    contrato = db.query(Contrato).filter(Contrato.id == contrato_id).first()
    if contrato:
        db.delete(contrato)
        db.commit()
        return True
    return False

def get_all_contratos_paginated(db: Session, skip: int = 0, limit: int = 15) -> List[ContratoOut]:
    contratos = db.query(Contrato).offset(skip).limit(limit).all()
    return [ContratoOut.model_validate(c) for c in contratos]