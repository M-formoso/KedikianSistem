import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({
  providedIn: 'root'
})
export class ContratoService extends BaseApiService {
  private readonly endpoint = '/contratos';

  getContratos(params?: any): Observable<any> {
    return this.get(this.endpoint, params);
  }

  getContrato(id: number): Observable<any> {
    return this.get(`${this.endpoint}/${id}`);
  }

  createContrato(data: any): Observable<any> {
    return this.post(this.endpoint, data);
  }

  updateContrato(id: number, data: any): Observable<any> {
    return this.put(`${this.endpoint}/${id}`, data);
  }

  deleteContrato(id: number): Observable<any> {
    return this.delete(`${this.endpoint}/${id}`);
  }

  getContratosPorUsuario(usuarioId: number): Observable<any> {
    return this.get(this.endpoint, { usuario_id: usuarioId });
  }

  getContratosVigentes(): Observable<any> {
    return this.get(this.endpoint, { estado: 'vigente' });
  }
}