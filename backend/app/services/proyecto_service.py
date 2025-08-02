from app.db.models import Proyecto, Contrato
from app.schemas.schemas import ProyectoSchema, ProyectoCreate, ProyectoOut
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional
from datetime import datetime

# Servicio para operaciones de Proyecto

def get_proyectos(db: Session) -> List[ProyectoOut]:
    proyectos = db.query(Proyecto).all()
    return [ProyectoOut(
        id=p.id,
        nombre=p.nombre,
        descripcion=p.descripcion,
        estado=p.estado,
        fecha_creacion=p.fecha_creacion,
        fecha_inicio=p.fecha_inicio,
        fecha_fin=p.fecha_fin,
        progreso=p.progreso,
        gerente=p.gerente,
        contrato_id=p.contrato_id,
        ubicacion=p.ubicacion
    ) for p in proyectos]

def get_proyecto(db: Session, proyecto_id: int) -> Optional[ProyectoOut]:
    p = db.query(Proyecto).filter(Proyecto.id == proyecto_id).first()
    if p:
        return ProyectoOut(
            id=p.id,
            nombre=p.nombre,
            descripcion=p.descripcion,
            estado=p.estado,
            fecha_creacion=p.fecha_creacion,
            fecha_inicio=p.fecha_inicio,
            fecha_fin=p.fecha_fin,
            progreso=p.progreso,
            gerente=p.gerente,
            contrato_id=p.contrato_id,
            ubicacion=p.ubicacion
        )
    return None

def create_proyecto(db: Session, proyecto: ProyectoCreate) -> ProyectoOut:
    # Asignar fecha_creacion automáticamente si no se proporciona
    proyecto_data = proyecto.model_dump()
    if proyecto_data.get('fecha_creacion') is None:
        proyecto_data['fecha_creacion'] = datetime.now()
    
    # Validar que el contrato_id existe, si no existe, establecerlo como None
    if proyecto_data.get('contrato_id') is not None:
        contrato = db.query(Contrato).filter(Contrato.id == proyecto_data['contrato_id']).first()
        if contrato is None:
            proyecto_data['contrato_id'] = None
    
    nuevo_proyecto = Proyecto(**proyecto_data)
    db.add(nuevo_proyecto)
    db.commit()
    db.refresh(nuevo_proyecto)
    return ProyectoOut(
        id=nuevo_proyecto.id,
        nombre=nuevo_proyecto.nombre,
        descripcion=nuevo_proyecto.descripcion,
        estado=nuevo_proyecto.estado,
        fecha_creacion=nuevo_proyecto.fecha_creacion,
        fecha_inicio=nuevo_proyecto.fecha_inicio,
        fecha_fin=nuevo_proyecto.fecha_fin,
        progreso=nuevo_proyecto.progreso,
        gerente=nuevo_proyecto.gerente,
        contrato_id=nuevo_proyecto.contrato_id,
        ubicacion=nuevo_proyecto.ubicacion
    )

def update_proyecto(db: Session, proyecto_id: int, proyecto: ProyectoSchema) -> Optional[ProyectoOut]:
    try:
        existing_proyecto = db.query(Proyecto).filter(Proyecto.id == proyecto_id).first()
        if existing_proyecto:
            # Validar que el contrato_id existe, si no existe, establecerlo como None
            proyecto_data = proyecto.model_dump()
            if proyecto_data.get('contrato_id') is not None:
                contrato = db.query(Contrato).filter(Contrato.id == proyecto_data['contrato_id']).first()
                if contrato is None:
                    proyecto_data['contrato_id'] = None
            
            # Asegurar que fecha_creacion tenga un valor
            if proyecto_data.get('fecha_creacion') is None:
                proyecto_data['fecha_creacion'] = existing_proyecto.fecha_creacion or datetime.now()
            
            # Filtrar campos None y el campo id para evitar problemas
            proyecto_data = {k: v for k, v in proyecto_data.items() if v is not None and k != 'id'}
            
            for field, value in proyecto_data.items():
                setattr(existing_proyecto, field, value)
            
            db.commit()
            db.refresh(existing_proyecto)
            return ProyectoOut(
                id=existing_proyecto.id,
                nombre=existing_proyecto.nombre,
                descripcion=existing_proyecto.descripcion,
                estado=existing_proyecto.estado,
                fecha_creacion=existing_proyecto.fecha_creacion,
                fecha_inicio=existing_proyecto.fecha_inicio,
                fecha_fin=existing_proyecto.fecha_fin,
                progreso=existing_proyecto.progreso,
                gerente=existing_proyecto.gerente,
                contrato_id=existing_proyecto.contrato_id,
                ubicacion=existing_proyecto.ubicacion
            )
        return None
    except SQLAlchemyError as e:
        db.rollback()
        raise Exception(f"Error al actualizar proyecto: {str(e)}")
    except Exception as e:
        db.rollback()
        raise Exception(f"Error inesperado al actualizar proyecto: {str(e)}")

def delete_proyecto(db: Session, proyecto_id: int) -> bool:
    proyecto = db.query(Proyecto).filter(Proyecto.id == proyecto_id).first()
    if proyecto:
        db.delete(proyecto)
        db.commit()
        return True
    return False

def get_maquinas_by_proyecto(db: Session, proyecto_id: int):
    from app.db.models.maquina import Maquina
    # Suponiendo que Maquina tiene proyecto_id y horas_uso
    maquinas = db.query(Maquina).filter(Maquina.proyecto_id == proyecto_id).all()
    # Aquí puedes ajustar si tienes una relación de asignación semanal
    return [
        {
            "nombre": m.nombre,
            "horas_semanales": m.horas_uso  # Cambia esto si tienes un campo específico
        }
        for m in maquinas
    ]

def get_aridos_by_proyecto(db: Session, proyecto_id: int):
    from app.db.models.entrega_arido import EntregaArido
    aridos = db.query(EntregaArido).filter(EntregaArido.proyecto_id == proyecto_id).all()
    return [
        {
            "tipo_arido": a.tipo_arido,
            "cantidad": a.cantidad,
            "fecha_entrega": a.fecha_entrega
        }
        for a in aridos
    ]

# Devuelve la cantidad de proyectos activos
def get_cantidad_proyectos_activos(db: Session) -> int:
    return db.query(Proyecto).filter(Proyecto.estado == True).count()

def get_all_proyectos_paginated(db: Session, skip: int = 0, limit: int = 15) -> List[ProyectoOut]:
    proyectos = db.query(Proyecto).offset(skip).limit(limit).all()
    return [ProyectoOut(
        id=p.id,
        nombre=p.nombre,
        descripcion=p.descripcion,
        estado=p.estado,
        fecha_creacion=p.fecha_creacion,
        fecha_inicio=p.fecha_inicio,
        fecha_fin=p.fecha_fin,
        progreso=p.progreso,
        gerente=p.gerente,
        contrato_id=p.contrato_id,
        ubicacion=p.ubicacion
    ) for p in proyectos]