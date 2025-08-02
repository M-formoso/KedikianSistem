from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.db.init_db import init_db
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.middlewares.error_handler import ErrorHandler
# Importar los routers
from app.routers import (
    usuarios_router,
    maquinas_router,
    proyectos_router,
    contratos_router,
    gastos_router,
    pagos_router,
    productos_router,
    arrendamientos_router,
    movimientos_inventario_router,
    reportes_laborales_router,
    excel_router,
    entrega_arido_router,
    login_router,
    aridos_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(ErrorHandler)
# Configuración de CORS y middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # Permite solicitudes desde cualquier origen
    allow_credentials=True,
    allow_methods=["*"],  # Métodos permitidos
    allow_headers=["*"],  # Headers permitidos
)

# Montar la carpeta static para servir archivos estáticos
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(usuarios_router.router, prefix="/api/v1")
app.include_router(maquinas_router.router, prefix="/api/v1")
app.include_router(proyectos_router.router, prefix="/api/v1")
app.include_router(contratos_router.router, prefix="/api/v1")
app.include_router(gastos_router.router, prefix="/api/v1")
app.include_router(pagos_router.router, prefix="/api/v1")
app.include_router(productos_router.router, prefix="/api/v1")
app.include_router(arrendamientos_router.router, prefix="/api/v1")
app.include_router(movimientos_inventario_router.router, prefix="/api/v1")
app.include_router(reportes_laborales_router.router, prefix="/api/v1")
app.include_router(excel_router.router, prefix="/api/v1")
app.include_router(entrega_arido_router.router, prefix="/api/v1")
app.include_router(login_router.router, prefix="/api/v1")
app.include_router(aridos_router.router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {"message": "API funcionando correctamente"}

# Lineas de código para debuggear
import uvicorn
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
