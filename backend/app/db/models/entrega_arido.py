from sqlalchemy import Column, Integer, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class EntregaArido(Base):
    __tablename__ = "entrega_arido"
    id = Column(Integer, primary_key=True, autoincrement=True)
    proyecto_id = Column(Integer, ForeignKey("proyecto.id"))
    usuario_id = Column(Integer, ForeignKey("usuario.id"))
    tipo_arido = Column(String)
    cantidad = Column(Integer)
    fecha_entrega = Column(DateTime)

    # Relaciones
    proyecto = relationship("Proyecto", back_populates="entrega_arido")
    usuario = relationship("Usuario", back_populates="entrega_arido")

    # Timestamps
    created = Column(DateTime(timezone=True), server_default=func.now())
    updated = Column(DateTime(timezone=True), onupdate=func.now())