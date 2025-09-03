import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

// ✅ INTERFACES CORREGIDAS
export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  roles: string; // ✅ Backend devuelve string, no array
  estado: boolean;
  access_token?: string;
  token?: string;
  fecha_creacion?: string;
}

// Interfaz para la respuesta del login OAuth2
export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface CredencialesLogin {
  username: string;
  password: string;
}

const apiUrl = environment.apiUrl;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private usuarioActualSubject = new BehaviorSubject<Usuario | null>(null);
  public usuarioActual$ = this.usuarioActualSubject.asObservable();

  constructor(private router: Router, private http: HttpClient) {
    this.cargarUsuarioDesdeAlmacenamiento();
  }

  private cargarUsuarioDesdeAlmacenamiento(): void {
    const usuarioAlmacenado = localStorage.getItem(environment.tokenKey);
    if (usuarioAlmacenado) {
      try {
        const usuario = JSON.parse(usuarioAlmacenado);
        // Verificar que el token no haya expirado
        if (this.isTokenValid(usuario)) {
          this.usuarioActualSubject.next(usuario);
        } else {
          this.cerrarSesion();
        }
      } catch (error) {
        console.error('Error al cargar usuario del localStorage:', error);
        localStorage.removeItem(environment.tokenKey);
      }
    }
  }

  private isTokenValid(usuario: Usuario): boolean {
    if (!usuario.access_token) return false;
    
    try {
      // Decodificar JWT para verificar expiración
      const tokenPayload = JSON.parse(atob(usuario.access_token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return tokenPayload.exp > currentTime;
    } catch {
      return false; // Si no se puede decodificar, considerar inválido
    }
  }

  // ✅ LOGIN CORREGIDO - SIN CODIFICACIÓN BASE64
  login(username: string, password: string): Observable<Usuario> {
    console.log('🚀 Iniciando autenticación...');
    console.log('🌐 Endpoint:', `${apiUrl}/auth/login`);
  
    // ✅ Preparar datos para OAuth2 estándar (SIN base64)
    const body = new HttpParams()
      .set('username', username)
      .set('password', password)
      .set('grant_type', 'password'); // Estándar OAuth2
      
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    });
    
    const loginUrl = `${apiUrl}/auth/login`;
    
    console.log('📤 Enviando petición de autenticación...');
    
    return this.http.post<LoginResponse>(
      loginUrl,
      body.toString(),
      { headers }
    ).pipe(
      switchMap((loginResponse: LoginResponse) => {
        console.log('✅ Token de autenticación recibido');
        
        // Obtener información del usuario con el token
        return this.obtenerInformacionUsuario(loginResponse.access_token).pipe(
          tap((usuarioInfo: any) => {
            console.log('✅ Información del usuario obtenida:', usuarioInfo);
            
            const usuarioCompleto: Usuario = {
              id: usuarioInfo.id,
              nombre: usuarioInfo.nombre || usuarioInfo.name || username,
              email: usuarioInfo.email || `${username}@kedikian.com`,
              roles: usuarioInfo.roles || 'operario', // ✅ String simple
              estado: usuarioInfo.estado !== false,
              access_token: loginResponse.access_token,
              token: loginResponse.access_token
            };
            
            localStorage.setItem(environment.tokenKey, JSON.stringify(usuarioCompleto));
            this.usuarioActualSubject.next(usuarioCompleto);
            
            console.log('✅ Usuario autenticado correctamente');
          })
        );
      }),
      catchError((error) => {
        console.error('❌ Error en autenticación:', error);
        
        let errorMessage = 'Error de autenticación';
        
        if (error.status === 401) {
          errorMessage = 'Usuario o contraseña incorrectos';
        } else if (error.status === 0) {
          errorMessage = 'Error de conexión. Verifique su conexión a internet.';
        } else if (error.status >= 500) {
          errorMessage = 'Error en el servidor. Intente nuevamente.';
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  private obtenerInformacionUsuario(token: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });
    
    return this.http.get<any>(`${apiUrl}/auth/me`, { headers }).pipe(
      tap((userInfo) => {
        console.log('✅ Información del usuario desde /auth/me:', userInfo);
      }),
      catchError((error) => {
        console.warn('⚠️ Error al obtener información del usuario:', error);
        
        // ✅ Si falla /auth/me, crear un usuario básico con el token
        return of({
          id: Date.now(), // ID temporal
          nombre: 'Usuario',
          email: 'usuario@kedikian.com',
          roles: 'operario',
          estado: true
        });
      })
    );
  }

  cerrarSesion(): void {
    localStorage.removeItem(environment.tokenKey);
    this.usuarioActualSubject.next(null);
    this.router.navigate(['/login']);
  }

  obtenerUsuarioActual(): Usuario | null {
    return this.usuarioActualSubject.value;
  }

  estaAutenticado(): boolean {
    const usuario = this.usuarioActualSubject.value;
    return !!usuario && !!usuario.access_token && this.isTokenValid(usuario);
  }

  // ✅ MÉTODOS DE ROLES CORREGIDOS para string (no array)
  esAdministrador(): boolean {
    const usuario = this.usuarioActualSubject.value;
    if (!usuario || !usuario.roles) return false;
    
    const rol = usuario.roles.toLowerCase();
    return ['administrador', 'admin'].includes(rol);
  }

  esOperario(): boolean {
    const usuario = this.usuarioActualSubject.value;
    if (!usuario || !usuario.roles) return false;
    
    const rol = usuario.roles.toLowerCase();
    return ['operario', 'operator', 'user'].includes(rol);
  }

  hasRole(role: string): boolean {
    const usuario = this.usuarioActualSubject.value;
    if (!usuario || !usuario.roles) return false;
    
    return usuario.roles.toLowerCase() === role.toLowerCase();
  }

  obtenerTokenAuth(): string | null {
    const usuario = this.usuarioActualSubject.value;
    return usuario?.access_token || usuario?.token || null;
  }

  // ✅ Método para refrescar token (si el backend lo soporta)
  refrescarToken(): Observable<Usuario> {
    const usuario = this.usuarioActualSubject.value;
    if (!usuario || !usuario.access_token) {
      return throwError(() => new Error('No hay usuario autenticado'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${usuario.access_token}`,
      'Accept': 'application/json'
    });

    return this.http.post<LoginResponse>(`${apiUrl}/auth/refresh`, {}, { headers }).pipe(
      tap((response) => {
        if (response.access_token) {
          usuario.access_token = response.access_token;
          usuario.token = response.access_token;
          localStorage.setItem(environment.tokenKey, JSON.stringify(usuario));
          this.usuarioActualSubject.next(usuario);
        }
      }),
      switchMap(() => of(usuario)),
      catchError((error) => {
        console.error('Error refrescando token:', error);
        this.cerrarSesion();
        return throwError(() => new Error('Token expirado'));
      })
    );
  }

  // ✅ Método adicional para obtener usuario actual
  getCurrentUser(): Usuario | null {
    return this.obtenerUsuarioActual();
  }
}