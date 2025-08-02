from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from typing import List
from app.db.dependencies import get_db
from app.schemas.schemas import MaquinaSchema
from sqlalchemy.orm import Session
from app.services.maquina_service import (
    get_maquinas as service_get_maquinas,
    get_maquina as service_get_maquina,
    create_maquina as service_create_maquina,
    update_maquina as service_update_maquina,
    delete_maquina as service_delete_maquina,
    get_all_maquinas_paginated
)
from app.security.auth import get_current_user

router = APIRouter(prefix="/maquinas", tags=["Maquinas"], dependencies=[Depends(get_current_user)])

# Endpoints Maquinas
@router.get("/", response_model=List[MaquinaSchema])
def get_maquinas(session: Session = Depends(get_db)):
    return service_get_maquinas(session)

@router.get("/{id}", response_model=MaquinaSchema)
def get_maquina(id: int, session: Session = Depends(get_db)):
    maquina = service_get_maquina(session, id)
    if maquina:
        return maquina
    else:
        return JSONResponse(content={"error": "Maquina no encontrada"}, status_code=404)

@router.post("/", response_model=MaquinaSchema, status_code=201)
def create_maquina(maquina: MaquinaSchema, session: Session = Depends(get_db)):
    return service_create_maquina(session, maquina)

@router.put("/{id}", response_model=MaquinaSchema)
def update_maquina(id: int, maquina: MaquinaSchema, session: Session = Depends(get_db)):
    updated = service_update_maquina(session, id, maquina)
    if updated:
        return updated
    else:
        return JSONResponse(content={"error": "Maquina no encontrada"}, status_code=404)

@router.delete("/{id}")
def delete_maquina(id: int, session: Session = Depends(get_db)):
    deleted = service_delete_maquina(session, id)
    if deleted:
        return {"message": "Maquina eliminada"}
    else:
        return JSONResponse(content={"error": "Maquina no encontrada"}, status_code=404)

@router.get("/paginado")
def maquinas_paginado(skip: int = 0, limit: int = 15, session: Session = Depends(get_db)):
    return get_all_maquinas_paginated(session, skip=skip, limit=limit)