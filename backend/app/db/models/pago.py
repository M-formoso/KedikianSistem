from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class Pago(Base):
    __tablename__ = "pago"
    id = Column(Integer, primary_key=True, autoincrement=True)
    proyecto_id = Column(Integer, ForeignKey("proyecto.id"))
    producto_id = Column(Integer, ForeignKey("producto.id"))
    importe_total = Column(Integer)
    fecha = Column(DateTime)
    descripcion = Column(String(200))

    # Relaciones
    proyecto = relationship("Proyecto", back_populates="pagos")
    producto = relationship("Producto", back_populates="pagos")
    
    # Timestamps
    created = Column(DateTime(timezone=True), server_default=func.now())
    updated = Column(DateTime(timezone=True), onupdate=func.now())