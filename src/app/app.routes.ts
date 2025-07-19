import { Routes } from '@angular/router';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './modules/auth/login.component';
import { operatorRoutes } from './modules/operator/operator.routes';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // Ruta raíz - redirigir según el estado de autenticación
  { 
    path: '', 
    redirectTo: '/login', 
    pathMatch: 'full' 
  },
  
  // Ruta de login - accesible sin autenticación
  { 
    path: 'login', 
    component: LoginComponent,
    data: { 
      title: 'Iniciar Sesión',
      description: 'Acceso al sistema de gestión'
    }
  },
  
  // Rutas del operario - protegidas con guard
  {
    path: 'operator',
    children: operatorRoutes,
    data: {
      title: 'Panel del Operario',
      description: 'Sistema de gestión para operarios'
    }
  },
  
  // TODO: Rutas del administrador (para implementar en el futuro)
  // {
  //   path: 'admin',
  //   loadChildren: () => import('./modules/admin/admin.routes').then(m => m.adminRoutes),
  //   canActivate: [authGuard],
  //   data: { role: 'administrador' }
  // },
  
  // Ruta de fallback - redirigir a login
  { 
    path: '**', 
    redirectTo: '/login' 
  }
];

export const appRouterProviders = provideRouter(routes);