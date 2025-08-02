from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class Arrendamiento(Base):
    __tablename__ = "arrendamiento"
    id = Column(Integer, primary_key=True, autoincrement=True)
    proyecto_id = Column(Integer, ForeignKey("proyecto.id"))
    maquina_id = Column(Integer, ForeignKey("maquina.id"))
    horas_uso = Column(Integer, default=0)
    fecha_asignacion = Column(DateTime)

    # Relaciones
    proyecto = relationship("Proyecto", back_populates="arrendamientos")
    maquina = relationship("Maquina", back_populates="arrendamientos")

    # Timestamps
    created = Column(DateTime(timezone=True), server_default=func.now())
    updated = Column(DateTime(timezone=True), onupdate=func.now())