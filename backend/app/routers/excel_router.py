from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
from io import BytesIO
from app.db.dependencies import get_db
import app.services.excel_service as excel_service
from app.schemas.schemas import (
    UsuarioOut,
    ConfiguracionTarifasResponse,
    ConfiguracionTarifasCreate,
    RegistroHorasCreate,
    RegistroHorasResponse,
    ResumenExcelRequest,
    ResumenExcelResponse,
    UsuarioCreate,
    OperarioCreateFromExcel,
    OperarioCreateFromExcelFlexible,
    ResumenSueldoCreate,
    ResumenSueldoResponse
)
from app.db.models import RegistroHoras, ResumenSueldo, Usuario
from app.services.usuario_service import create_usuario
from app.security.auth import get_current_user

router = APIRouter(prefix="/excel", tags=["Excel Management"], dependencies=[Depends(get_current_user)])

@router.get("/operarios", response_model=List[UsuarioOut])
async def get_operarios_activos(db: Session = Depends(get_db)):
    """Obtiene todos los operarios activos para el componente Excel"""
    try:
        operarios = excel_service.get_operarios_activos()
        return operarios
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener operarios: {str(e)}")

@router.get("/configuracion", response_model=ConfiguracionTarifasResponse)
async def get_configuracion_actual(db: Session = Depends(get_db)):
    """Obtiene la configuración actual de tarifas"""
    try:
        config = excel_service.get_configuracion_actual()
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener configuración: {str(e)}")

@router.put("/configuracion", response_model=ConfiguracionTarifasResponse)
async def actualizar_configuracion(
    nueva_config: ConfiguracionTarifasCreate,
    db: Session = Depends(get_db)
):
    """Actualiza la configuración de tarifas"""
    try:
        config = excel_service.actualizar_configuracion(nueva_config)
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar configuración: {str(e)}")

@router.post("/registro-horas", response_model=RegistroHorasResponse)
async def guardar_registro_horas(
    registro: RegistroHorasCreate,
    db: Session = Depends(get_db)
):
    """Guarda o actualiza el registro de horas de un operario"""
    try:
        registro_guardado = excel_service.guardar_registro_horas(registro)
        return registro_guardado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar registro: {str(e)}")

@router.get("/registro-horas/{periodo}", response_model=List[RegistroHorasResponse])
async def get_registros_por_periodo(
    periodo: str,
    db: Session = Depends(get_db)
):
    """Obtiene todos los registros de horas de un periodo específico"""
    try:
        registros = db.query(RegistroHoras).filter(
            RegistroHoras.periodo == periodo
        ).all()
        return registros
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener registros: {str(e)}")

@router.post("/generar-resumen", response_model=ResumenExcelResponse)
async def generar_resumen_excel(
    request: ResumenExcelRequest,
    db: Session = Depends(get_db)
):
    """Genera el resumen de sueldos para exportar a Excel"""
    try:
        resumen = excel_service.generar_resumen_excel(request.periodo, request.operarios)
        return resumen
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar resumen: {str(e)}")

@router.get("/export-excel/{periodo}")
async def export_excel(
    periodo: str,
    db: Session = Depends(get_db)
):
    """Exporta el resumen de sueldos a un archivo Excel"""
    try:
        # Obtener el resumen del periodo
        resumen = db.query(ResumenSueldo).filter(
            ResumenSueldo.periodo == periodo
        ).first()
        
        if not resumen:
            raise HTTPException(status_code=404, detail="No se encontró resumen para el periodo especificado")
        
        # Crear el DataFrame para Excel
        data = {
            'Concepto': ['Basico', 'Asistencia perfecta (20%)', 'Pago feriado', 'Horas extras', 'TOTAL'],
            'Unidades': [
                resumen.total_horas_normales,
                '20%',
                resumen.total_horas_feriado,
                resumen.total_horas_extras,
                ''
            ],
            'Valor': [
                f"$ {resumen.basico_remunerativo/resumen.total_horas_normales:.2f}" if resumen.total_horas_normales > 0 else "$ 0.00",
                f"$ {resumen.basico_remunerativo:.2f}",
                f"$ {resumen.feriado_remunerativo/resumen.total_horas_feriado:.2f}" if resumen.total_horas_feriado > 0 else "$ 0.00",
                f"$ {resumen.extras_remunerativo/resumen.total_horas_extras:.2f}" if resumen.total_horas_extras > 0 else "$ 0.00",
                'Total'
            ],
            'Remunerativo': [
                f"$ {resumen.basico_remunerativo:.2f}",
                f"$ {resumen.asistencia_perfecta_remunerativo:.2f}",
                f"$ {resumen.feriado_remunerativo:.2f}",
                f"$ {resumen.extras_remunerativo:.2f}",
                f"$ {resumen.total_remunerativo:.2f}"
            ],
            'Adelantos': ['', '', '', '', '']
        }
        
        df = pd.DataFrame(data)
        
        # Crear archivo Excel en memoria
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Resumen de Sueldos', index=False)
        
        output.seek(0)
        
        # Retornar archivo Excel
        return Response(
            output.getvalue(),
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                'Content-Disposition': f'attachment; filename=resumen_sueldos_{periodo}.xlsx'
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al exportar Excel: {str(e)}")

@router.post("/operarios", response_model=UsuarioOut)
async def crear_operario(operario: OperarioCreateFromExcelFlexible, db: Session = Depends(get_db)):
    """Crea un nuevo operario desde el módulo Excel"""
    try:
        # Validar que se proporcionen los campos mínimos requeridos
        if not operario.nombre:
            raise HTTPException(status_code=422, detail="El campo 'nombre' es obligatorio")
        if not operario.dni:
            raise HTTPException(status_code=422, detail="El campo 'dni' es obligatorio")
        
        # Convertir OperarioCreateFromExcelFlexible a UsuarioCreate
        usuario_data = UsuarioCreate(
            nombre=operario.nombre,
            email=operario.email or f"{operario.dni}@kedikian.com",  # Email por defecto basado en DNI
            estado=operario.estado,
            roles=operario.roles,
            hash_contrasena=operario.hash_contrasena
        )
        return create_usuario(db, usuario_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear operario: {str(e)}")

@router.post("/operarios/debug")
async def debug_operario_data(operario_data: dict):
    """Endpoint de debug para ver qué datos está enviando el frontend"""
    return {"received_data": operario_data, "message": "Datos recibidos correctamente"}

@router.post("/resumen-sueldo", response_model=ResumenSueldoResponse)
async def crear_resumen_sueldo(resumen: ResumenSueldoCreate, db: Session = Depends(get_db)):
    """Crea un nuevo resumen de sueldo en la base de datos"""
    try:
        nuevo_resumen = ResumenSueldo(**resumen.model_dump())
        db.add(nuevo_resumen)
        db.commit()
        db.refresh(nuevo_resumen)
        return nuevo_resumen
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar resumen de sueldo: {str(e)}")

@router.get("/resumen-sueldo", response_model=List[ResumenSueldoResponse])
async def listar_resumenes_sueldo(db: Session = Depends(get_db)):
    """Lista todos los resúmenes de sueldo guardados en la base de datos"""
    try:
        resumenes = db.query(ResumenSueldo).all()
        return resumenes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener resúmenes de sueldo: {str(e)}")

@router.put("/resumen-sueldo/{id}", response_model=ResumenSueldoResponse)
async def actualizar_resumen_sueldo(id: int, resumen: ResumenSueldoCreate, db: Session = Depends(get_db)):
    """Actualiza un resumen de sueldo por id"""
    try:
        resumen_db = db.query(ResumenSueldo).filter(ResumenSueldo.id == id).first()
        if not resumen_db:
            raise HTTPException(status_code=404, detail="Resumen de sueldo no encontrado")
        for field, value in resumen.model_dump().items():
            setattr(resumen_db, field, value)
        db.commit()
        db.refresh(resumen_db)
        return resumen_db
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar resumen de sueldo: {str(e)}")

@router.delete("/resumen-sueldo/{id}")
async def eliminar_resumen_sueldo(id: int, db: Session = Depends(get_db)):
    """Elimina un resumen de sueldo por id"""
    try:
        resumen = db.query(ResumenSueldo).filter(ResumenSueldo.id == id).first()
        if not resumen:
            raise HTTPException(status_code=404, detail="Resumen de sueldo no encontrado")
        db.delete(resumen)
        db.commit()
        return {"message": "Resumen de sueldo eliminado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar resumen de sueldo: {str(e)}")
