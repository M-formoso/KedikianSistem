// src/app/interceptors/auth.interceptor.ts - VERSIÓN FUNCIONAL PARA ANGULAR STANDALONE

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  
  // Obtener token de localStorage
  const token = localStorage.getItem('access_token');
  
  console.log('🔍 Interceptor - URL:', req.url);
  console.log('🔑 Interceptor - Token presente:', !!token);

  // Clonar request y agregar token si existe
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Token agregado a la petición');
  } else {
    console.log('⚠️ No hay token para agregar');
  }

  // Manejar la petición y errores
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('❌ Error en petición HTTP:', error.status, error.message);

      // Si es 401 (no autorizado), redirigir al login
      if (error.status === 401) {
        console.warn('🚨 Error 401 - Token inválido o expirado, redirigiendo a login');
        localStorage.removeItem('access_token');
        localStorage.removeItem('current_user');
        router.navigate(['/login']);
      }

      // Si es 403 (prohibido)
      if (error.status === 403) {
        console.warn('🚨 Error 403 - Acceso prohibido');
      }

      return throwError(() => error);
    })
  );
};