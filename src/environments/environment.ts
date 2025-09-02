// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://kedikian.site/api/v1', // ✅ Tu URL actual
  // apiUrl: 'http://localhost:8000/api/v1', // Para desarrollo local
  appName: 'Sistema de Retroexcavadoras y Áridos',
  version: '1.0.0',
  // Configuración adicional
  tokenKey: 'usuarioActual',
  sessionTimeout: 8 * 60 * 60 * 1000, // 8 horas en milliseconds
  refreshTokenTime: 30 * 60 * 1000, // 30 minutos
  
  // Configuración de límites
  maxWorkHours: 9, // Máximo de horas laborales por día
  warningHours: 8, // Horas antes de mostrar advertencia
  
  // Configuración de paginación
  defaultPageSize: 10,
  maxPageSize: 100
};

// src/environments/environment.prod.ts
export const environmentProd = {
  production: true,
  apiUrl: 'http://168.197.50.82/api/v1', // ✅ Tu servidor de producción
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