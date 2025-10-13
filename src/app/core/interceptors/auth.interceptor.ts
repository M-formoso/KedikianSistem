// src/app/core/interceptors/auth.interceptor.ts - CORREGIDO CRÍTICO

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  
  console.log('🔍 Interceptor - URL:', req.url);
  
  // ✅ CRÍTICO: NO agregar token en peticiones de login
  if (req.url.includes('/auth/login')) {
    console.log('🔓 Petición de login - NO agregando token');
    return next(req).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error en login:', error.status, error.message);
        return throwError(() => error);
      })
    );
  }
  
  // Para otras peticiones, agregar token si existe
  const token = localStorage.getItem('access_token');
  
  console.log('🔑 Interceptor - Token presente:', !!token);

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Token agregado a la petición:', req.url);
  } else {
    console.log('⚠️ No hay token para agregar a:', req.url);
  }

  // Manejar la petición y errores
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('❌ Error en petición HTTP:', error.status, error.message);
      console.error('❌ URL que falló:', req.url);

      // Si es 401 (no autorizado), redirigir al login
      if (error.status === 401) {
        console.warn('🚨 Error 401 - Token inválido o expirado');
        console.warn('🚨 URL que causó 401:', req.url);
        
        // Solo limpiar y redirigir si NO es la petición de login
        if (!req.url.includes('/auth/login')) {
          console.log('🧹 Limpiando sesión por 401');
          localStorage.removeItem('access_token');
          localStorage.removeItem('current_user');
          localStorage.removeItem('token_type');
          localStorage.removeItem('token_expires_at');
          
          router.navigate(['/login'], { 
            queryParams: { 
              reason: 'session_expired',
              message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.' 
            } 
          });
        }
      }

      // Si es 403 (prohibido)
      if (error.status === 403) {
        console.warn('🚨 Error 403 - Acceso prohibido');
      }

      return throwError(() => error);
    })
  );
};