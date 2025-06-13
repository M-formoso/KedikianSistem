// src/app/core/services/api/usuario.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService extends BaseApiService {
  // Endpoint según tu archivo txt
  private readonly endpoint = '/usuarios';

  // Obtener todos los usuarios
  getUsuarios(params?: any): Observable<any> {
    return this.get(this.endpoint, params);
  }

  // Obtener usuario por ID
  getUsuario(id: number): Observable<any> {
    return this.get(`${this.endpoint}/${id}`);
  }

  // Crear nuevo usuario
  createUsuario(data: any): Observable<any> {
    return this.post(this.endpoint, data);
  }

  // Actualizar usuario
  updateUsuario(id: number, data: any): Observable<any> {
    return this.put(`${this.endpoint}/${id}`, data);
  }

  // Eliminar usuario
  deleteUsuario(id: number): Observable<any> {
    return this.delete(`${this.endpoint}/${id}`);
  }

  // Buscar usuarios
  searchUsuarios(query: string): Observable<any> {
    return this.get(this.endpoint, { search: query });
  }

  // Obtener usuarios por rol
  getUsuariosPorRol(rol: string): Observable<any> {
    return this.get(this.endpoint, { rol: rol });
  }

  getCurrentUser(): Observable<any> {
    return this.get('/usuarios/current');
  }
  
  getActiveUsers(): Observable<any> {
    return this.getUsuarios({ activo: true });
  }


}

