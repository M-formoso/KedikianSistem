from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
from sqlalchemy.sql import func

class Maquina(Base):
    __tablename__ = "maquina"
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50))
    estado = Column(Boolean, default=True)
    horas_uso = Column(Integer, default=0)
    proyecto_id = Column(Integer, ForeignKey("proyecto.id"), nullable=True)

    # Relaciones
    reportes_laborales = relationship("ReporteLaboral", back_populates="maquina")
    gastos = relationship("Gasto", back_populates="maquina")
    arrendamientos = relationship("Arrendamiento", back_populates="maquina")
    
    # Timestamps
    created = Column(DateTime(timezone=True), server_default=func.now())
    updated = Column(DateTime(timezone=True), onupdate=func.now())