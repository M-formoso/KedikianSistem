// src/app/core/services/api/maquina.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root'
})
export class MaquinaService extends BaseApiService {
  // Endpoint según tu archivo txt
  private readonly endpoint = '/maquinas';

  // Obtener todas las máquinas
  getMaquinas(params?: any): Observable<any> {
    return this.get(this.endpoint, params);
  }

  // Obtener máquina por ID
  getMaquina(id: number): Observable<any> {
    return this.get(`${this.endpoint}/${id}`);
  }

  // Crear nueva máquina
  createMaquina(data: any): Observable<any> {
    return this.post(this.endpoint, data);
  }

  // Actualizar máquina
  updateMaquina(id: number, data: any): Observable<any> {
    return this.put(`${this.endpoint}/${id}`, data);
  }

  // Eliminar máquina
  deleteMaquina(id: number): Observable<any> {
    return this.delete(`${this.endpoint}/${id}`);
  }

  // Obtener máquinas disponibles
  getMaquinasDisponibles(): Observable<any> {
    return this.get(this.endpoint, { estado: 'disponible' });
  }

  // Obtener máquinas por tipo
  getMaquinasPorTipo(tipo: string): Observable<any> {
    return this.get(this.endpoint, { tipo: tipo });
  }

  // Cambiar estado de máquina
  cambiarEstadoMaquina(id: number, estado: string): Observable<any> {
    return this.put(`${this.endpoint}/${id}/estado`, { estado: estado });
  }

  // Obtener máquinas en mantenimiento
  getMaquinasEnMantenimiento(): Observable<any> {
    return this.get(this.endpoint, { estado: 'mantenimiento' });
  }
}