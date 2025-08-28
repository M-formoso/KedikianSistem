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
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    console.log('🔒 AuthGuard - Verificando autenticación para:', state.url);
    console.log('👤 Usuario actual:', this.authService.obtenerUsuarioActual());
    console.log('🔐 ¿Está autenticado?:', this.authService.estaAutenticado());
    
    if (this.authService.estaAutenticado()) {
      // El usuario está autenticado, permitir el acceso
      console.log('✅ Acceso permitido');
      return true;
    }

    // El usuario no está autenticado, redirigir al login
    console.log('❌ Usuario no autenticado, redirigiendo a login');
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }
}