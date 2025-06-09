import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({
    providedIn: 'root'
  })
  export class PagoService extends BaseApiService {
    private readonly endpoint = '/pagos';
  
    getPagos(params?: any): Observable<any> {
      return this.get(this.endpoint, params);
    }
  
    getPago(id: number): Observable<any> {
      return this.get(`${this.endpoint}/${id}`);
    }
  
    createPago(data: any): Observable<any> {
      return this.post(this.endpoint, data);
    }
  
    updatePago(id: number, data: any): Observable<any> {
      return this.put(`${this.endpoint}/${id}`, data);
    }
  
    deletePago(id: number): Observable<any> {
      return this.delete(`${this.endpoint}/${id}`);
    }
  
    getPagosPendientes(): Observable<any> {
      return this.get(this.endpoint, { estado: 'pendiente' });
    }
  
    getPagosPorContrato(contratoId: number): Observable<any> {
      return this.get(this.endpoint, { contrato_id: contratoId });
    }
  }