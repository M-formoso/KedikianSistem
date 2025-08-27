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
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    console.log('🔒 RoleGuard - Verificando rol para:', state.url);
    
    // Obtener el rol requerido desde la configuración de la ruta
    const requiredRole = route.data['role'];
    
    if (!requiredRole) {
      console.log('⚠️ No se especificó rol requerido, permitiendo acceso');
      return true;
    }

    console.log('🎯 Rol requerido:', requiredRole);
    console.log('👤 Usuario actual:', this.authService.obtenerUsuarioActual());
    
    // Verificar si el usuario tiene el rol requerido
    if (this.authService.hasRole(requiredRole)) {
      console.log('✅ Acceso permitido - Rol válido');
      return true;
    }

    // El usuario no tiene el rol requerido
    console.log('❌ Acceso denegado - Rol insuficiente');
    
    // Redirigir según el rol del usuario
    if (this.authService.esAdministrador()) {
      this.router.navigate(['/dashboard']);
    } else if (this.authService.esOperario()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
    
    return false;
  }
}