import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';

export enum RolEnum {
  OPERARIO = 'operario',
  ADMINISTRADOR = 'administrador',
  SUPERVISOR = 'supervisor'
}

export interface Usuario {
  id?: number;
  nombre: string;
  email: string;
  hash_contrasena?: string;
  estado: boolean;
  roles: RolEnum;
  fecha_creacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService extends BaseApiService {
  private readonly endpoint = '/usuarios';

  /**
   * Obtener todos los usuarios
   */
  getUsuarios(params?: any): Observable<any> {
    return this.get(this.endpoint, params);
  }

  /**
   * Obtener usuario por ID
   */
  getUsuario(id: number): Observable<any> {
    return this.get(`${this.endpoint}/${id}`);
  }

  /**
   * Crear nuevo usuario
   */
  createUsuario(data: Partial<Usuario>): Observable<any> {
    return this.post(this.endpoint, data);
  }

  /**
   * Actualizar usuario
   */
  updateUsuario(id: number, data: Partial<Usuario>): Observable<any> {
    return this.put(`${this.endpoint}/${id}`, data);
  }

  /**
   * Eliminar usuario
   */
  deleteUsuario(id: number): Observable<any> {
    return this.delete(`${this.endpoint}/${id}`);
  }

  /**
   * Obtener usuarios activos
   */
  getActiveUsers(): Observable<any> {
    return this.getUsuarios().pipe(
      map(response => {
        let usuarios = [];
        
        if (response && response.success && response.data) {
          usuarios = response.data;
        } else if (Array.isArray(response)) {
          usuarios = response;
        } else {
          return { success: true, data: [] };
        }
        
        const activeUsers = usuarios.filter((user: Usuario) => user.estado === true);
        return { success: true, data: activeUsers };
      }),
      catchError(error => {
        console.error('Error obteniendo usuarios activos:', error);
        return of({ success: false, data: [], message: error.message });
      })
    );
  }

  /**
   * Obtener usuario actual (mock)
   */
  getCurrentUser(): Observable<any> {
    return this.getUsuarios().pipe(
      map(response => {
        let usuarios = [];
        
        if (Array.isArray(response)) {
          usuarios = response;
        } else if (response && response.data) {
          usuarios = response.data;
        }

        // Retornar el primer operario activo
        const operario = usuarios.find((u: Usuario) => 
          u.roles === 'operario' && u.estado === true
        );
        
        if (operario) {
          return {
            success: true,
            data: operario
          };
        }

        // Si no hay operarios, crear uno mock
        return {
          success: true,
          data: {
            id: 999,
            nombre: 'Operario Mock',
            email: 'operario@test.com',
            estado: true,
            roles: 'operario',
            fecha_creacion: new Date().toISOString()
          }
        };
      }),
      catchError(error => {
        console.error('Error obteniendo usuario actual:', error);
        return of({
          success: true,
          data: {
            id: 999,
            nombre: 'Operario Mock',
            email: 'operario@test.com',
            estado: true,
            roles: 'operario',
            fecha_creacion: new Date().toISOString()
          }
        });
      })
    );
  }
}