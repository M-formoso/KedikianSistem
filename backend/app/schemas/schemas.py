from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List, Optional, Union

# Usuario
class UsuarioBase(BaseModel):
    nombre: str
    email: EmailStr
    estado: bool
    roles: List[str]

class UsuarioCreate(UsuarioBase):
    hash_contrasena: str
    fecha_creacion: Optional[datetime] = None

class UsuarioSchema(UsuarioBase):
    id: Optional[int] = None
    hash_contrasena: str
    fecha_creacion: datetime

    class Config:
        from_attributes = True

class UsuarioOut(UsuarioBase):
    id: Optional[int] = None
    hash_contrasena: Union[str, None] = ''
    fecha_creacion: datetime

    class Config:
        from_attributes = True

# Arrendamiento
class ArrendamientoBase(BaseModel):
    proyecto_id: Optional[int] = None
    maquina_id: Optional[int] = None
    horas_uso: int
    fecha_asignacion: datetime

class ArrendamientoCreate(ArrendamientoBase):
    pass

class ArrendamientoSchema(ArrendamientoBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

class ArrendamientoOut(ArrendamientoBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

# Contrato
class ContratoBase(BaseModel):
    proyecto_id: Optional[int] = None
    detalle: str
    cliente: str
    importe_total: int
    fecha_inicio: datetime
    fecha_terminacion: datetime

class ContratoCreate(ContratoBase):
    pass

class ContratoSchema(ContratoBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

class ContratoOut(ContratoBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

# Gasto
class GastoBase(BaseModel):
    usuario_id: Optional[int] = None
    maquina_id: Optional[int] = None
    tipo: str
    importe_total: int
    fecha: datetime
    descripcion: str
    imagen: Optional[str] = None

class GastoCreate(GastoBase):
    pass

class GastoSchema(GastoBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

class GastoOut(GastoBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

# Maquina
class MaquinaBase(BaseModel):
    nombre: str
    estado: bool
    horas_uso: int

class MaquinaCreate(MaquinaBase):
    pass

class MaquinaSchema(BaseModel):
    id: Optional[int] = None
    nombre: str
    estado: bool = True
    horas_uso: int = 0
    proyecto_id: Optional[int] = None

    class Config:
        orm_mode = True

class MaquinaOut(BaseModel):
    id: Optional[int] = None
    nombre: str
    estado: bool = True
    horas_uso: int = 0
    proyecto_id: Optional[int] = None

    class Config:
        orm_mode = True

# MovimientoInventario
class MovimientoInventarioBase(BaseModel):
    producto_id: Optional[int] = None
    usuario_id: Optional[int] = None
    cantidad: int
    fecha: datetime
    tipo_transaccion: str  # "entrada" o "salida"

class MovimientoInventarioCreate(MovimientoInventarioBase):
    pass

class MovimientoInventarioSchema(MovimientoInventarioBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

class MovimientoInventarioOut(MovimientoInventarioBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

# Pago
class PagoBase(BaseModel):
    proyecto_id: Optional[int] = None
    producto_id: Optional[int] = None
    importe_total: int
    fecha: datetime
    descripcion: str

class PagoCreate(PagoBase):
    pass

class PagoSchema(PagoBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

class PagoOut(PagoBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

# Producto
class ProductoBase(BaseModel):
    nombre: str
    codigo_producto: str
    inventario: int
    url_imagen: Optional[str] = None

class ProductoCreate(ProductoBase):
    pass

class ProductoSchema(ProductoBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

class ProductoOut(ProductoBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

# Proyecto
class ProyectoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    estado: bool
    fecha_creacion: Optional[datetime] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    progreso: Optional[int] = 0
    gerente: Optional[str] = None
    contrato_id: Optional[int] = None
    ubicacion: str

class ProyectoCreate(ProyectoBase):
    pass

class ProyectoSchema(ProyectoBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

class ProyectoOut(ProyectoBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

# ReporteLaboral
class ReporteLaboralBase(BaseModel):
    maquina_id: Optional[int] = None
    usuario_id: Optional[int] = None
    fecha_asignacion: datetime
    horas_turno: datetime

class ReporteLaboralCreate(ReporteLaboralBase):
    pass

class ReporteLaboralSchema(ReporteLaboralBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

class ReporteLaboralOut(ReporteLaboralBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True


class ConfiguracionTarifasBase(BaseModel):
    hora_normal: float
    hora_feriado: float
    multiplicador_extra: float

class ConfiguracionTarifasCreate(ConfiguracionTarifasBase):
    pass

class ConfiguracionTarifasResponse(ConfiguracionTarifasBase):
    id: int
    activo: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class OperarioExcel(BaseModel):
    nombre: str
    dni: str
    horas_normales: float
    horas_feriado: float
    horas_extras: float
    precio_hora_normal: float
    precio_hora_feriado: float
    precio_hora_extra: float
    total_calculado: float

class RegistroHorasBase(BaseModel):
    operario_id: int
    periodo: str
    horas_normales: float = 0
    horas_feriado: float = 0
    horas_extras: float = 0

class RegistroHorasCreate(RegistroHorasBase):
    pass

class RegistroHorasUpdate(BaseModel):
    horas_normales: Optional[float] = None
    horas_feriado: Optional[float] = None
    horas_extras: Optional[float] = None

class RegistroHorasResponse(RegistroHorasBase):
    id: int
    total_calculado: float
    created_at: datetime
    updated_at: datetime
    operario: UsuarioSchema
    
    class Config:
        from_attributes = True

class ResumenExcelRequest(BaseModel):
    periodo: str
    operarios: List[OperarioExcel]

class ResumenExcelResponse(BaseModel):
    periodo: str
    total_horas_normales: float
    total_horas_feriado: float
    total_horas_extras: float
    basico_remunerativo: float
    asistencia_perfecta_remunerativo: float
    feriado_remunerativo: float
    extras_remunerativo: float
    total_remunerativo: float

# Excel Import/Export
class OperarioExcel(BaseModel):
    nombre: str
    dni: str
    horasNormales: float
    horasFeriado: float
    horasExtras: float
    precioHoraNormal: float
    precioHoraFeriado: float
    precioHoraExtra: float
    totalCalculado: float

class ConfiguracionTarifasExcel(BaseModel):
    horaNormal: float
    horaFeriado: float
    horaExtra: float
    multiplicadorExtra: float

class ExcelImportRequest(BaseModel):
    operarios: List[OperarioExcel]
    configuracion: ConfiguracionTarifasExcel

class ExcelImportResponse(BaseModel):
    message: str
    resumen: Optional[dict] = None

class OperarioCreateFromExcel(BaseModel):
    nombre: str
    dni: str
    email: Optional[str] = None
    estado: bool = True
    roles: List[str] = ["operario"]
    hash_contrasena: str = "default_password_hash"  # Contraseña por defecto

class OperarioCreateFromExcelFlexible(BaseModel):
    nombre: Optional[str] = None
    dni: Optional[str] = None
    email: Optional[str] = None
    estado: Optional[bool] = True
    roles: Optional[List[str]] = ["operario"]
    hash_contrasena: Optional[str] = "default_password_hash"
    
    # Campos alternativos que el frontend podría enviar
    horasNormales: Optional[float] = None
    horasFeriado: Optional[float] = None
    horasExtras: Optional[float] = None
    precioHoraNormal: Optional[float] = None
    precioHoraFeriado: Optional[float] = None
    precioHoraExtra: Optional[float] = None
    totalCalculado: Optional[float] = None

# EntregaArido
class EntregaAridoBase(BaseModel):
    proyecto_id: int
    usuario_id: int
    tipo_arido: str
    cantidad: int
    fecha_entrega: datetime

class EntregaAridoCreate(EntregaAridoBase):
    pass

class EntregaAridoSchema(EntregaAridoBase):
    id: Optional[int] = None
    created: Optional[datetime] = None
    updated: Optional[datetime] = None

    class Config:
        from_attributes = True

class EntregaAridoOut(EntregaAridoBase):
    id: Optional[int] = None
    created: Optional[datetime] = None
    updated: Optional[datetime] = None

    class Config:
        from_attributes = True

class ResumenSueldoCreate(BaseModel):
    nombre: str
    dni: str
    periodo: str
    total_horas_normales: float = 0
    total_horas_feriado: float = 0
    total_horas_extras: float = 0
    basico_remunerativo: float = 0
    asistencia_perfecta_remunerativo: float = 0
    feriado_remunerativo: float = 0
    extras_remunerativo: float = 0
    total_remunerativo: float = 0
    observaciones: Optional[str] = None

class ResumenSueldoResponse(ResumenSueldoCreate):
    id: int
    created: Optional[datetime] = None
    updated: Optional[datetime] = None

    class Config:
        from_attributes = True

