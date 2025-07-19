import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { UsuarioService, Usuario } from '../../eviromet.ts/usiario.service';

// Extender la interfaz Usuario para agregar el token
export interface UsuarioConToken extends Usuario {
  token?: string; // Para el frontend
}

// Alias para mantener compatibilidad con componentes que usan inglés
export type User = UsuarioConToken;

export interface CredencialesLogin {
  nombreUsuario: string;
  contraseña: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private usuarioActualSubject = new BehaviorSubject<UsuarioConToken | null>(null);
  public usuarioActual$ = this.usuarioActualSubject.asObservable();
  
  // Alias para componentes que usan nombres en inglés
  public currentUser$ = this.usuarioActual$;

  constructor(
    private router: Router,
    private usuarioService: UsuarioService
  ) {
    this.cargarUsuarioDesdeAlmacenamiento();
  }

  private cargarUsuarioDesdeAlmacenamiento(): void {
    const usuarioAlmacenado = localStorage.getItem('usuarioActual');
    if (usuarioAlmacenado) {
      try {
        const usuario = JSON.parse(usuarioAlmacenado);
        this.usuarioActualSubject.next(usuario);
        
        // Verificar si el usuario sigue siendo válido en el backend
        this.verificarUsuarioValido(usuario.id);
      } catch (error) {
        localStorage.removeItem('usuarioActual');
      }
    }
  }

  /**
   * Verificar si el usuario almacenado sigue siendo válido
   */
  private verificarUsuarioValido(userId: number): void {
    this.usuarioService.getUsuario(userId).subscribe({
      next: (response: any) => {
        let usuario = null;
        if (response && response.success && response.data) {
          usuario = response.data;
        } else if (response && response.id) {
          usuario = response;
        }

        if (!usuario || !usuario.estado) {
          // Usuario no válido, cerrar sesión
          this.cerrarSesion();
        }
      },
      error: () => {
        // Error al verificar, cerrar sesión por seguridad
        this.cerrarSesion();
      }
    });
  }

  /**
   * Método de login mejorado que conecta con el backend
   */
  login(username: string, password: string): Observable<UsuarioConToken> {
    return this.iniciarSesion({
      nombreUsuario: username,
      contraseña: password
    });
  }

  private iniciarSesion(credenciales: CredencialesLogin): Observable<UsuarioConToken> {
    // Por ahora mantenemos el sistema mock pero mejorado
    // TODO: Implementar autenticación real cuando el backend tenga JWT
    
    return this.usuarioService.getUsuarios({ search: credenciales.nombreUsuario }).pipe(
      map((response: any) => {
        let usuarios = [];
        
        if (response && response.success && response.data) {
          usuarios = response.data;
        } else if (Array.isArray(response)) {
          usuarios = response;
        }

        // Buscar usuario por nombre o email
        const usuario = usuarios.find((u: Usuario) => 
          u.nombre.toLowerCase() === credenciales.nombreUsuario.toLowerCase() ||
          u.email.toLowerCase() === credenciales.nombreUsuario.toLowerCase()
        );

        if (usuario && usuario.estado) {
          // Por ahora, aceptamos cualquier contraseña que no esté vacía
          // TODO: Implementar verificación real de contraseña
          if (credenciales.contraseña && credenciales.contraseña.trim() !== '') {
            const usuarioConToken: UsuarioConToken = {
              ...usuario,
              token: 'fake-jwt-token-' + usuario.id
            };

            localStorage.setItem('usuarioActual', JSON.stringify(usuarioConToken));
            this.usuarioActualSubject.next(usuarioConToken);
            
            return usuarioConToken;
          }
        }

        // Si no encontramos usuario o credenciales inválidas, crear usuario mock para testing
        if (credenciales.nombreUsuario === 'operario' && credenciales.contraseña === '1234') {
          return this.crearUsuarioMockOperario();
        }

        if (credenciales.nombreUsuario === 'admin' && credenciales.contraseña === '1234') {
          return this.crearUsuarioMockAdmin();
        }

        throw new Error('Credenciales inválidas');
      }),
      catchError((error) => {
        console.error('Error en login:', error);
        return throwError(() => new Error('Error al iniciar sesión: ' + error.message));
      })
    );
  }

  /**
   * Crear usuario mock para operario (fallback)
   */
  private crearUsuarioMockOperario(): UsuarioConToken {
    const mockOperario: UsuarioConToken = {
      id: 999,
      nombre: 'Operario Test',
      email: 'operario@test.com',
      estado: true,
      roles: 'operario',
      fecha_creacion: new Date().toISOString(),
      token: 'fake-jwt-token-operario'
    };

    localStorage.setItem('usuarioActual', JSON.stringify(mockOperario));
    this.usuarioActualSubject.next(mockOperario);
    
    return mockOperario;
  }

  /**
   * Crear usuario mock para admin (fallback)
   */
  private crearUsuarioMockAdmin(): UsuarioConToken {
    const mockAdmin: UsuarioConToken = {
      id: 998,
      nombre: 'Admin Test',
      email: 'admin@test.com',
      estado: true,
      roles: 'administrador',
      fecha_creacion: new Date().toISOString(),
      token: 'fake-jwt-token-admin'
    };

    localStorage.setItem('usuarioActual', JSON.stringify(mockAdmin));
    this.usuarioActualSubject.next(mockAdmin);
    
    return mockAdmin;
  }

  /**
   * Cerrar sesión
   */
  cerrarSesion(): void {
    localStorage.removeItem('usuarioActual');
    this.usuarioActualSubject.next(null);
    this.router.navigate(['/login']);
  }

  // Alias para cerrarSesion
  logout(): void {
    this.cerrarSesion();
  }

  /**
   * Obtener usuario actual
   */
  obtenerUsuarioActual(): UsuarioConToken | null {
    return this.usuarioActualSubject.value;
  }

  // Alias para obtenerUsuarioActual
  getCurrentUser(): UsuarioConToken | null {
    return this.obtenerUsuarioActual();
  }

  /**
   * Verificar si está autenticado
   */
  estaAutenticado(): boolean {
    const usuario = this.usuarioActualSubject.value;
    return !!usuario && !!usuario.token && usuario.estado;
  }

  // Alias para estaAutenticado
  isAuthenticated(): boolean {
    return this.estaAutenticado();
  }

  // Alias adicional que usan algunos componentes
  isLoggedIn(): boolean {
    return this.estaAutenticado();
  }

  /**
   * Verificar si es administrador
   */
  esAdministrador(): boolean {
    const usuario = this.usuarioActualSubject.value;
    return !!usuario && usuario.roles === 'administrador';
  }

  // Alias para esAdministrador
  isAdmin(): boolean {
    return this.esAdministrador();
  }

  /**
   * Verificar si es operario
   */
  esOperario(): boolean {
    const usuario = this.usuarioActualSubject.value;
    return !!usuario && usuario.roles === 'operario';
  }

  // Alias para esOperario
  isOperator(): boolean {
    return this.esOperario();
  }

  /**
   * Método para verificar rol específico
   */
  hasRole(role: string): boolean {
    const usuario = this.usuarioActualSubject.value;
    return !!usuario && usuario.roles === role;
  }

  /**
   * Obtener token de autenticación
   */
  obtenerTokenAuth(): string | null {
    const usuario = this.usuarioActualSubject.value;
    return usuario?.token || null;
  }

  /**
   * Refrescar token (simulado por ahora)
   */
  refrescarToken(): Observable<UsuarioConToken> {
    const usuario = this.usuarioActualSubject.value;
    
    if (usuario && usuario.id) {
      // Verificar que el usuario sigue siendo válido
      return this.usuarioService.getUsuario(usuario.id).pipe(
        map((response: any) => {
          let usuarioActualizado = null;
          
          if (response && response.success && response.data) {
            usuarioActualizado = response.data;
          } else if (response && response.id) {
            usuarioActualizado = response;
          }

          if (usuarioActualizado && usuarioActualizado.estado) {
            const usuarioConToken: UsuarioConToken = {
              ...usuarioActualizado,
              token: 'refreshed-token-' + usuarioActualizado.id
            };

            localStorage.setItem('usuarioActual', JSON.stringify(usuarioConToken));
            this.usuarioActualSubject.next(usuarioConToken);
            
            return usuarioConToken;
          } else {
            throw new Error('Usuario no válido');
          }
        }),
        catchError((error) => {
          this.cerrarSesion();
          return throwError(() => new Error('Error al refrescar token: ' + error.message));
        })
      );
    }

    return throwError(() => new Error('No hay usuario autenticado'));
  }

  /**
   * Registrar nuevo usuario (conecta con backend)
   */
  registrarUsuario(datosUsuario: {
    nombre: string;
    email: string;
    contraseña: string;
    roles?: string;
  }): Observable<UsuarioConToken> {
    const nuevoUsuario = {
      nombre: datosUsuario.nombre,
      email: datosUsuario.email,
      hash_contrasena: datosUsuario.contraseña, // En un sistema real, esto se hasharía
      estado: true,
      roles: datosUsuario.roles || 'operario',
      fecha_creacion: new Date().toISOString()
    };

    return this.usuarioService.createUsuario(nuevoUsuario).pipe(
      map((response: any) => {
        let usuarioCreado = null;
        
        if (response && response.success && response.data) {
          usuarioCreado = response.data;
        } else if (response && response.id) {
          usuarioCreado = response;
        }

        if (usuarioCreado) {
          return usuarioCreado;
        } else {
          throw new Error('Error al crear usuario');
        }
      }),
      catchError((error) => {
        console.error('Error registrando usuario:', error);
        return throwError(() => new Error('Error al registrar usuario: ' + error.message));
      })
    );
  }

  /**
   * Actualizar perfil del usuario actual
   */
  actualizarPerfil(datosActualizacion: Partial<Usuario>): Observable<UsuarioConToken> {
    const usuario = this.usuarioActualSubject.value;
    
    if (!usuario || !usuario.id) {
      return throwError(() => new Error('No hay usuario autenticado'));
    }

    return this.usuarioService.updateUsuario(usuario.id, datosActualizacion).pipe(
      map((response: any) => {
        let usuarioActualizado = null;
        
        if (response && response.success && response.data) {
          usuarioActualizado = response.data;
        } else if (response && response.id) {
          usuarioActualizado = response;
        }

        if (usuarioActualizado) {
          const usuarioConToken: UsuarioConToken = {
            ...usuarioActualizado,
            token: usuario.token
          };

          localStorage.setItem('usuarioActual', JSON.stringify(usuarioConToken));
          this.usuarioActualSubject.next(usuarioConToken);
          
          return usuarioConToken;
        } else {
          throw new Error('Error al actualizar usuario');
        }
      }),
      catchError((error) => {
        console.error('Error actualizando perfil:', error);
        return throwError(() => new Error('Error al actualizar perfil: ' + error.message));
      })
    );
  }

  /**
   * Cambiar contraseña (simulado)
   */
  cambiarContraseña(contraseñaActual: string, nuevaContraseña: string): Observable<boolean> {
    // TODO: Implementar cambio de contraseña real
    return of(true);
  }

  /**
   * Verificar permisos específicos
   */
  tienePermiso(permiso: string): boolean {
    const usuario = this.usuarioActualSubject.value;
    
    if (!usuario) return false;

    // Lógica básica de permisos basada en roles
    switch (permiso) {
      case 'crear_reportes':
      case 'editar_reportes_propios':
      case 'fichar_entrada_salida':
        return usuario.roles === 'operario' || usuario.roles === 'administrador';
      
      case 'ver_todos_reportes':
      case 'editar_todos_reportes':
      case 'administrar_usuarios':
      case 'ver_estadisticas':
        return usuario.roles === 'administrador';
      
      default:
        return false;
    }
  }

  /**
   * Obtener información del usuario para el header
   */
  getUsuarioParaHeader(): { nombre: string; rol: string; email: string } | null {
    const usuario = this.usuarioActualSubject.value;
    
    if (!usuario) return null;

    return {
      nombre: usuario.nombre,
      rol: usuario.roles === 'operario' ? 'Operario' : 'Administrador',
      email: usuario.email
    };
  }
}