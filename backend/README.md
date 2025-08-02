# Arquitectura en Docker

[Internet]
     ↓
[NGINX proxy (contenedor)]
   ↓        ↓         ↓
[Frontend Admin] [Frontend Operario] [Backend API]
                         ↓
                  [Base de datos]

# Estructura docker-compose.yml

version: '3.9'

services:
  nginx:
    image: nginx:latest
    container_name: nginx_proxy
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - frontend_admin
      - frontend_operario
      - backend
    networks:
      - webnet

  frontend_admin:
    image: tu_imagen_frontend_admin
    container_name: frontend_admin
    networks:
      - webnet

  frontend_operario:
    image: tu_imagen_frontend_operario
    container_name: frontend_operario
    networks:
      - webnet

  backend:
    image: tu_imagen_backend
    container_name: backend_api
    networks:
      - webnet
    environment:
      - DATABASE_URL=postgresql://usuario:contraseña@db:5432/tu_basededatos

  db:
    image: postgres:16
    container_name: postgres_db
    environment:
      POSTGRES_USER: usuario
      POSTGRES_PASSWORD: contraseña
      POSTGRES_DB: tu_basededatos
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - webnet

volumes:
  postgres_data:

networks:
  webnet:

# ENDPOINTS
apiUrl = "http://localhost:8000/api"

usuario = "/usuarios"

arrendamiento = "/arrendamientos"

contrato = "/contratos"

gasto = "/gastos"

pago = "/pagos"

maquina = "/maquinas"

movimiento_inventario = "/movimientos-inventario"

producto = "/productos"

proyecto = "/proyectos"

reporte_laboral = "/reportes-laborales"