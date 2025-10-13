// src/app/core/services/auth.service.ts - COPIADO DEL ADMIN QUE FUNCIONA

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  estado: boolean;
  roles: string[];
  token?: string;
  access_token?: string;
}

// Interfaz para la respuesta del login OAuth2
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<Usuario | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private tokenCheckInterval: any = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadStoredUser();
    this.startTokenExpirationCheck();
  }

  private startTokenExpirationCheck(): void {
    this.tokenCheckInterval = setInterval(() => {
      if (this.hasValidToken() && this.isTokenExpiringSoon()) {
        console.warn('⚠️ Token próximo a expirar - cerrando sesión preventivamente');
        this.logout();
      }
    }, 120000);
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem('access_token');
    if (!token) return false;
    
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return false;
    
    const expirationTime = decoded.exp * 1000;
    const now = Date.now();
    
    return now < expirationTime;
  }

  private decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('❌ Error decodificando token:', error);
      return null;
    }
  }

  private isTokenExpiringSoon(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return false;
    
    const expirationTime = decoded.exp * 1000;
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    
    return (expirationTime - now) < tenMinutes;
  }

  private loadStoredUser(): void {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('current_user');
    
    if (token && userStr) {
      const decoded = this.decodeToken(token);
      if (decoded && decoded.exp) {
        const expirationTime = decoded.exp * 1000;
        const now = Date.now();
        
        if (now >= expirationTime) {
          console.log('❌ Token expirado al cargar - limpiando sesión');
          this.clearSession();
          return;
        }
      }
      
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
        console.log('✅ Sesión restaurada:', user);
      } catch (e) {
        console.error('❌ Error restaurando sesión:', e);
        this.clearSession();
      }
    }
  }

  /**
   * ✅ COPIADO DEL ADMIN - Login que FUNCIONA
   */
  login(username: string, password: string): Observable<Usuario> {
    console.log('🚀 Iniciando autenticación...');
    console.log('📧 Username length:', username?.length || 0);
    console.log('🔒 Password length:', password?.length || 0);
    console.log('🌐 Endpoint:', `${this.apiUrl}/login`);

    // ✅ Codificar en base64 IGUAL que el admin
    const usernameBase64 = btoa(username);
    const passwordBase64 = btoa(password);

    // ✅ Usar HttpParams IGUAL que el admin
    const body = new HttpParams()
      .set('username', usernameBase64)
      .set('password', passwordBase64);
      
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    
    console.log('📤 Enviando petición de autenticación...');
    
    // ✅ IGUAL que el admin: primero obtener token, luego info de usuario
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      body.toString(),
      { headers }
    ).pipe(
      switchMap((loginResponse: LoginResponse) => {
        console.log('✅ Respuesta de autenticación recibida');
        console.log('🎫 Token type:', loginResponse.token_type);
        console.log('🎫 Token recibido:', loginResponse.access_token ? 'SÍ' : 'NO');
        
        // Guardar token inmediatamente
        localStorage.setItem('access_token', loginResponse.access_token);
        localStorage.setItem('token_type', loginResponse.token_type);
        
        // Guardar tiempo de expiración
        try {
          const decoded = this.decodeToken(loginResponse.access_token);
          if (decoded && decoded.exp) {
            const expiresAt = decoded.exp * 1000;
            localStorage.setItem('token_expires_at', expiresAt.toString());
            console.log('💾 Token expira:', new Date(expiresAt));
          }
        } catch (error) {
          console.warn('⚠️ No se pudo calcular expiración');
        }
        
        // Obtener información del usuario
        return this.getUserInfo(loginResponse.access_token).pipe(
          tap((usuarioInfo: any) => {
            console.log('✅ Información del usuario obtenida');
            console.log('👤 Usuario ID:', usuarioInfo.id);
            console.log('📧 Email:', usuarioInfo.email);
            console.log('🏷️ Nombre:', usuarioInfo.nombre);
            console.log('🎯 Roles:', usuarioInfo.roles);
            
            const usuarioCompleto: Usuario = {
              id: usuarioInfo.id,
              nombre: usuarioInfo.nombre,
              email: usuarioInfo.email,
              estado: usuarioInfo.estado,
              roles: usuarioInfo.roles || ['operario'],
              token: loginResponse.access_token,
              access_token: loginResponse.access_token
            };
            
            localStorage.setItem('current_user', JSON.stringify(usuarioCompleto));
            this.currentUserSubject.next(usuarioCompleto);
            
            console.log('✅ Usuario autenticado y guardado correctamente');
            
            return usuarioCompleto;
          }),
          catchError((error) => {
            console.warn('⚠️ No se pudo obtener información del usuario');
            console.warn('⚠️ Error status:', error.status);
            
            // Crear usuario por defecto
            const usuarioPorDefecto: Usuario = {
              id: 0,
              nombre: username,
              email: username,
              estado: true,
              roles: ['operario'],
              token: loginResponse.access_token,
              access_token: loginResponse.access_token
            };
            
            localStorage.setItem('current_user', JSON.stringify(usuarioPorDefecto));
            this.currentUserSubject.next(usuarioPorDefecto);
            
            console.log('✅ Usuario creado con datos por defecto');
            
            return of(usuarioPorDefecto);
          })
        );
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

  /**
   * ✅ Obtener información del usuario (con token como parámetro)
   */
  private getUserInfo(token: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.get<any>(`${this.apiUrl}/me`, { headers }).pipe(
      tap((userInfo) => {
        console.log('✅ Usuario obtenido de /auth/me:', userInfo);
      }),
      catchError((error) => {
        console.warn('⚠️ Error al obtener información del usuario:', error);
        throw error;
      })
    );
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      return false;
    }
    
    const decoded = this.decodeToken(token);
    if (decoded && decoded.exp) {
      const expirationTime = decoded.exp * 1000;
      const now = Date.now();
      
      if (now >= expirationTime) {
        console.log('❌ Token expirado - limpiando sesión');
        this.clearSession();
        return false;
      }
    }
    
    return true;
  }

  setCurrentUser(user: Usuario): void {
    this.currentUserSubject.next(user);
    localStorage.setItem('current_user', JSON.stringify(user));
  }

  getCurrentUser(): Usuario | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.roles) {
      return false;
    }
    return user.roles.includes(role);
  }

  logout(): void {
    console.log('👋 Cerrando sesión...');
    
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
    }
    
    this.clearSession();
    this.router.navigate(['/login']);
  }

  private clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('current_user');
    localStorage.removeItem('token_expires_at');
    this.currentUserSubject.next(null);
    console.log('🧹 Sesión limpiada');
  }

  isAdmin(): boolean {
    return this.hasRole('admin') || this.hasRole('administrador');
  }

  isOperator(): boolean {
    return this.hasRole('operario') || this.hasRole('user');
  }

  // Alias en español
  obtenerUsuarioActual(): Usuario | null {
    return this.getCurrentUser();
  }

  cerrarSesion(): void {
    this.logout();
  }

  estaAutenticado(): boolean {
    return this.isAuthenticated();
  }

  obtenerToken(): string | null {
    return this.getToken();
  }

  tieneRol(role: string): boolean {
    return this.hasRole(role);
  }

  esAdmin(): boolean {
    return this.isAdmin();
  }

  esOperario(): boolean {
    return this.isOperator();
  }

  obtenerInformacionUsuario(): Observable<Usuario> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('No hay token'));
    }
    return this.getUserInfo(token) as Observable<Usuario>;
  }

  establecerUsuarioActual(user: Usuario): void {
    this.setCurrentUser(user);
  }
}