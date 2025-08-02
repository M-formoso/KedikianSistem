from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class RegistroHoras(Base):
    __tablename__ = "registro_horas"
    
    id = Column(Integer, primary_key=True, index=True)
    operario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    periodo = Column(String(20), nullable=False)  # formato: "2025-05"
    horas_normales = Column(Float, default=0)
    horas_feriado = Column(Float, default=0)
    horas_extras = Column(Float, default=0)
    total_calculado = Column(Float, default=0)
    
    # Relaciones
    operario = relationship("Usuario", back_populates="registros_horas")

    # Timestamps
    created = Column(DateTime(timezone=True), server_default=func.now())
    updated = Column(DateTime(timezone=True), onupdate=func.now())