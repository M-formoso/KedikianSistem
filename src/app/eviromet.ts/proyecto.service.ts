import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({
    providedIn: 'root'
  })
  export class ProyectoService extends BaseApiService {
    private readonly endpoint = '/proyectos';
  
    getProyectos(params?: any): Observable<any> {
      return this.get(this.endpoint, params);
    }
  
    getProyecto(id: number): Observable<any> {
      return this.get(`${this.endpoint}/${id}`);
    }
  
    createProyecto(data: any): Observable<any> {
      return this.post(this.endpoint, data);
    }
  
    updateProyecto(id: number, data: any): Observable<any> {
      return this.put(`${this.endpoint}/${id}`, data);
    }
  
    deleteProyecto(id: number): Observable<any> {
      return this.delete(`${this.endpoint}/${id}`);
    }
  
    getProyectosActivos(): Observable<any> {
      return this.get(this.endpoint, { estado: 'en_progreso' });
    }
  
    getProyectosPorCliente(clienteId: number): Observable<any> {
      return this.get(this.endpoint, { cliente_id: clienteId });
    }
  }