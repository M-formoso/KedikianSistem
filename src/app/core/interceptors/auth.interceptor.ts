import {
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export function AuthInterceptor(
  request: HttpRequest<unknown>, 
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const router = inject(Router);
  const authService = inject(AuthService);

  // Rutas que no requieren token
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/refresh'];
  const isPublicRoute = publicRoutes.some(route => request.url.includes(route));

  if (isPublicRoute) {
    return next(request).pipe(
      catchError((error: HttpErrorResponse) => handleHttpError(error, router, authService))
    );
  }

  // Obtener token del servicio de autenticación
  const token = authService.obtenerTokenAuth();

  // Clonar request con headers
  let secureRequest = request.clone({
    setHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  return next(secureRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si es error 401, intentar refrescar token
      if (error.status === 401 && token) {
        return authService.refrescarToken().pipe(
          switchMap((usuario) => {
            // Reintentar con el nuevo token
            const newToken = usuario.access_token;
            const retryRequest = request.clone({
              setHeaders: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                Authorization: `Bearer ${newToken}`
              }
            });
            return next(retryRequest);
          }),
          catchError((refreshError) => {
            // Si falla el refresh, cerrar sesión
            authService.cerrarSesion();
            return throwError(() => refreshError);
          })
        );
      }
      
      return handleHttpError(error, router, authService);
    })
  );
}

function handleHttpError(
  error: HttpErrorResponse, 
  router: Router, 
  authService: AuthService
): Observable<never> {
  console.error('HTTP Error:', {
    status: error.status,
    statusText: error.statusText,
    url: error.url,
    message: error.message
  });

  switch (error.status) {
    case 401:
      console.warn('🔐 Token inválido o expirado');
      authService.cerrarSesion();
      break;
    case 403:
      console.warn('🚫 Acceso prohibido');
      router.navigate(['/operator/dashboard']);
      break;
    case 0:
      console.error('🌐 Error de conexión con el servidor');
      break;
    case 404:
      console.warn('🔍 Recurso no encontrado:', error.url);
      break;
    case 500:
      console.error('🔥 Error interno del servidor');
      break;
    default:
      console.error(`❌ Error HTTP ${error.status}: ${error.statusText}`);
  }
  
  return throwError(() => error);
}