// auth.interceptor.ts
import {
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export function AuthInterceptor(
  request: HttpRequest<unknown>, 
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const router = inject(Router);

  // Rutas que no requieren token
  const authRoutes = ['/auth/login', '/auth/register', '/auth/refresh'];
  const isAuthRoute = authRoutes.some(route => request.url.includes(route));

  if (isAuthRoute) {
    // Dejo pasar sin token
    return next(request).pipe(
      catchError((error: HttpErrorResponse) => handleHttpError(error, router))
    );
  }

  // Buscar token en localStorage
  const usuarioActual = localStorage.getItem('usuarioActual');
  let token: string | null = null;

  if (usuarioActual) {
    try {
      const usuario = JSON.parse(usuarioActual);
      token = usuario.access_token || usuario.token || null;
    } catch {
      localStorage.removeItem('usuarioActual');
    }
  }

  // Clonar request con headers
  let secureRequest = request.clone({
    setHeaders: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  return next(secureRequest).pipe(
    catchError((error: HttpErrorResponse) => handleHttpError(error, router))
  );
}

// Manejo seguro de errores
function handleHttpError(error: HttpErrorResponse, router: Router): Observable<never> {
  // 🚫 No mostramos datos sensibles
  switch (error.status) {
    case 401:
      localStorage.removeItem('usuarioActual');
      router.navigate(['/login']);
      break;
    case 403:
      // opcional: redirigir a página de "no autorizado"
      break;
    case 0:
      console.error('Error de conexión con el servidor');
      break;
    default:
      console.error(`Error HTTP ${error.status}: ${error.statusText}`);
  }
  return throwError(() => error);
}