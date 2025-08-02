from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class Producto(Base):
    __tablename__ = "producto"
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50))
    codigo_producto = Column(String(50))
    inventario = Column(Integer)
    url_imagen = Column(String(50), nullable=True)

    # Relaciones
    pagos = relationship("Pago", back_populates="producto")
    movimientos_inventario = relationship("MovimientoInventario", back_populates="producto")
    
    # Timestamps
    created = Column(DateTime(timezone=True), server_default=func.now())
    updated = Column(DateTime(timezone=True), onupdate=func.now())