import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

@Injectable({
    providedIn: 'root'
  })
  export class ProductoService extends BaseApiService {
    private readonly endpoint = '/productos';
  
    getProductos(params?: any): Observable<any> {
      return this.get(this.endpoint, params);
    }
  
    getProducto(id: number): Observable<any> {
      return this.get(`${this.endpoint}/${id}`);
    }
  
    createProducto(data: any): Observable<any> {
      return this.post(this.endpoint, data);
    }
  
    updateProducto(id: number, data: any): Observable<any> {
      return this.put(`${this.endpoint}/${id}`, data);
    }
  
    deleteProducto(id: number): Observable<any> {
      return this.delete(`${this.endpoint}/${id}`);
    }
  
    getProductosBajoStock(): Observable<any> {
      return this.get(`${this.endpoint}/bajo-stock`);
    }
  
    getProductosPorCategoria(categoria: string): Observable<any> {
      return this.get(this.endpoint, { categoria: categoria });
    }
  }