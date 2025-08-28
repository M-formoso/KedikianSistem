import { Routes } from '@angular/router';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './modules/login/login.component';
import { operatorRoutes } from './modules/operator/operator.routes';
import { AuthRoleGuard } from './core/guards/auth-role.guard';
export const routes: Routes = [
  // ===== RUTA RAÍZ =====
  { 
    path: '', 
    redirectTo: '/login', 
    pathMatch: 'full' 
  },
  
  // ===== RUTA DE LOGIN UNIFICADA =====
  { 
    path: 'login', 
    component: LoginComponent,
    data: { 
      title: 'Iniciar Sesión',
      description: 'Acceso unificado al sistema de gestión'
    }
  },
  
  // ===== RUTAS DEL OPERARIO =====
  {
    path: 'operator',
    children: operatorRoutes,
    canActivate: [AuthRoleGuard], // ✅ Guard correcto aplicado
    data: {
      title: 'Panel del Operario',
      description: 'Sistema de gestión para operarios',
      role: 'operario' // ✅ Rol requerido
    }
  },
  
  // ===== RUTAS DEL ADMINISTRADOR =====
  // TODO: Descomentar cuando tengas el módulo admin en este proyecto
  /*
  {
    path: 'admin',
    loadChildren: () => import('./modules/admin/admin.routes').then(m => m.adminRoutes),
    canActivate: [authGuard],
    data: { 
      title: 'Panel del Administrador',
      description: 'Sistema de administración y gestión',
      role: 'administrador' 
    }
  },
  */
  
  // ===== REDIRECCIÓN TEMPORAL PARA ADMIN =====
  {
    path: 'admin',
    redirectTo: '/operator/dashboard',
    pathMatch: 'prefix'
  },
  
  // ===== RUTAS DE COMPATIBILIDAD =====
  // Para mantener compatibilidad con URLs existentes
  {
    path: 'administrador',
    redirectTo: '/admin',
    pathMatch: 'prefix'
  },
  {
    path: 'operario', 
    redirectTo: '/operator',
    pathMatch: 'prefix'
  },
  
  // ===== RUTA DE FALLBACK =====
  { 
    path: '**', 
    redirectTo: '/login' 
  }
];

export const appRouterProviders = provideRouter(routes);