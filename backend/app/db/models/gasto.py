from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class Gasto(Base):
    __tablename__ = "gasto"
    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id"))
    maquina_id = Column(Integer, ForeignKey("maquina.id"))
    tipo = Column(String(15))
    importe_total = Column(Integer)
    fecha = Column(DateTime)
    descripcion = Column(String(200))
    imagen = Column(LargeBinary)

    # Relaciones
    usuario = relationship("Usuario", back_populates="gastos")
    maquina = relationship("Maquina", back_populates="gastos")
    
    # Timestamps
    created = Column(DateTime(timezone=True), server_default=func.now())
    updated = Column(DateTime(timezone=True), onupdate=func.now())