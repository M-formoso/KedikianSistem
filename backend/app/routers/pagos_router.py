from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.db.dependencies import get_db
from app.schemas.schemas import PagoSchema, PagoCreate
from sqlalchemy.orm import Session
from app.services.pago_service import (
    get_pagos as service_get_pagos,
    get_pago as service_get_pago,
    create_pago as service_create_pago,
    update_pago as service_update_pago,
    delete_pago as service_delete_pago,
    get_all_pagos_paginated
)
from app.security.auth import get_current_user

router = APIRouter(prefix="/pagos", tags=["Pagos"], dependencies=[Depends(get_current_user)])

# Endpoints Pagos
@router.get("/", response_model=List[PagoSchema])
def get_pagos(session: Session = Depends(get_db)):
    return service_get_pagos(session)

@router.get("/{id}", response_model=PagoSchema)
def get_pago(id: int, session: Session = Depends(get_db)):
    pago = service_get_pago(session, id)
    if pago:
        return pago
    else:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

@router.post("/", response_model=PagoSchema, status_code=201)
def create_pago(pago: PagoCreate, session: Session = Depends(get_db)):
    try:
        return service_create_pago(session, pago)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear pago: {str(e)}")

@router.put("/{id}", response_model=PagoSchema)
def update_pago(id: int, pago: PagoSchema, session: Session = Depends(get_db)):
    try:
        updated = service_update_pago(session, id, pago)
        if updated:
            return updated
        else:
            raise HTTPException(status_code=404, detail="Pago no encontrado")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar pago: {str(e)}")

@router.delete("/{id}")
def delete_pago(id: int, session: Session = Depends(get_db)):
    try:
        deleted = service_delete_pago(session, id)
        if deleted:
            return {"message": "Pago eliminado"}
        else:
            raise HTTPException(status_code=404, detail="Pago no encontrado")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar pago: {str(e)}")

@router.get("/paginado")
def pagos_paginado(skip: int = 0, limit: int = 15, session: Session = Depends(get_db)):
    return get_all_pagos_paginated(session, skip=skip, limit=limit)