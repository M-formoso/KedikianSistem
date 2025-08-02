from sqlalchemy import Column, Integer, DateTime, Float, Boolean
from sqlalchemy.sql import func
from app.db.database import Base

class ConfiguracionTarifas(Base):
    __tablename__ = "configuracion_tarifas"
    
    id = Column(Integer, primary_key=True, index=True)
    hora_normal = Column(Float, nullable=False, default=6500)
    hora_feriado = Column(Float, nullable=False, default=13000)
    multiplicador_extra = Column(Float, nullable=False, default=1.5)
    activo = Column(Boolean, default=True)

    # Timestamps
    created = Column(DateTime(timezone=True), server_default=func.now())
    updated = Column(DateTime(timezone=True), onupdate=func.now())