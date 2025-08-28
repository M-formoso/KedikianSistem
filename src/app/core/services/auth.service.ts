import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

// ✅ INTERFACES UNIFICADAS
export interface Usuario {
  id: string;
  nombre: string; // ✅ Cambiado de nombreUsuario a nombre
  email?: string;
  roles: string[]; // ✅ Array de roles
  token?: string;
  access_token?: string;
}

// ✅ ALIAS PARA COMPATIBILIDAD
export type UsuarioConToken = Usuario;
export type User = Usuario;

// Interfaz para la respuesta del login OAuth2
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface CredencialesLogin {
  nombreUsuario: string;
  contraseña: string;
}

const apiUrl = `${environment.apiUrl}`;

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
        console.error('Error al cargar usuario del localStorage:', error);
        localStorage.removeItem('usuarioActual');
      }
    }
  }

  login(username: string, password: string): Observable<Usuario> {
    console.log('🚀 Iniciando autenticación...');
    console.log('📧 Username length:', username?.length || 0);
    console.log('🔒 Password length:', password?.length || 0);
    console.log('🌐 Endpoint:', `${apiUrl}/auth/login`);
  
    // Codificar en base64
    const usernameBase64 = btoa(username);
    const passwordBase64 = btoa(password);
  
    const body = new HttpParams()
      .set('username', usernameBase64)
      .set('password', passwordBase64);
      
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    
    const loginUrl = `${apiUrl}/auth/login`;
    
    console.log('📤 Enviando petición de autenticación...');
    
    return this.http.post<LoginResponse>(
      loginUrl,
      body.toString(),
      { headers }
    ).pipe(
      switchMap((loginResponse: LoginResponse) => {
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
            console.log('✅ Información del usuario obtenida');
            console.log('👤 Usuario ID:', usuarioInfo.id);
            console.log('📧 Email:', usuarioInfo.email);
            console.log('🏷️ Nombre:', usuarioInfo.nombre);
            console.log('🎯 Roles:', usuarioInfo.roles);
            
            // ✅ MAPEO CORRECTO DE ROLES
            let rolesArray = [];
            if (Array.isArray(usuarioInfo.roles)) {
              rolesArray = usuarioInfo.roles;
            } else if (typeof usuarioInfo.roles === 'string') {
              rolesArray = [usuarioInfo.roles];
            } else {
              rolesArray = ['operario']; // Rol por defecto
            }
            
            const usuarioCompleto: Usuario = {
              id: usuarioInfo.id?.toString() || 'temp',
              nombre: usuarioInfo.nombre || usuarioInfo.email || username, // ✅ Usar 'nombre' en lugar de 'nombreUsuario'
              email: usuarioInfo.email || '',
              roles: rolesArray,
              token: loginResponse.access_token,
              access_token: loginResponse.access_token
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
              nombre: username, // ✅ Usar 'nombre'
              email: username,
              roles: ['operario'], // ✅ Array de roles
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
        console.error('❌ Error en autenticación');
        console.error('📊 Status:', error.status);
        console.error('📊 StatusText:', error.statusText);
        
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

  logout(): void {
    this.cerrarSesion();
  }

  obtenerUsuarioActual(): Usuario | null {
    return this.usuarioActualSubject.value;
  }

  getCurrentUser(): Usuario | null {
    return this.obtenerUsuarioActual();
  }

  estaAutenticado(): boolean {
    const usuario = this.usuarioActualSubject.value;
    return !!usuario && !!usuario.access_token;
  }

  isAuthenticated(): boolean {
    return this.estaAutenticado();
  }

  // ✅ MÉTODOS DE ROLES CORREGIDOS
  esAdministrador(): boolean {
    const usuario = this.usuarioActualSubject.value;
    if (!usuario || !usuario.roles) return false;
    
    return usuario.roles.some(role => 
      ['administrador', 'admin'].includes(role.toLowerCase())
    );
  }

  esOperario(): boolean {
    const usuario = this.usuarioActualSubject.value;
    if (!usuario || !usuario.roles) return false;
    
    return usuario.roles.some(role => 
      ['operario', 'operator', 'user'].includes(role.toLowerCase())
    );
  }

  hasRole(role: string): boolean {
    const usuario = this.usuarioActualSubject.value;
    if (!usuario || !usuario.roles) return false;
    
    return usuario.roles.some(userRole => 
      userRole.toLowerCase() === role.toLowerCase()
    );
  }

  obtenerTokenAuth(): string | null {
    const usuario = this.usuarioActualSubject.value;
    return usuario?.access_token || usuario?.token || null;
  }

  refrescarToken(): Observable<Usuario> {
    return throwError(
      () => new Error('Token refresh no disponible en modo simulado')
    );
  }

  private obtenerInformacionUsuario(token: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.get<any>(`${apiUrl}/auth/me`, { headers }).pipe(
      tap((userInfo) => {
        console.log('✅ Usuario obtenido de /auth/me:', userInfo);
      }),
      catchError((error) => {
        console.warn('⚠️ Error al obtener información del usuario desde /auth/me:', error);
        throw error;
      })
    );
  }
}