// src/app/core/services/api/arrendamiento.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root'
})
export class ArrendamientoService extends BaseApiService {
  // Endpoint según tu archivo txt
  private readonly endpoint = '/arrendamientos';

  // Obtener todos los arrendamientos
  getArrendamientos(params?: any): Observable<any> {
    return this.get(this.endpoint, params);
  }

  // Obtener arrendamiento por ID
  getArrendamiento(id: number): Observable<any> {
    return this.get(`${this.endpoint}/${id}`);
  }

  // Crear nuevo arrendamiento
  createArrendamiento(data: any): Observable<any> {
    return this.post(this.endpoint, data);
  }

  // Actualizar arrendamiento
  updateArrendamiento(id: number, data: any): Observable<any> {
    return this.put(`${this.endpoint}/${id}`, data);
  }

  // Eliminar arrendamiento
  deleteArrendamiento(id: number): Observable<any> {
    return this.delete(`${this.endpoint}/${id}`);
  }

  // Obtener arrendamientos por usuario
  getArrendamientosPorUsuario(usuarioId: number): Observable<any> {
    return this.get(this.endpoint, { usuario_id: usuarioId });
  }

  // Obtener arrendamientos por máquina
  getArrendamientosPorMaquina(maquinaId: number): Observable<any> {
    return this.get(this.endpoint, { maquina_id: maquinaId });
  }

  // Obtener arrendamientos por estado
  getArrendamientosPorEstado(estado: string): Observable<any> {
    return this.get(this.endpoint, { estado: estado });
  }

  // Obtener arrendamientos activos
  getArrendamientosActivos(): Observable<any> {
    return this.get(this.endpoint, { estado: 'activo' });
  }
}