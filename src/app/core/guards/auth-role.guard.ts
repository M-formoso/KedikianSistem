// src/app/core/guards/auth-role.guard.ts - SIMPLIFICADO

import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthRoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    console.log('🔒 AuthRoleGuard - Verificando autenticación para:', state.url);
    
    // ✅ SIMPLIFICADO: Verificación básica
    const isAuthenticated = this.authService.estaAutenticado();
    const currentUser = this.authService.obtenerUsuarioActual();
    
    console.log('🔐 ¿Está autenticado?:', isAuthenticated);
    console.log('👤 Usuario actual:', currentUser);
    
    if (isAuthenticated) {
      console.log('✅ Acceso permitido');
      return true;
    }

    // No autenticado
    console.log('❌ Usuario no autenticado, redirigiendo a login');
    
    this.router.navigate(['/login'], {
      queryParams: { 
        returnUrl: state.url
      },
    });
    
    return false;
  }
}