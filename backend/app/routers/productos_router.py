from fastapi import APIRouter, Depends, File, UploadFile, Form
from fastapi.responses import JSONResponse
from typing import List, Optional
from app.db.dependencies import get_db
from app.schemas.schemas import ProductoSchema
from sqlalchemy.orm import Session
from app.services.producto_service import (
    get_productos as service_get_productos,
    get_producto as service_get_producto,
    create_producto as service_create_producto,
    update_producto as service_update_producto,
    delete_producto as service_delete_producto,
    get_all_productos_paginated
)
import os
from app.security.auth import get_current_user

router = APIRouter(prefix="/productos", tags=["Productos"], dependencies=[Depends(get_current_user)])

UPLOAD_DIR = "static/productos/"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Endpoints Productos
@router.get("/", response_model=List[ProductoSchema])
def get_productos(session: Session = Depends(get_db)):
    return service_get_productos(session)

@router.get("/{id}", response_model=ProductoSchema)
def get_producto(id: int, session: Session = Depends(get_db)):
    producto = service_get_producto(session, id)
    if producto:
        return producto
    else:
        return JSONResponse(content={"error": "Producto no encontrado"}, status_code=404)

@router.post("/", response_model=ProductoSchema, status_code=201)
def create_producto(
    nombre: str = Form(...),
    codigo_producto: str = Form(...),
    inventario: int = Form(...),
    imagen: Optional[UploadFile] = File(None),
    session: Session = Depends(get_db)
):
    return service_create_producto(session, nombre, codigo_producto, inventario, imagen)

@router.put("/{id}", response_model=ProductoSchema)
def update_producto(
    id: int,
    nombre: str = Form(...),
    codigo_producto: str = Form(...),
    inventario: int = Form(...),
    imagen: Optional[UploadFile] = File(None),
    session: Session = Depends(get_db)
):
    updated = service_update_producto(session, id, nombre, codigo_producto, inventario, imagen)
    if updated:
        return updated
    else:
        return JSONResponse(content={"error": "Producto no encontrado"}, status_code=404)

@router.delete("/{id}")
def delete_producto(id: int, session: Session = Depends(get_db)):
    deleted = service_delete_producto(session, id)
    if deleted:
        return {"message": "Producto eliminado"}
    else:
        return JSONResponse(content={"error": "Producto no encontrado"}, status_code=404)

@router.get("/paginado")
def productos_paginado(skip: int = 0, limit: int = 15, session: Session = Depends(get_db)):
    return get_all_productos_paginated(session, skip=skip, limit=limit)