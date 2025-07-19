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
  
  // Verificar si el usuario está autenticado
  if (!authService.isLoggedIn()) {
    console.log('Usuario no autenticado, redirigiendo a login');
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
  
  const currentUser = authService.getCurrentUser();
  
  if (!currentUser) {
    console.log('No se pudo obtener usuario actual, redirigiendo a login');
    router.navigate(['/login']);
    return false;
  }
  
  // Verificar si la ruta requiere un rol específico
  const requiredRole = route.data['role'];
  
  if (requiredRole) {
    const userRole = currentUser.roles;
    
    console.log('Verificando acceso:', {
      requiredRole,
      userRole,
      userName: currentUser.nombre
    });
    
    // Verificar rol específico
    if (requiredRole === 'operario' && userRole === 'operario') {
      return true;
    }
    
    if (requiredRole === 'administrador' && userRole === 'administrador') {
      return true;
    }
    
    // Los administradores pueden acceder a rutas de operario
    if (requiredRole === 'operario' && userRole === 'administrador') {
      return true;
    }
    
    // Si no tiene el rol requerido, redirigir según su rol actual
    console.log('Usuario sin permisos para esta ruta, redirigiendo...');
    
    if (userRole === 'operario') {
      router.navigate(['/operator/dashboard']);
    } else if (userRole === 'administrador') {
      // TODO: Crear rutas de administrador
      router.navigate(['/operator/dashboard']); // Por ahora redirigir a operario
    } else {
      router.navigate(['/login']);
    }
    
    return false;
  }
  
  // Si no se especifica un rol requerido, permitir el acceso a usuarios autenticados
  return true;
};