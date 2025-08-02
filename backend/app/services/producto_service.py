from app.db.models import Producto
from app.schemas.schemas import ProductoSchema, ProductoCreate, ProductoOut
from sqlalchemy.orm import Session
from typing import List, Optional
import os

UPLOAD_DIR = "static/productos/"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Servicio para operaciones de Producto

def get_productos(db: Session) -> List[ProductoOut]:
    productos = db.query(Producto).all()
    return [ProductoOut(
        id=p.id,
        nombre=p.nombre,
        codigo_producto=p.codigo_producto,
        inventario=p.inventario,
        url_imagen=p.url_imagen
    ) for p in productos]

def get_producto(db: Session, producto_id: int) -> Optional[ProductoOut]:
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    if p:
        return ProductoOut(
            id=p.id,
            nombre=p.nombre,
            codigo_producto=p.codigo_producto,
            inventario=p.inventario,
            url_imagen=p.url_imagen
        )
    return None

def create_producto(db: Session, nombre: str, codigo_producto: str, inventario: int, imagen=None) -> ProductoOut:
    if imagen:
        filename = f"{codigo_producto}_{imagen.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(imagen.file.read())
        url_imagen = f"/static/productos/{filename}"
    else:
        url_imagen = None  # o '' si prefieres string vacío
    nuevo_producto = Producto(
        nombre=nombre,
        codigo_producto=codigo_producto,
        inventario=inventario,
        url_imagen=url_imagen
    )
    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)
    return ProductoOut(
        id=nuevo_producto.id,
        nombre=nuevo_producto.nombre,
        codigo_producto=nuevo_producto.codigo_producto,
        inventario=nuevo_producto.inventario,
        url_imagen=nuevo_producto.url_imagen
    )

def update_producto(db: Session, producto_id: int, nombre: str, codigo_producto: str, inventario: int, imagen=None) -> Optional[ProductoOut]:
    existing_producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if existing_producto:
        existing_producto.nombre = nombre
        existing_producto.codigo_producto = codigo_producto
        existing_producto.inventario = inventario
        if imagen:
            filename = f"{codigo_producto}_{imagen.filename}"
            file_path = os.path.join(UPLOAD_DIR, filename)
            with open(file_path, "wb") as f:
                f.write(imagen.file.read())
            existing_producto.url_imagen = f"/static/productos/{filename}"
        db.commit()
        db.refresh(existing_producto)
        return ProductoOut(
            id=existing_producto.id,
            nombre=existing_producto.nombre,
            codigo_producto=existing_producto.codigo_producto,
            inventario=existing_producto.inventario,
            url_imagen=existing_producto.url_imagen
        )
    return None

def delete_producto(db: Session, producto_id: int) -> bool:
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if producto:
        db.delete(producto)
        db.commit()
        return True
    return False

def get_all_productos_paginated(db: Session, skip: int = 0, limit: int = 15) -> List[ProductoOut]:
    productos = db.query(Producto).offset(skip).limit(limit).all()
    return [ProductoOut.model_validate(p) for p in productos]