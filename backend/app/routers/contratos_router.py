from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from typing import List
from app.db.dependencies import get_db
from app.schemas.schemas import ContratoSchema
from sqlalchemy.orm import Session
from app.services.contrato_service import (
    get_contratos as service_get_contratos,
    get_contrato as service_get_contrato,
    create_contrato as service_create_contrato,
    update_contrato as service_update_contrato,
    delete_contrato as service_delete_contrato,
    get_all_contratos_paginated
)
from app.security.auth import get_current_user

router = APIRouter(prefix="/contratos", tags=["Contratos"], dependencies=[Depends(get_current_user)])

# Endpoints Contratos
@router.get("/", response_model=List[ContratoSchema])
def get_contratos(session: Session = Depends(get_db)):
    return service_get_contratos(session)

@router.get("/{id}", response_model=ContratoSchema)
def get_contrato(id: int, session: Session = Depends(get_db)):
    contrato = service_get_contrato(session, id)
    if contrato:
        return contrato
    else:
        return JSONResponse(content={"error": "Contrato no encontrado"}, status_code=404)

@router.post("/", response_model=ContratoSchema, status_code=201)
def create_contrato(contrato: ContratoSchema, session: Session = Depends(get_db)):
    return service_create_contrato(session, contrato)

@router.put("/{id}", response_model=ContratoSchema)
def update_contrato(id: int, contrato: ContratoSchema, session: Session = Depends(get_db)):
    updated = service_update_contrato(session, id, contrato)
    if updated:
        return updated
    else:
        return JSONResponse(content={"error": "Contrato no encontrado"}, status_code=404)

@router.delete("/{id}")
def delete_contrato(id: int, session: Session = Depends(get_db)):
    deleted = service_delete_contrato(session, id)
    if deleted:
        return {"message": "Contrato eliminado"}
    else:
        return JSONResponse(content={"error": "Contrato no encontrado"}, status_code=404)

@router.get("/paginado")
def contratos_paginado(skip: int = 0, limit: int = 15, session: Session = Depends(get_db)):
    return get_all_contratos_paginated(session, skip=skip, limit=limit)