from app.db.models import MovimientoInventario, Producto
from app.schemas.schemas import MovimientoInventarioSchema, MovimientoInventarioCreate, MovimientoInventarioOut
from sqlalchemy.orm import Session
from typing import List, Optional

# Servicio para operaciones de Movimiento de Inventario

def get_movimientos_inventario(db: Session) -> List[MovimientoInventarioOut]:
    movimientos = db.query(MovimientoInventario).all()
    return [MovimientoInventarioOut(
        id=m.id,
        producto_id=m.producto_id,
        usuario_id=m.usuario_id,
        cantidad=m.cantidad,
        fecha=m.fecha,
        tipo_transaccion=m.tipo_transaccion
    ) for m in movimientos]

def get_movimiento_inventario(db: Session, movimiento_id: int) -> Optional[MovimientoInventarioOut]:
    m = db.query(MovimientoInventario).filter(MovimientoInventario.id == movimiento_id).first()
    if m:
        return MovimientoInventarioOut(
            id=m.id,
            producto_id=m.producto_id,
            usuario_id=m.usuario_id,
            cantidad=m.cantidad,
            fecha=m.fecha,
            tipo_transaccion=m.tipo_transaccion
        )
    return None

def create_movimiento_inventario(db: Session, movimiento: MovimientoInventarioCreate) -> MovimientoInventarioOut:
    nuevo_movimiento = MovimientoInventario(**movimiento.model_dump())
    db.add(nuevo_movimiento)
    # Actualizar inventario del producto
    producto = db.query(Producto).filter(Producto.id == movimiento.producto_id).first()
    if producto:
        if movimiento.tipo_transaccion == "entrada":
            producto.inventario += movimiento.cantidad
        elif movimiento.tipo_transaccion == "salida":
            producto.inventario -= movimiento.cantidad
    db.commit()
    db.refresh(nuevo_movimiento)
    return MovimientoInventarioOut(
        id=nuevo_movimiento.id,
        producto_id=nuevo_movimiento.producto_id,
        usuario_id=nuevo_movimiento.usuario_id,
        cantidad=nuevo_movimiento.cantidad,
        fecha=nuevo_movimiento.fecha,
        tipo_transaccion=nuevo_movimiento.tipo_transaccion
    )

def update_movimiento_inventario(db: Session, movimiento_id: int, movimiento: MovimientoInventarioSchema) -> Optional[MovimientoInventarioOut]:
    existing_movimiento = db.query(MovimientoInventario).filter(MovimientoInventario.id == movimiento_id).first()
    if existing_movimiento:
        for field, value in movimiento.model_dump().items():
            setattr(existing_movimiento, field, value)
        db.commit()
        db.refresh(existing_movimiento)
        return MovimientoInventarioOut(
            id=existing_movimiento.id,
            producto_id=existing_movimiento.producto_id,
            usuario_id=existing_movimiento.usuario_id,
            cantidad=existing_movimiento.cantidad,
            fecha=existing_movimiento.fecha,
            tipo_transaccion=existing_movimiento.tipo_transaccion
        )
    return None

def delete_movimiento_inventario(db: Session, movimiento_id: int) -> bool:
    movimiento = db.query(MovimientoInventario).filter(MovimientoInventario.id == movimiento_id).first()
    if movimiento:
        db.delete(movimiento)
        db.commit()
        return True
    return False

def get_all_movimientos_inventario_paginated(db: Session, skip: int = 0, limit: int = 15) -> List[MovimientoInventarioOut]:
    movimientos = db.query(MovimientoInventario).offset(skip).limit(limit).all()
    return [MovimientoInventarioOut.model_validate(m) for m in movimientos]