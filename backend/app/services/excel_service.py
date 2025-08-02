from datetime import datetime
from typing import List
from sqlalchemy.orm import Session
from app.db.models import Usuario, ConfiguracionTarifas, RegistroHoras, ResumenSueldo
from app.schemas.schemas import ConfiguracionTarifasCreate, RegistroHorasCreate, OperarioExcel, ResumenExcelResponse

def get_operarios_activos(db: Session) -> List[OperarioExcel]:
    """Obtiene todos los operarios activos"""
    operarios = db.query(Usuario).filter(
        Usuario.estado == True,
        Usuario.roles.contains('operario')
    ).all()
    return [OperarioExcel.model_validate(op) for op in operarios]


def get_configuracion_actual(db: Session) -> ConfiguracionTarifasCreate:
    """Obtiene la configuración de tarifas actual"""
    config = db.query(ConfiguracionTarifas).filter(
        ConfiguracionTarifas.activo == True
    ).first()
    if not config:
        config = ConfiguracionTarifas(
            hora_normal=6500,
            hora_feriado=13000,
            multiplicador_extra=1.5
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return ConfiguracionTarifasCreate.model_validate(config)


def actualizar_configuracion(db: Session, nueva_config: ConfiguracionTarifasCreate) -> ConfiguracionTarifasCreate:
    """Actualiza la configuración de tarifas"""
    db.query(ConfiguracionTarifas).filter(
        ConfiguracionTarifas.activo == True
    ).update({"activo": False})
    config = ConfiguracionTarifas(**nueva_config.model_dump())
    db.add(config)
    db.commit()
    db.refresh(config)
    return ConfiguracionTarifasCreate.model_validate(config)


def guardar_registro_horas(db: Session, registro_data: RegistroHorasCreate) -> RegistroHorasCreate:
    """Guarda o actualiza el registro de horas de un operario"""
    registro_existente = db.query(RegistroHoras).filter(
        RegistroHoras.operario_id == registro_data.operario_id,
        RegistroHoras.periodo == registro_data.periodo
    ).first()
    config = get_configuracion_actual(db)
    hora_extra = config.hora_normal * config.multiplicador_extra
    total_calculado = (
        registro_data.horas_normales * config.hora_normal +
        registro_data.horas_feriado * config.hora_feriado +
        registro_data.horas_extras * hora_extra
    )
    if registro_existente:
        for key, value in registro_data.model_dump().items():
            setattr(registro_existente, key, value)
        registro_existente.total_calculado = total_calculado
        registro_existente.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(registro_existente)
        return RegistroHorasCreate.model_validate(registro_existente)
    else:
        nuevo_registro = RegistroHoras(
            **registro_data.model_dump(),
            total_calculado=total_calculado
        )
        db.add(nuevo_registro)
        db.commit()
        db.refresh(nuevo_registro)
        return RegistroHorasCreate.model_validate(nuevo_registro)


def generar_resumen_excel(db: Session, periodo: str, operarios_data: List[OperarioExcel]) -> ResumenExcelResponse:
    """Genera el resumen para Excel y lo guarda en la base de datos"""
    config = get_configuracion_actual(db)
    total_horas_normales = sum(op.horas_normales for op in operarios_data)
    total_horas_feriado = sum(op.horas_feriado for op in operarios_data)
    total_horas_extras = sum(op.horas_extras for op in operarios_data)
    basico_remunerativo = total_horas_normales * config.hora_normal
    asistencia_perfecta_remunerativo = basico_remunerativo * 0.20
    feriado_remunerativo = total_horas_feriado * config.hora_feriado
    extras_remunerativo = total_horas_extras * (config.hora_normal * config.multiplicador_extra)
    total_remunerativo = (
        basico_remunerativo + 
        asistencia_perfecta_remunerativo + 
        feriado_remunerativo + 
        extras_remunerativo
    )
    resumen_existente = db.query(ResumenSueldo).filter(
        ResumenSueldo.periodo == periodo
    ).first()
    if resumen_existente:
        resumen_existente.total_horas_normales = total_horas_normales
        resumen_existente.total_horas_feriado = total_horas_feriado
        resumen_existente.total_horas_extras = total_horas_extras
        resumen_existente.basico_remunerativo = basico_remunerativo
        resumen_existente.asistencia_perfecta_remunerativo = asistencia_perfecta_remunerativo
        resumen_existente.feriado_remunerativo = feriado_remunerativo
        resumen_existente.extras_remunerativo = extras_remunerativo
        resumen_existente.total_remunerativo = total_remunerativo
        resumen = resumen_existente
    else:
        resumen = ResumenSueldo(
            periodo=periodo,
            total_horas_normales=total_horas_normales,
            total_horas_feriado=total_horas_feriado,
            total_horas_extras=total_horas_extras,
            basico_remunerativo=basico_remunerativo,
            asistencia_perfecta_remunerativo=asistencia_perfecta_remunerativo,
            feriado_remunerativo=feriado_remunerativo,
            extras_remunerativo=extras_remunerativo,
            total_remunerativo=total_remunerativo
        )
        db.add(resumen)
    db.commit()
    return ResumenExcelResponse.model_validate(resumen)