// src/environments/environment.ts
export const environment = {
  production: false,
  useSimulatedData: false,
  
  // 🔧 URL del API - CORREGIDA para conectar con tu backend
  apiUrl: 'https://kedikian.site/api/v1',  // ← URL de tu servidor real
  
  // 📱 Configuración de la aplicación
  appName: 'Sistema Movimiento de Suelo - Operario',
  version: '1.0.0',
  
  // 🔐 Configuración de autenticación
  tokenKey: 'usuarioActual',
  sessionTimeout: 8 * 60 * 60 * 1000, // 8 horas en milisegundos
  refreshTokenTime: 30 * 60 * 1000,   // 30 minutos antes de expirar
  
  // ⏰ Configuración de jornada laboral
  maxWorkHours: 9,      // Máximo de horas por jornada
  warningHours: 8,      // Horas después de las cuales mostrar advertencia
  
  // 📄 Configuración de paginación
  defaultPageSize: 10,
  maxPageSize: 100,
  
  // 🔧 Configuración de desarrollo
  enableConsoleLogging: true,
  enableDetailedErrors: true,
  
  // 📊 URLs específicas de la aplicación operario
  dashboardUrl: '/operator/dashboard',
  loginUrl: '/login',
  
  // 🚀 Configuración de características
  features: {
    enableWorkHours: true,
    enableMachineHours: true,
    enableExpenseTracking: true,
    enableMaterialDelivery: true,
    enableGeolocation: true,
    enableNotifications: true
  },
  
  // 🔄 Configuración de reintentos y timeouts
  httpTimeout: 30000,           // 30 segundos
  retryAttempts: 3,
  retryDelay: 1000,             // 1 segundo
  
  // 📱 Configuración de dispositivos móviles
  mobile: {
    breakpoint: 768,
    enableSwipeGestures: true,
    enablePullToRefresh: true
  },
  
  // 🎨 Configuración de tema
  theme: {
    primaryColor: '#667eea',
    secondaryColor: '#764ba2',
    accentColor: '#28a745',
    warningColor: '#ffc107',
    dangerColor: '#dc3545'
  },
  
  // 📍 Configuración de geolocalización
  geolocation: {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
    workAreaRadius: 500 // metros
  },
  
  // 🔔 Configuración de notificaciones
  notifications: {
    enableBrowserNotifications: true,
    enableSoundAlerts: true,
    workLimitWarningEnabled: true
  },
  
  // 🗄️ Configuración de almacenamiento local
  storage: {
    enableLocalStorage: true,
    cacheTimeout: 24 * 60 * 60 * 1000, // 24 horas
    maxCacheSize: 10 * 1024 * 1024      // 10 MB
  },
  
  // 🚫 Firebase deshabilitado para este proyecto
  firebaseConfig: null,
  
  // 🔍 Configuración de logging
  logging: {
    level: 'debug', // 'error', 'warn', 'info', 'debug'
    enableRemoteLogging: false,
    logEndpoint: null
  },
  
  // 🌐 URLs del backend por funcionalidad - CORREGIDAS según tu backend
  endpoints: {
    auth: {
      login: '/auth/login',
      logout: '/auth/logout', 
      me: '/auth/me',
      refresh: '/auth/refresh'
    },
    workHours: {
      clockIn: '/reportes-laborales',
      clockOut: '/reportes-laborales',
      recent: '/reportes-laborales',
      byUser: '/reportes-laborales'
    },
    machineHours: {
      create: '/reportes-laborales',
      list: '/reportes-laborales', 
      machines: '/maquinas',
      projects: '/proyectos',
      machineTypes: '/maquinas' // Los tipos se extraen de las máquinas
    },
    expenses: {
      create: '/gastos',
      list: '/gastos',
      types: '/gastos', // Los tipos serán hardcodeados o desde catálogos
      methods: '/gastos' // Los métodos serán hardcodeados o desde catálogos
    },
    materials: {
      deliveries: '/entregas-arido', // Según tu router
      projects: '/proyectos',
      vehicles: '/maquinas', // Vehículos podrían ser un tipo de máquina
      materials: '/productos' // Materiales podrían estar en productos
    },
    users: '/usuarios',
    
    // Endpoints adicionales según tu backend
    contracts: '/contratos',
    payments: '/pagos',
    products: '/productos',
    projects: '/proyectos',
    reports: '/reportes-laborales',
    inventory: '/movimientos-inventario',
    maintenance: '/mantenimientos'
  }
};