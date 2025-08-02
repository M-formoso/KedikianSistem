from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from app.db.database import Base

class ResumenSueldo(Base):
    __tablename__ = "resumen_sueldo"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    dni = Column(String(20), nullable=False)
    periodo = Column(String(20), nullable=False)
    total_horas_normales = Column(Float, default=0)
    total_horas_feriado = Column(Float, default=0)
    total_horas_extras = Column(Float, default=0)
    basico_remunerativo = Column(Float, default=0)
    asistencia_perfecta_remunerativo = Column(Float, default=0)
    feriado_remunerativo = Column(Float, default=0)
    extras_remunerativo = Column(Float, default=0)
    total_remunerativo = Column(Float, default=0)
    observaciones = Column(Text)
    

    # Timestamps
    created = Column(DateTime(timezone=True), server_default=func.now())
    updated = Column(DateTime(timezone=True), onupdate=func.now())