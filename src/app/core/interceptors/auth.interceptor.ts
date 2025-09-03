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

  // ✅ Rutas que no requieren token
  const publicRoutes = ['/auth/login', '/auth/register', '/usuarios'];
  const isPublicRoute = publicRoutes.some(route => request.url.includes(route));

  // ✅ Para rutas públicas, solo manejar errores
  if (isPublicRoute) {
    return next(request).pipe(
      catchError((error: HttpErrorResponse) => handleHttpError(error, router, authService))
    );
  }

  // ✅ Obtener token del servicio de autenticación
  const token = authService.obtenerTokenAuth();

  // ✅ Si no hay token y la ruta no es pública, redirigir al login
  if (!token) {
    console.warn('🔐 No hay token disponible, redirigiendo al login');
    authService.cerrarSesion();
    return throwError(() => new Error('No autorizado'));
  }

  // ✅ Clonar request con headers correctos
  let secureRequest = request;
  
  // Solo agregar headers si no los tiene ya
  if (!request.headers.has('Authorization')) {
    secureRequest = request.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
  }

  // ✅ Enviar request y manejar errores
  return next(secureRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si es error 401, intentar refrescar token solo una vez
      if (error.status === 401 && token && !request.url.includes('/auth/refresh')) {
        console.log('🔄 Intentando refrescar token...');
        
        return authService.refrescarToken().pipe(
          switchMap((usuario) => {
            // Reintentar con el nuevo token
            const newToken = usuario.access_token;
            if (newToken) {
              const retryRequest = request.clone({
                setHeaders: {
                  'Authorization': `Bearer ${newToken}`,
                  'Accept': 'application/json'
                }
              });
              return next(retryRequest);
            }
            throw error;
          }),
          catchError((refreshError) => {
            // Si falla el refresh, cerrar sesión
            console.error('❌ Error refrescando token, cerrando sesión');
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
  console.error('❌ HTTP Error:', {
    status: error.status,
    statusText: error.statusText,
    url: error.url,
    message: error.message,
    error: error.error
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
    case 422:
      console.warn('📝 Error de validación:', error.error?.detail || error.message);
      break;
    case 500:
      console.error('🔥 Error interno del servidor');
      break;
    default:
      console.error(`❌ Error HTTP ${error.status}: ${error.statusText}`);
  }
  
  return throwError(() => error);
}