import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({
    providedIn: 'root'
  })
  export class ReporteLaboralService extends BaseApiService {
    private readonly endpoint = '/reportes-laborales';
  
    getReportes(params?: any): Observable<any> {
      return this.get(this.endpoint, params);
    }
  
    getReporte(id: number): Observable<any> {
      return this.get(`${this.endpoint}/${id}`);
    }
  
    createReporte(data: any): Observable<any> {
      return this.post(this.endpoint, data);
    }
  
    updateReporte(id: number, data: any): Observable<any> {
      return this.put(`${this.endpoint}/${id}`, data);
    }
  
    deleteReporte(id: number): Observable<any> {
      return this.delete(`${this.endpoint}/${id}`);
    }
  
    getReportesPorUsuario(usuarioId: number): Observable<any> {
      return this.get(this.endpoint, { usuario_id: usuarioId });
    }
  
    getReportesPorProyecto(proyectoId: number): Observable<any> {
      return this.get(this.endpoint, { proyecto_id: proyectoId });
    }
  
    aprobarReporte(id: number): Observable<any> {
      return this.put(`${this.endpoint}/${id}/aprobar`, {});
    }
  
    rechazarReporte(id: number, motivo: string): Observable<any> {
      return this.put(`${this.endpoint}/${id}/rechazar`, { motivo: motivo });
    }
  }