import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AridosDelivery {
  id?: number;
  date: string;
  project: string;
  materialType: string;
  quantity: number;
  unit: string;
  vehicleId: string;
  operator: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AridosDeliveryRequest {
  date: string;
  project: string;
  materialType: string;
  quantity: number;
  unit: string;
  vehicleId: string;
  operator: string;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  status?: string;
  description?: string;
}

export interface MaterialType {
  id: string;
  name: string;
  description?: string;
  unit?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  capacity?: string;
  status?: string;
  type?: string;
}

export interface Operator {
  id: string;
  name: string;
  license?: string;
  status?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: any[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class EntregaAridosService {
  private apiUrl = `${environment.apiUrl}/entrega-aridos`;
  private catalogsUrl = `${environment.apiUrl}/catalogs`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  // CRUD Operations para Entrega de Áridos
  
  /**
   * Crear una nueva entrega de áridos
   */
  createDelivery(delivery: AridosDeliveryRequest): Observable<ApiResponse<AridosDelivery>> {
    return this.http.post<ApiResponse<AridosDelivery>>(
      `${this.apiUrl}`, 
      delivery, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener todas las entregas de áridos con paginación
   */
  getDeliveries(page: number = 1, limit: number = 10, filters?: any): Observable<PaginatedResponse<AridosDelivery>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    // Aplicar filtros si existen
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params = params.set(key, filters[key]);
        }
      });
    }

    return this.http.get<PaginatedResponse<AridosDelivery>>(
      `${this.apiUrl}`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener entregas recientes (últimas 10)
   */
  getRecentDeliveries(limit: number = 10): Observable<ApiResponse<AridosDelivery[]>> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('recent', 'true');

    return this.http.get<ApiResponse<AridosDelivery[]>>(
      `${this.apiUrl}/recent`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener una entrega específica por ID
   */
  getDeliveryById(id: number): Observable<ApiResponse<AridosDelivery>> {
    return this.http.get<ApiResponse<AridosDelivery>>(
      `${this.apiUrl}/${id}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualizar una entrega existente
   */
  updateDelivery(id: number, delivery: Partial<AridosDeliveryRequest>): Observable<ApiResponse<AridosDelivery>> {
    return this.http.put<ApiResponse<AridosDelivery>>(
      `${this.apiUrl}/${id}`, 
      delivery, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Eliminar una entrega
   */
  deleteDelivery(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.apiUrl}/${id}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Métodos para obtener catálogos/datos de referencia

  /**
   * Obtener lista de proyectos activos
   */
  getProjects(): Observable<ApiResponse<Project[]>> {
    return this.http.get<ApiResponse<Project[]>>(
      `${this.catalogsUrl}/projects`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener tipos de materiales
   */
  getMaterialTypes(): Observable<ApiResponse<MaterialType[]>> {
    return this.http.get<ApiResponse<MaterialType[]>>(
      `${this.catalogsUrl}/material-types`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener lista de vehículos disponibles
   */
  getVehicles(): Observable<ApiResponse<Vehicle[]>> {
    return this.http.get<ApiResponse<Vehicle[]>>(
      `${this.catalogsUrl}/vehicles`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener lista de operadores
   */
  getOperators(): Observable<ApiResponse<Operator[]>> {
    return this.http.get<ApiResponse<Operator[]>>(
      `${this.catalogsUrl}/operators`
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Métodos de reportes y estadísticas

  /**
   * Obtener entregas por fecha
   */
  getDeliveriesByDateRange(startDate: string, endDate: string): Observable<ApiResponse<AridosDelivery[]>> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<ApiResponse<AridosDelivery[]>>(
      `${this.apiUrl}/by-date-range`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener entregas por proyecto
   */
  getDeliveriesByProject(projectId: string): Observable<ApiResponse<AridosDelivery[]>> {
    return this.http.get<ApiResponse<AridosDelivery[]>>(
      `${this.apiUrl}/by-project/${projectId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener entregas por operador
   */
  getDeliveriesByOperator(operatorId: string): Observable<ApiResponse<AridosDelivery[]>> {
    return this.http.get<ApiResponse<AridosDelivery[]>>(
      `${this.apiUrl}/by-operator/${operatorId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener estadísticas de entregas
   */
  getDeliveryStats(period?: string): Observable<ApiResponse<any>> {
    const params = period ? new HttpParams().set('period', period) : new HttpParams();
    
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/stats`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Métodos de validación

  /**
   * Validar disponibilidad de vehículo
   */
  validateVehicleAvailability(vehicleId: string, date: string): Observable<ApiResponse<boolean>> {
    const params = new HttpParams()
      .set('vehicleId', vehicleId)
      .set('date', date);

    return this.http.get<ApiResponse<boolean>>(
      `${this.apiUrl}/validate-vehicle`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Validar disponibilidad de operador
   */
  validateOperatorAvailability(operatorId: string, date: string): Observable<ApiResponse<boolean>> {
    const params = new HttpParams()
      .set('operatorId', operatorId)
      .set('date', date);

    return this.http.get<ApiResponse<boolean>>(
      `${this.apiUrl}/validate-operator`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Manejo de errores
  private handleError(error: any): Observable<never> {
    console.error('Error en EntregaAridosService:', error);
    
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      switch (error.status) {
        case 400:
          errorMessage = 'Datos inválidos. Verifique la información ingresada.';
          break;
        case 401:
          errorMessage = 'No autorizado. Inicie sesión nuevamente.';
          break;
        case 403:
          errorMessage = 'No tiene permisos para realizar esta acción.';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado.';
          break;
        case 422:
          errorMessage = 'Error de validación. Verifique los datos ingresados.';
          break;
        case 500:
          errorMessage = 'Error interno del servidor. Intente nuevamente más tarde.';
          break;
        default:
          errorMessage = `Error ${error.status}: ${error.message}`;
      }
      
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}