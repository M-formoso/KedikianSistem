from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from typing import List
from app.db.dependencies import get_db
from app.schemas.schemas import MovimientoInventarioSchema
from sqlalchemy.orm import Session
from app.services.movimiento_inventario_service import (
    get_movimientos_inventario as service_get_movimientos_inventario,
    get_movimiento_inventario as service_get_movimiento_inventario,
    create_movimiento_inventario as service_create_movimiento_inventario,
    update_movimiento_inventario as service_update_movimiento_inventario,
    delete_movimiento_inventario as service_delete_movimiento_inventario,
    get_all_movimientos_inventario_paginated
)
from app.security.auth import get_current_user

router = APIRouter(prefix="/movimientos-inventario", tags=["Movimientos de Inventario"], dependencies=[Depends(get_current_user)])

# Endpoints Movimientos de Inventario
@router.get("/", response_model=List[MovimientoInventarioSchema])
def get_movimientos_inventario(session: Session = Depends(get_db)):
    return service_get_movimientos_inventario(session)

@router.get("/{id}", response_model=MovimientoInventarioSchema)
def get_movimiento_inventario(id: int, session: Session = Depends(get_db)):
    movimiento = service_get_movimiento_inventario(session, id)
    if movimiento:
        return movimiento
    else:
        return JSONResponse(content={"error": "Movimiento de inventario no encontrado"}, status_code=404)

@router.post("/", response_model=MovimientoInventarioSchema, status_code=201)
def create_movimiento_inventario(movimiento_inventario: MovimientoInventarioSchema, session: Session = Depends(get_db)):
    return service_create_movimiento_inventario(session, movimiento_inventario)

@router.put("/{id}", response_model=MovimientoInventarioSchema)
def update_movimiento_inventario(id: int, movimiento_inventario: MovimientoInventarioSchema, session: Session = Depends(get_db)):
    updated = service_update_movimiento_inventario(session, id, movimiento_inventario)
    if updated:
        return updated
    else:
        return JSONResponse(content={"error": "Movimiento de inventario no encontrado"}, status_code=404)

@router.delete("/{id}")
def delete_movimiento_inventario(id: int, session: Session = Depends(get_db)):
    deleted = service_delete_movimiento_inventario(session, id)
    if deleted:
        return {"message": "Movimiento de inventario eliminado"}
    else:
        return JSONResponse(content={"error": "Movimiento de inventario no encontrado"}, status_code=404)

@router.get("/paginado")
def movimientos_inventario_paginado(skip: int = 0, limit: int = 15, session: Session = Depends(get_db)):
    return get_all_movimientos_inventario_paginated(session, skip=skip, limit=limit)