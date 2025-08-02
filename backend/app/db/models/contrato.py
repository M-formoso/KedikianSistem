from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class Contrato(Base):
    __tablename__ = "contrato"
    id = Column(Integer, primary_key=True, autoincrement=True)
    detalle = Column(String(350))
    cliente = Column(String(45))
    importe_total = Column(Integer)
    fecha_inicio = Column(DateTime)
    fecha_terminacion = Column(DateTime)

    # Relación 1 a 1 con Proyecto
    proyecto = relationship(
        "Proyecto",
        back_populates="contrato",
        uselist=False,
        foreign_keys="[Proyecto.contrato_id]"
    )
    # Timestamps
    created = Column(DateTime(timezone=True), server_default=func.now())
    updated = Column(DateTime(timezone=True), onupdate=func.now())