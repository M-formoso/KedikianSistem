from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.dependencies import get_db
from app.schemas.schemas import EntregaAridoCreate, EntregaAridoOut
from app.services.entrega_arido_service import (
    create_entrega_arido,
    get_entrega_arido,
    get_all_entregas_arido,
    update_entrega_arido,
    delete_entrega_arido,
)

router = APIRouter(prefix="/aridos", tags=["Áridos"])

@router.get("/tipos")
async def get_tipos_aridos():
    """Obtiene los tipos de áridos disponibles"""
    tipos = [
        {"id": 1, "nombre": "Arena Fina", "tipo": "árido", "unidadMedida": "m3"},
        {"id": 2, "nombre": "Granza", "tipo": "árido", "unidadMedida": "m3"},
        {"id": 3, "nombre": "Arena Comun", "tipo": "árido", "unidadMedida": "m3"}
    ]
    return tipos

@router.get("/registros", response_model=List[EntregaAridoOut])
async def get_registros_aridos(db: Session = Depends(get_db)):
    """Obtiene todos los registros de entrega de áridos"""
    try:
        registros = get_all_entregas_arido(db)
        return registros
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener registros: {str(e)}")

@router.post("/registros", response_model=EntregaAridoOut)
async def crear_registro_arido(
    registro: EntregaAridoCreate,
    db: Session = Depends(get_db)
):
    """Crea un nuevo registro de entrega de áridos"""
    try:
        return create_entrega_arido(db, registro)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear registro: {str(e)}")

@router.get("/registros/{id}", response_model=EntregaAridoOut)
async def get_registro_arido(id: int, db: Session = Depends(get_db)):
    """Obtiene un registro específico de entrega de áridos"""
    try:
        registro = get_entrega_arido(db, id)
        if not registro:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        return registro
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener registro: {str(e)}")

@router.put("/registros/{id}", response_model=EntregaAridoOut)
async def actualizar_registro_arido(
    id: int,
    registro: EntregaAridoCreate,
    db: Session = Depends(get_db)
):
    """Actualiza un registro de entrega de áridos"""
    try:
        registro_actualizado = update_entrega_arido(db, id, registro)
        if not registro_actualizado:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        return registro_actualizado
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar registro: {str(e)}")

@router.delete("/registros/{id}")
async def eliminar_registro_arido(id: int, db: Session = Depends(get_db)):
    """Elimina un registro de entrega de áridos"""
    try:
        eliminado = delete_entrega_arido(db, id)
        if not eliminado:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        return {"message": "Registro eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar registro: {str(e)}") 