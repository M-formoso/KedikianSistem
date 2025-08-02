from app.db.database import Base, engine
from app.db.models import (
    Usuario,
    Maquina,
    Proyecto,
    Contrato,
    Gasto,
    Pago,
    Producto,
    Arrendamiento,
    MovimientoInventario,
    ReporteLaboral,
)

async def init_db():
    Base.metadata.create_all(bind=engine)
