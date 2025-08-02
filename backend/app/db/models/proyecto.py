from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
from sqlalchemy.sql import func

class Proyecto(Base):
    __tablename__ = "proyecto"
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(75))
    descripcion = Column(String(500), nullable=True)
    estado = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime)
    fecha_inicio = Column(DateTime, nullable=True)
    fecha_fin = Column(DateTime, nullable=True)
    progreso = Column(Integer, default=0)
    gerente = Column(String(100), nullable=True)
    contrato_id = Column(Integer, ForeignKey("contrato.id"), unique=True, nullable=True)
    ubicacion = Column(String(50))

    # Relacion 1 a 1 con contratos
    contrato = relationship(
        "Contrato",
        back_populates="proyecto"
    )
    arrendamientos = relationship("Arrendamiento", back_populates="proyecto")
    pagos = relationship("Pago", back_populates="proyecto")
    entrega_arido = relationship("EntregaArido", back_populates="proyecto")
    # Elimino la relación maquinas agregada recientemente
    # Timestamps
    created = Column(DateTime(timezone=True), server_default=func.now())
    updated = Column(DateTime(timezone=True), onupdate=func.now())