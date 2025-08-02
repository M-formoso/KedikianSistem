from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from typing import List
from app.db.dependencies import get_db
from app.schemas.schemas import UsuarioSchema, UsuarioOut, UsuarioCreate
from sqlalchemy.orm import Session
from app.services.usuario_service import (
    get_usuarios as service_get_usuarios,
    get_usuario as service_get_usuario,
    create_usuario as service_create_usuario,
    update_usuario as service_update_usuario,
    delete_usuario as service_delete_usuario,
    get_all_usuarios_paginated
)
from app.security.auth import get_current_user

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

# Endpoints Usuarios
@router.get("/", response_model=List[UsuarioSchema], dependencies=[Depends(get_current_user)])
def get_usuarios(session: Session = Depends(get_db)):
    return service_get_usuarios(session)

@router.get("/{id}", response_model=UsuarioSchema, dependencies=[Depends(get_current_user)])
def get_usuario(id: int, session: Session = Depends(get_db)):
    usuario = service_get_usuario(session, id)
    if usuario:
        return usuario
    else:
        return JSONResponse(content={"error": "Usuario no encontrado"}, status_code=404)

@router.post("/", response_model=UsuarioOut, status_code=201)
def create_usuario(usuario: UsuarioCreate, session: Session = Depends(get_db)):
    return service_create_usuario(session, usuario)

@router.put("/{id}", response_model=UsuarioSchema, dependencies=[Depends(get_current_user)])
def update_usuario(id: int, usuario: UsuarioSchema, session: Session = Depends(get_db)):
    updated = service_update_usuario(session, id, usuario)
    if updated:
        return updated
    else:
        return JSONResponse(content={"error": "Usuario no encontrado"}, status_code=404)

@router.delete("/{id}", dependencies=[Depends(get_current_user)])
def delete_usuario(id: int, session: Session = Depends(get_db)):
    deleted = service_delete_usuario(session, id)
    if deleted:
        return {"message": "Usuario eliminado"}
    else:
        return JSONResponse(content={"error": "Usuario no encontrado"}, status_code=404)

@router.get("/paginado")
def usuarios_paginado(skip: int = 0, limit: int = 15, session: Session = Depends(get_db)):
    return get_all_usuarios_paginated(session, skip=skip, limit=limit)