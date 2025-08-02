from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List
from app.db.dependencies import get_db
from app.schemas.schemas import GastoSchema, GastoCreate
from sqlalchemy.orm import Session
from app.services.gasto_service import (
    get_gastos as service_get_gastos,
    get_gasto as service_get_gasto,
    create_gasto as service_create_gasto,
    update_gasto as service_update_gasto,
    delete_gasto as service_delete_gasto,
    get_total_combustible_mes_actual,
    get_all_gastos_paginated
)
from app.security.auth import get_current_user

router = APIRouter(prefix="/gastos", tags=["Gastos"], dependencies=[Depends(get_current_user)])

# Endpoints Gastos

@router.get("/", response_model=List[GastoSchema])
def get_gastos(session: Session = Depends(get_db)):
    return service_get_gastos(session)

@router.get("/{id}", response_model=GastoSchema)
def get_gasto(id: int, session: Session = Depends(get_db)):
    gasto = service_get_gasto(session, id)
    if gasto:
        return gasto
    else:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

@router.post("/", response_model=GastoSchema, status_code=201)
def create_gasto(
    usuario_id: int = Form(...),
    maquina_id: int = Form(...),
    tipo: str = Form(...),
    importe_total: int = Form(...),
    fecha: str = Form(...),
    descripcion: str = Form(...),
    imagen: UploadFile = File(None),
    session: Session = Depends(get_db)
):
    try:
        return service_create_gasto(
            session,
            usuario_id,
            maquina_id,
            tipo,
            importe_total,
            fecha,
            descripcion,
            imagen
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear gasto: {str(e)}")

@router.put("/{id}", response_model=GastoSchema)
def update_gasto(
    id: int,
    usuario_id: int = Form(...),
    maquina_id: int = Form(...),
    tipo: str = Form(...),
    importe_total: int = Form(...),
    fecha: str = Form(...),
    descripcion: str = Form(...),
    imagen: UploadFile = File(None),
    session: Session = Depends(get_db)
):
    try:
        return service_update_gasto(
            session,
            id,
            usuario_id,
            maquina_id,
            tipo,
            importe_total,
            fecha,
            descripcion,
            imagen
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar gasto: {str(e)}")

@router.delete("/{id}")
def delete_gasto(id: int, session: Session = Depends(get_db)):
    try:
        deleted = service_delete_gasto(session, id)
        if deleted:
            return {"message": "Gasto eliminado"}
        else:
            raise HTTPException(status_code=404, detail="Gasto no encontrado")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar gasto: {str(e)}")

# Endpoint para total de gasto en combustible en el mes actual
@router.get("/combustible-mes-actual")
def total_combustible_mes_actual(session: Session = Depends(get_db)):
    total = get_total_combustible_mes_actual(session)
    return {"total_combustible_mes_actual": total}

@router.get("/paginado")
def gastos_paginado(skip: int = 0, limit: int = 15, session: Session = Depends(get_db)):
    return get_all_gastos_paginated(session, skip=skip, limit=limit)