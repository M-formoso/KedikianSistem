// src/app/services/auth.service.ts - SOLUCIÓN DEFINITIVA

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  estado: boolean;
  roles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<Usuario | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Al iniciar, verificar si hay sesión guardada
    this.loadStoredUser();
  }

  /**
   * ✅ Cargar usuario guardado al iniciar la app
   */
  private loadStoredUser(): void {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('current_user');
    
    if (token && userStr) {
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
   * ✅ CORREGIDO: Login que GUARDA el token
   */
  login(username: string, password: string): Observable<any> {
    console.log('🚀 Iniciando autenticación...');
    console.log('📧 Username length:', username.length);
    console.log('🔒 Password length:', password.length);

    // Codificar credenciales en base64
    const usernameEncoded = btoa(username);
    const passwordEncoded = btoa(password);

    // Crear body en formato x-www-form-urlencoded
    const body = new URLSearchParams();
    body.set('username', usernameEncoded);
    body.set('password', passwordEncoded);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    console.log('🌐 Endpoint:', `${this.apiUrl}/login`);
    console.log('📤 Enviando petición de autenticación...');

    return this.http.post<any>(`${this.apiUrl}/login`, body.toString(), { headers }).pipe(
      tap(response => {
        console.log('✅ Respuesta de autenticación recibida');
        console.log('🎫 Token type:', response.token_type);
        console.log('🎫 Token recibido:', response.access_token ? 'SÍ' : 'NO');

        // ✅ CRÍTICO: Guardar el token en localStorage
        if (response.access_token) {
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('token_type', response.token_type || 'bearer');
          console.log('💾 Token guardado en localStorage');
          console.log('🔐 Verificación - Token en storage:', localStorage.getItem('access_token') ? 'SÍ' : 'NO');
        } else {
          console.error('❌ No se recibió access_token en la respuesta');
        }

        // Obtener información del usuario
        this.getUserInfo().subscribe({
          next: (user) => {
            console.log('✅ Usuario obtenido de /auth/me:', user);
            this.setCurrentUser(user);
          },
          error: (error) => {
            console.error('❌ Error obteniendo usuario:', error);
          }
        });
      }),
      catchError(error => {
        console.error('❌ Error en login:', error);
        throw error;
      })
    );
  }

  /**
   * ✅ Obtener información del usuario autenticado
   */
  getUserInfo(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/me`).pipe(
      tap(user => {
        console.log('✅ Información del usuario obtenida');
        console.log('👤 Usuario ID:', user.id);
        console.log('📧 Email:', user.email);
        console.log('🏷️ Nombre:', user.nombre);
        console.log('🎯 Roles:', user.roles);
        console.log('✅ Estado activo:', user.estado);
      })
    );
  }

  /**
   * ✅ Establecer usuario actual
   */
  setCurrentUser(user: Usuario): void {
    this.currentUserSubject.next(user);
    localStorage.setItem('current_user', JSON.stringify(user));
    console.log('✅ Usuario autenticado y guardado correctamente');
  }

  /**
   * ✅ Obtener usuario actual
   */
  getCurrentUser(): Usuario | null {
    return this.currentUserSubject.value;
  }

  /**
   * ✅ Verificar si está autenticado
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    const hasToken = !!token;
    console.log('🔐 isAuthenticated - Token presente:', hasToken);
    return hasToken;
  }

  /**
   * ✅ Obtener token
   */
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * ✅ Verificar si tiene rol específico
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.roles) {
      return false;
    }
    return user.roles.includes(role);
  }

  /**
   * ✅ Logout
   */
  logout(): void {
    console.log('👋 Cerrando sesión...');
    this.clearSession();
    this.router.navigate(['/login']);
  }

  /**
   * ✅ Limpiar sesión
   */
  private clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
    console.log('🧹 Sesión limpiada');
  }

  /**
   * ✅ Verificar si es admin
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * ✅ Verificar si es operario
   */
  isOperator(): boolean {
    return this.hasRole('operario');
  }

  // ============================================
  // ✅ ALIAS EN ESPAÑOL PARA COMPATIBILIDAD
  // ============================================

  /**
   * Alias: obtenerUsuarioActual
   */
  obtenerUsuarioActual(): Usuario | null {
    return this.getCurrentUser();
  }

  /**
   * Alias: cerrarSesion
   */
  cerrarSesion(): void {
    this.logout();
  }

  /**
   * Alias: estaAutenticado
   */
  estaAutenticado(): boolean {
    return this.isAuthenticated();
  }

  /**
   * Alias: obtenerToken
   */
  obtenerToken(): string | null {
    return this.getToken();
  }

  /**
   * Alias: tieneRol
   */
  tieneRol(role: string): boolean {
    return this.hasRole(role);
  }

  /**
   * Alias: esAdmin
   */
  esAdmin(): boolean {
    return this.isAdmin();
  }

  /**
   * Alias: esOperario
   */
  esOperario(): boolean {
    return this.isOperator();
  }

  /**
   * Alias: obtenerInformacionUsuario
   */
  obtenerInformacionUsuario(): Observable<Usuario> {
    return this.getUserInfo();
  }

  /**
   * Alias: establecerUsuarioActual
   */
  establecerUsuarioActual(user: Usuario): void {
    this.setCurrentUser(user);
  }
}