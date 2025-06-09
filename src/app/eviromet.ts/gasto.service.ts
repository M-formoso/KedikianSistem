// src/app/core/services/api/gasto.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root'
})
export class GastoService extends BaseApiService {
  // Endpoint según tu archivo txt
  private readonly endpoint = '/gastos';

  // Obtener todos los gastos
  getGastos(params?: any): Observable<any> {
    return this.get(this.endpoint, params);
  }

  // Obtener gasto por ID
  getGasto(id: number): Observable<any> {
    return this.get(`${this.endpoint}/${id}`);
  }

  // Crear nuevo gasto
  createGasto(data: any): Observable<any> {
    return this.post(this.endpoint, data);
  }

  // Actualizar gasto
  updateGasto(id: number, data: any): Observable<any> {
    return this.put(`${this.endpoint}/${id}`, data);
  }

  // Eliminar gasto
  deleteGasto(id: number): Observable<any> {
    return this.delete(`${this.endpoint}/${id}`);
  }

  // Obtener gastos por proyecto
  getGastosPorProyecto(proyectoId: number): Observable<any> {
    return this.get(this.endpoint, { proyecto_id: proyectoId });
  }

  // Obtener gastos por categoría
  getGastosPorCategoria(categoria: string): Observable<any> {
    return this.get(this.endpoint, { categoria: categoria });
  }

  // Obtener gastos por rango de fechas
  getGastosPorFechas(fechaInicio: string, fechaFin: string): Observable<any> {
    return this.get(this.endpoint, { 
      fecha_inicio: fechaInicio, 
      fecha_fin: fechaFin 
    });
  }

  // Obtener total de gastos por proyecto
  getTotalGastosPorProyecto(proyectoId: number): Observable<any> {
    return this.get(`${this.endpoint}/total-proyecto/${proyectoId}`);
  }
}