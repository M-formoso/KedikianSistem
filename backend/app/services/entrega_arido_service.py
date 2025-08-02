from sqlalchemy.orm import Session
from app.db.models.entrega_arido import EntregaArido
from app.schemas.schemas import EntregaAridoCreate, EntregaAridoOut
from typing import List, Optional
from datetime import datetime
from sqlalchemy import extract, func

def create_entrega_arido(db: Session, entrega_data: EntregaAridoCreate) -> EntregaAridoOut:
    entrega = EntregaArido(**entrega_data.dict())
    db.add(entrega)
    db.commit()
    db.refresh(entrega)
    return EntregaAridoOut.model_validate(entrega)

def get_entrega_arido(db: Session, entrega_id: int) -> Optional[EntregaAridoOut]:
    entrega = db.query(EntregaArido).filter(EntregaArido.id == entrega_id).first()
    if entrega:
        return EntregaAridoOut.model_validate(entrega)
    return None

def get_all_entregas_arido(db: Session, skip: int = 0, limit: int = 100) -> List[EntregaAridoOut]:
    entregas = db.query(EntregaArido).offset(skip).limit(limit).all()
    return [EntregaAridoOut.model_validate(e) for e in entregas]

def update_entrega_arido(db: Session, entrega_id: int, entrega_data: EntregaAridoCreate) -> Optional[EntregaAridoOut]:
    entrega = db.query(EntregaArido).filter(EntregaArido.id == entrega_id).first()
    if not entrega:
        return None
    for key, value in entrega_data.dict().items():
        setattr(entrega, key, value)
    db.commit()
    db.refresh(entrega)
    return EntregaAridoOut.model_validate(entrega)

def delete_entrega_arido(db: Session, entrega_id: int) -> bool:
    entrega = db.query(EntregaArido).filter(EntregaArido.id == entrega_id).first()
    if not entrega:
        return False
    db.delete(entrega)
    db.commit()
    return True

# Devuelve la suma de material entregado en el mes de la fecha actual
def get_suma_material_mes_actual(db: Session) -> int:
    now = datetime.now()
    suma = db.query(func.sum(EntregaArido.cantidad)).filter(
        extract('year', EntregaArido.fecha_entrega) == now.year,
        extract('month', EntregaArido.fecha_entrega) == now.month
    ).scalar()
    return int(suma) if suma else 0

def get_all_entregas_arido_paginated(db: Session, skip: int = 0, limit: int = 15) -> List[EntregaAridoOut]:
    entregas = db.query(EntregaArido).offset(skip).limit(limit).all()
    return [EntregaAridoOut.model_validate(e) for e in entregas]