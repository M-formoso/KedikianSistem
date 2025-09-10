// src/environments/environment.prod.ts  
export const environment = {
  production: true,
  useSimulatedData: false,
  
  // ✅ URL de producción - usar la URL de tu servidor
  apiUrl: 'https://kedikian.site/api/v1',  // ← Tu servidor real
  
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
  
  // 🔧 Configuración de desarrollo (en prod es false)
  enableConsoleLogging: false,
  enableDetailedErrors: false,
  
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
  
  // 🔍 Configuración de logging (más restrictivo en prod)
  logging: {
    level: 'error', // Solo errores en producción
    enableRemoteLogging: false,
    logEndpoint: null
  },
  
  // 🌐 URLs del backend por funcionalidad
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
      machineTypes: '/maquinas'
    },
    expenses: {
      create: '/gastos',
      list: '/gastos',
      types: '/gastos',
      methods: '/gastos'
    },
    materials: {
      deliveries: '/entregas-arido',
      projects: '/proyectos',
      vehicles: '/maquinas',
      materials: '/productos'
    },
    users: '/usuarios',
    contracts: '/contratos',
    payments: '/pagos',
    products: '/productos',
    projects: '/proyectos',
    reports: '/reportes-laborales',
    inventory: '/movimientos-inventario',
    maintenance: '/mantenimientos'
  }
};