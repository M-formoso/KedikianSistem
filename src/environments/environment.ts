// src/environments/environment.ts
export const environment = {
  production: false,
  // ✅ URL corregida para tu backend FastAPI
  apiUrl: 'http://kedikian.site/api/v1', 
  // Para desarrollo local descomenta esta:
  // apiUrl: 'http://localhost:8000/api/v1',
  
  appName: 'Sistema de Retroexcavadoras y Áridos',
  version: '1.0.0',
  
  // Configuración de autenticación
  tokenKey: 'usuarioActual',
  sessionTimeout: 8 * 60 * 60 * 1000, // 8 horas
  refreshTokenTime: 30 * 60 * 1000, // 30 minutos
  
  // Configuración de límites laborales
  maxWorkHours: 9,
  warningHours: 8,
  
  // Paginación
  defaultPageSize: 10,
  maxPageSize: 100
};

// src/environments/environment.prod.ts  
export const environment = {
  production: true,
  // ✅ URL de producción
  apiUrl: 'http://kedikian.site/api/v1', 
  appName: 'Sistema de Retroexcavadoras y Áridos',
  version: '1.0.0',
  tokenKey: 'usuarioActual',
  sessionTimeout: 8 * 60 * 60 * 1000,
  refreshTokenTime: 30 * 60 * 1000,
  maxWorkHours: 9,
  warningHours: 8,
  defaultPageSize: 10,
  maxPageSize: 100
};