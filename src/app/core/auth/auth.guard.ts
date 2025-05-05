import { Injectable } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isLoggedIn()) {
    // Verificar si la ruta requiere un rol específico
    if (route.data['role']) {
      const requiredRole = route.data['role'];
      
      if (requiredRole === 'operario' && authService.isOperator()) {
        return true;
      }
      
      if (requiredRole === 'administrador' && authService.isAdmin()) {
        return true;
      }
      
      // Si no tiene el rol requerido, redirigir a la página principal según su rol
      if (authService.isOperator()) {
        router.navigate(['/operator/dashboard']);
      } else if (authService.isAdmin()) {
        router.navigate(['/admin/dashboard']);
      } else {
        router.navigate(['/login']);
      }
      return false;
    }
    
    // Si no se especifica un rol, permitir el acceso
    return true;
  }
  
  // No está autenticado, redirigir al login
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};