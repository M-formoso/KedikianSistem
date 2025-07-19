// src/app/eviromet.ts/usiario.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseApiService, ApiResponse, PaginatedResponse } from './base-api.service';

// Interfaces que coinciden con tu modelo de backend
export interface Usuario {
  id?: number;
  nombre: string;
  email: string;
  hash_contrasena?: string;
  estado: boolean;
  roles: string; // En tu backend es string, no array
  fecha_creacion?: string;
  created?: string;
  updated?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService extends BaseApiService {
  // Endpoint según tu archivo txt
  private readonly endpoint = '/usuarios';

  // Obtener todos los usuarios con parámetros opcionales
  getUsuarios(params?: {
    page?: number;
    limit?: number;
    activo?: boolean;
    rol?: string;
    search?: string;
  }): Observable<any> {
    return this.get(this.endpoint, params);
  }

  // Obtener usuario por ID
  getUsuario(id: number): Observable<any> {
    return this.get(`${this.endpoint}/${id}`);
  }

  // Crear nuevo usuario
  createUsuario(data: Partial<Usuario>): Observable<any> {
    return this.post(this.endpoint, data);
  }

  // Actualizar usuario
  updateUsuario(id: number, data: Partial<Usuario>): Observable<any> {
    return this.put(`${this.endpoint}/${id}`, data);
  }

  // Eliminar usuario
  deleteUsuario(id: number): Observable<any> {
    return this.delete(`${this.endpoint}/${id}`);
  }

  // Buscar usuarios
  searchUsuarios(query: string): Observable<any> {
    return this.getUsuarios({ search: query });
  }

  // Obtener usuarios por rol
  getUsuariosPorRol(rol: string): Observable<any> {
    return this.getUsuarios({ rol: rol });
  }

  // Obtener usuarios activos
  getActiveUsers(): Observable<any> {
    return this.getUsuarios({ activo: true });
  }

  // Método para obtener usuario actual (simulado por ahora)
  getCurrentUser(): Observable<any> {
    // Tu backend no tiene este endpoint aún, pero lo simularemos
    // retornando el primer usuario operario que encuentre
    return this.getUsuariosPorRol('operario').pipe(
      map(response => {
        if (response && response.data && response.data.length > 0) {
          return {
            success: true,
            data: response.data[0],
            message: 'Usuario actual obtenido'
          };
        }
        // Si no hay usuarios operarios, crear uno mock
        return {
          success: true,
          data: {
            id: 1,
            nombre: 'Operario Mock',
            email: 'operario@test.com',
            estado: true,
            roles: 'operario',
            fecha_creacion: new Date().toISOString()
          },
          message: 'Usuario mock creado'
        };
      })
    );
  }

  // Método helper para obtener usuarios con filtros específicos del frontend
  getUsuariosOperarios(): Observable<any> {
    return this.getUsuariosPorRol('operario');
  }

  // Método helper para verificar si un usuario está activo
  isUsuarioActivo(usuario: Usuario): boolean {
    return usuario.estado === true;
  }

  // Método helper para formatear nombre completo
  getFullName(usuario: Usuario): string {
    return usuario.nombre || 'Usuario sin nombre';
  }

  // Método para validar email único (simulado)
  validateEmailUnique(email: string, excludeId?: number): Observable<boolean> {
    return this.getUsuarios({ search: email }).pipe(
      map(response => {
        if (response && response.data) {
          const users = response.data.filter((user: Usuario) => 
            user.email === email && (!excludeId || user.id !== excludeId)
          );
          return users.length === 0;
        }
        return true;
      })
    );
  }
}