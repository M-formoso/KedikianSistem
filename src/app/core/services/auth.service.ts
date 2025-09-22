import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

export interface Usuario {
  email: string;
  id: string;
  nombreUsuario: string;
  roles: string[];
  token?: string;
  // 🚀 AGREGADO: Para mantener compatibilidad con el interceptor
  access_token?: string;
}

// Interfaz para la respuesta del login OAuth2
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

const apiUrl = `${environment.apiUrl}`;

export type User = Usuario;

export interface CredencialesLogin {
  nombreUsuario: string;
  contraseña: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private usuarioActualSubject = new BehaviorSubject<Usuario | null>(null);
  public usuarioActual$ = this.usuarioActualSubject.asObservable();

  // Alias para componentes que usan nombres en inglés
  public currentUser$ = this.usuarioActual$;

  constructor(private router: Router, private http: HttpClient) {
    this.cargarUsuarioDesdeAlmacenamiento();
  }

  private cargarUsuarioDesdeAlmacenamiento(): void {
    const usuarioAlmacenado = localStorage.getItem('usuarioActual');
    if (usuarioAlmacenado) {
      try {
        const usuario = JSON.parse(usuarioAlmacenado);
        this.usuarioActualSubject.next(usuario);
      } catch (error) {
        localStorage.removeItem('usuarioActual');
      }
    }
  }

  login(username: string, password: string): Observable<Usuario> {
    // 🔒 LOGS SEGUROS - Sin exponer credenciales
    console.log('🚀 Iniciando autenticación...');
    console.log('📧 Username length:', username?.length || 0);
    console.log('🔒 Password length:', password?.length || 0);
    console.log('🌐 Endpoint:', `${apiUrl}/auth/login`);
  
    // Codificar en base64 (sin mostrar en logs)
    const usernameBase64 = btoa(username);
    const passwordBase64 = btoa(password);
  
    const body = new HttpParams()
      .set('username', usernameBase64)
      .set('password', passwordBase64);
      
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    
    const loginUrl = `${apiUrl}/auth/login`;
    
    // 🔒 LOG SEGURO - Solo confirmar que se está enviando
    console.log('📤 Enviando petición de autenticación...');
    
    return this.http.post<LoginResponse>(
      loginUrl,
      body.toString(),
      { headers }
    ).pipe(
      switchMap((loginResponse: LoginResponse) => {
        // 🔒 LOG SEGURO - No mostrar token completo
        console.log('✅ Respuesta de autenticación recibida');
        console.log('🎫 Token type:', loginResponse.token_type);
        console.log('🎫 Token recibido:', loginResponse.access_token ? 'SÍ' : 'NO');
        
        const tokenData = {
          access_token: loginResponse.access_token,
          token_type: loginResponse.token_type,
          token: loginResponse.access_token
        };
        
        localStorage.setItem('usuarioActual', JSON.stringify(tokenData));
        
        return this.obtenerInformacionUsuario(loginResponse.access_token).pipe(
          tap((usuarioInfo: any) => {
            // 🔒 LOG SEGURO - Solo información no sensible
            console.log('✅ Información del usuario obtenida');
            console.log('👤 Usuario ID:', usuarioInfo.id);
            console.log('📧 Email:', usuarioInfo.email);
            console.log('🏷️ Nombre:', usuarioInfo.nombre);
            console.log('🎯 Roles:', usuarioInfo.roles);
            console.log('✅ Estado activo:', usuarioInfo.estado);
            
            const usuarioCompleto: Usuario = {
              id: usuarioInfo.id || 'temp',
              nombreUsuario: usuarioInfo.email || usuarioInfo.nombreUsuario || username,
              roles: usuarioInfo.roles || ['administrador'],
              token: loginResponse.access_token,
              access_token: loginResponse.access_token,
              ...usuarioInfo
            };
            
            localStorage.setItem('usuarioActual', JSON.stringify(usuarioCompleto));
            this.usuarioActualSubject.next(usuarioCompleto);
            
            console.log('✅ Usuario autenticado y guardado correctamente');
            
            return usuarioCompleto;
          }),
          catchError((error) => {
            console.warn('⚠️ No se pudo obtener información detallada del usuario');
            console.warn('⚠️ Error status:', error.status);
            
            const usuarioPorDefecto: Usuario = {
              id: 'temp',
              nombreUsuario: username,
              email: 'default@example.com', // Default email added
              roles: ['administrador'],
              token: loginResponse.access_token,
              access_token: loginResponse.access_token
            };
            
            localStorage.setItem('usuarioActual', JSON.stringify(usuarioPorDefecto));
            this.usuarioActualSubject.next(usuarioPorDefecto);
            
            console.log('✅ Usuario creado con datos por defecto');
            
            return of(usuarioPorDefecto);
          })
        );
      }),
      tap((usuario: Usuario) => {
        console.log('🎯 Login completado exitosamente');
        console.log('👤 Usuario final - ID:', usuario.id);
        console.log('🎯 Roles asignados:', usuario.roles);
        console.log('🔐 Token presente:', !!usuario.access_token);
      }),
      catchError((error) => {
        // 🔒 LOG SEGURO DE ERRORES - Sin exponer información sensible
        console.error('❌ Error en autenticación');
        console.error('📊 Status:', error.status);
        console.error('📊 StatusText:', error.statusText);
        
        // Solo en desarrollo (puedes controlar esto con environment)
        if (!environment.production) {
          console.error('🔧 [DEV] Error URL:', error.url);
          console.error('🔧 [DEV] Error details:', error.error);
        }
        
        return throwError(() => error);
      })
    );
  }  

  cerrarSesion(): void {
    localStorage.removeItem('usuarioActual');
    this.usuarioActualSubject.next(null);
    this.router.navigate(['/login']);
  }

  // Alias para cerrarSesion
  logout(): void {
    this.cerrarSesion();
  }

  obtenerUsuarioActual(): Usuario | null {
    return this.usuarioActualSubject.value;
  }

  // Alias para obtenerUsuarioActual
  getCurrentUser(): Usuario | null {
    return this.obtenerUsuarioActual();
  }

  estaAutenticado(): boolean {
    return !!this.usuarioActualSubject.value;
  }

  // Alias para estaAutenticado
  isAuthenticated(): boolean {
    return this.estaAutenticado();
  }

  esAdministrador(): boolean {
    const usuario = this.usuarioActualSubject.value;
    return !!usuario && usuario.roles.includes('administrador');
  }

  esOperario(): boolean {
    const usuario = this.usuarioActualSubject.value;
    return !!usuario && usuario.roles.includes('operario');
  }

  // Método para verificar el rol (alias)
  hasRole(role: string): boolean {
    const usuario = this.usuarioActualSubject.value;
    return !!usuario && usuario.roles.includes(role);
  }

  // 🚀 MEJORADO: Obtener token de múltiples fuentes
  obtenerTokenAuth(): string | null {
    const usuario = this.usuarioActualSubject.value;
    return usuario?.access_token || usuario?.token || null;
  }

  refrescarToken(): Observable<Usuario> {
    return throwError(
      () => new Error('Token refresh no disponible en modo simulado')
    );
  }

  // 🚀 MEJORADO: Pasar token como parámetro para evitar referencias circulares
  private obtenerInformacionUsuario(token: string): Observable<any> {
    // Obtener información del usuario desde el backend
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.get<any>(`${apiUrl}/auth/me`, { headers }).pipe(
      tap((userInfo) => {
        console.log('✅ Usuario obtenido de /auth/me:', userInfo);
      }),
      catchError((error) => {
        console.warn('⚠️ Error al obtener información del usuario desde /auth/me:', error);
        throw error; // Re-lanzar el error para que sea manejado en el switchMap
      })
    );
  }
  
}
