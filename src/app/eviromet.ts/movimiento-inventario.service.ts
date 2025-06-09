import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({
    providedIn: 'root'
  })
  export class MovimientoInventarioService extends BaseApiService {
    private readonly endpoint = '/movimientos-inventario';
  
    getMovimientos(params?: any): Observable<any> {
      return this.get(this.endpoint, params);
    }
  
    getMovimiento(id: number): Observable<any> {
      return this.get(`${this.endpoint}/${id}`);
    }
  
    createMovimiento(data: any): Observable<any> {
      return this.post(this.endpoint, data);
    }
  
    updateMovimiento(id: number, data: any): Observable<any> {
      return this.put(`${this.endpoint}/${id}`, data);
    }
  
    deleteMovimiento(id: number): Observable<any> {
      return this.delete(`${this.endpoint}/${id}`);
    }
  
    getMovimientosPorProducto(productoId: number): Observable<any> {
      return this.get(this.endpoint, { producto_id: productoId });
    }
  
    getMovimientosPorTipo(tipo: string): Observable<any> {
      return this.get(this.endpoint, { tipo: tipo });
    }
  }