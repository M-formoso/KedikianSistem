# Servicio para operaciones de Gasto

from app.db.models import Gasto
from app.schemas.schemas import GastoSchema, GastoCreate, GastoOut
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy.exc import SQLAlchemyError
from fastapi import UploadFile
from datetime import datetime
from sqlalchemy import extract, func
import base64

def safe_base64_encode(data):
    if data is None:
        return None
    if isinstance(data, str):
        return None
    return base64.b64encode(data).decode('utf-8')

def get_gastos(db: Session) -> List[GastoOut]:
    try:
        gastos = db.query(Gasto).all()
        return [GastoOut(
            id=g.id,
            usuario_id=g.usuario_id,
            maquina_id=g.maquina_id,
            tipo=g.tipo,
            importe_total=g.importe_total,
            fecha=g.fecha,
            descripcion=g.descripcion,
            imagen=safe_base64_encode(g.imagen)
        ) for g in gastos]
    except SQLAlchemyError as e:
        db.rollback()
        raise Exception(f"Error al obtener gastos: {str(e)}")

def get_gasto(db: Session, gasto_id: int) -> Optional[GastoOut]:
    try:
        g = db.query(Gasto).filter(Gasto.id == gasto_id).first()
        if g:
            return GastoOut(
                id=g.id,
                usuario_id=g.usuario_id,
                maquina_id=g.maquina_id,
                tipo=g.tipo,
                importe_total=g.importe_total,
                fecha=g.fecha,
                descripcion=g.descripcion,
                imagen=safe_base64_encode(g.imagen)
            )
        return None
    except SQLAlchemyError as e:
        db.rollback()
        raise Exception(f"Error al obtener gasto: {str(e)}")

def create_gasto(db: Session, usuario_id: int, maquina_id: int, tipo: str, importe_total: int, fecha: str, descripcion: str, imagen: UploadFile = None) -> GastoOut:
    from datetime import datetime
    try:
        gasto_data = {
            "usuario_id": usuario_id,
            "maquina_id": maquina_id,
            "tipo": tipo,
            "importe_total": importe_total,
            "fecha": datetime.fromisoformat(fecha),
            "descripcion": descripcion,
            "imagen": imagen.file.read() if imagen else None
        }
        nuevo_gasto = Gasto(**gasto_data)
        db.add(nuevo_gasto)
        db.commit()
        db.refresh(nuevo_gasto)
        return GastoOut(
            id=nuevo_gasto.id,
            usuario_id=nuevo_gasto.usuario_id,
            maquina_id=nuevo_gasto.maquina_id,
            tipo=nuevo_gasto.tipo,
            importe_total=nuevo_gasto.importe_total,
            fecha=nuevo_gasto.fecha,
            descripcion=nuevo_gasto.descripcion,
            imagen=safe_base64_encode(nuevo_gasto.imagen)
        )
    except SQLAlchemyError as e:
        db.rollback()
        raise Exception(f"Error al crear gasto: {str(e)}")

def update_gasto(db: Session, gasto_id: int, usuario_id: int, maquina_id: int, tipo: str, importe_total: int, fecha: str, descripcion: str, imagen: UploadFile = None) -> Optional[GastoOut]:
    import os
    from datetime import datetime
    try:
        existing_gasto = db.query(Gasto).filter(Gasto.id == gasto_id).first()
        if existing_gasto:
            existing_gasto.usuario_id = usuario_id
            existing_gasto.maquina_id = maquina_id
            existing_gasto.tipo = tipo
            existing_gasto.importe_total = importe_total
            existing_gasto.fecha = datetime.fromisoformat(fecha)
            existing_gasto.descripcion = descripcion

            if imagen:
                existing_gasto.imagen = imagen.file.read()

            db.commit()
            db.refresh(existing_gasto)
            return GastoOut(
                id=existing_gasto.id,
                usuario_id=existing_gasto.usuario_id,
                maquina_id=existing_gasto.maquina_id,
                tipo=existing_gasto.tipo,
                importe_total=existing_gasto.importe_total,
                fecha=existing_gasto.fecha,
                descripcion=existing_gasto.descripcion,
                imagen=safe_base64_encode(existing_gasto.imagen)
            )
        return None
    except SQLAlchemyError as e:
        db.rollback()
        raise Exception(f"Error al actualizar gasto: {str(e)}")

def delete_gasto(db: Session, gasto_id: int) -> bool:
    try:
        gasto = db.query(Gasto).filter(Gasto.id == gasto_id).first()
        if gasto:
            db.delete(gasto)
            db.commit()
            return True
        return False
    except SQLAlchemyError as e:
        db.rollback()
        raise Exception(f"Error al eliminar gasto: {str(e)}")

# Devuelve el total de gasto en combustible en el mes de la fecha actual
def get_total_combustible_mes_actual(db: Session) -> int:
    now = datetime.now()
    total = db.query(func.sum(Gasto.importe_total)).filter(
        Gasto.tipo == 'Combustible',
        extract('year', Gasto.fecha) == now.year,
        extract('month', Gasto.fecha) == now.month
    ).scalar()
    return int(total) if total else 0

def get_all_gastos_paginated(db: Session, skip: int = 0, limit: int = 15) -> List[GastoOut]:
    gastos = db.query(Gasto).offset(skip).limit(limit).all()
    return [GastoOut(
        id=g.id,
        usuario_id=g.usuario_id,
        maquina_id=g.maquina_id,
        tipo=g.tipo,
        importe_total=g.importe_total,
        fecha=g.fecha,
        descripcion=g.descripcion,
        imagen=safe_base64_encode(g.imagen)
    ) for g in gastos]