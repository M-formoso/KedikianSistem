import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface MachineHours {
  id?: number;
  date: string;
  machineType: string;
  machineId: string;
  startHour: number;
  endHour: number;
  totalHours: number;
  project: string;
  operator: string;
  fuelUsed: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MachineHoursRequest {
  date: string;
  machineType: string;
  machineId: string;
  startHour: number;
  endHour: number;
  totalHours?: number; // Agregado como opcional
  project: string;
  operator: string;
  fuelUsed?: number;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  status?: string;
  description?: string;
}

export interface MachineType {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export interface Machine {
  id: string;
  name: string;
  type: string;
  status?: string;
  capacity?: string;
  model?: string;
  year?: number;
}

export interface Operator {
  id: string;
  name: string;
  license?: string;
  status?: string;
  specialization?: string[];
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

export interface MachineHoursStats {
  totalHours: number;
  totalFuelUsed: number;
  averageHoursPerDay: number;
  mostUsedMachine: string;
  totalRecords: number;
  periodStart: string;
  periodEnd: string;
}

@Injectable({
  providedIn: 'root'
})
export class MachineHoursService {
  private apiUrl = `${environment.apiUrl}/machine-hours`;
  private catalogsUrl = `${environment.apiUrl}/catalogs`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  // CRUD Operations para Machine Hours
  
  /**
   * Crear un nuevo registro de horas de máquina
   */
  createMachineHours(machineHours: MachineHoursRequest): Observable<ApiResponse<MachineHours>> {
    // Calcular total de horas antes de enviar
    const payload = {
      ...machineHours,
      totalHours: this.calculateTotalHours(machineHours.startHour, machineHours.endHour)
    };

    return this.http.post<ApiResponse<MachineHours>>(
      `${this.apiUrl}`, 
      payload, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener todos los registros de horas de máquina con paginación
   */
  getMachineHours(page: number = 1, limit: number = 10, filters?: any): Observable<PaginatedResponse<MachineHours>> {
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

    return this.http.get<PaginatedResponse<MachineHours>>(
      `${this.apiUrl}`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener registros recientes (últimos 10)
   */
  getRecentMachineHours(limit: number = 10): Observable<ApiResponse<MachineHours[]>> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('recent', 'true');

    return this.http.get<ApiResponse<MachineHours[]>>(
      `${this.apiUrl}/recent`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener un registro específico por ID
   */
  getMachineHoursById(id: number): Observable<ApiResponse<MachineHours>> {
    return this.http.get<ApiResponse<MachineHours>>(
      `${this.apiUrl}/${id}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualizar un registro existente
   */
  updateMachineHours(id: number, machineHours: Partial<MachineHoursRequest>): Observable<ApiResponse<MachineHours>> {
    // Recalcular total de horas si se actualizan las horas de inicio o fin
    let payload = { ...machineHours };
    if (machineHours.startHour !== undefined && machineHours.endHour !== undefined) {
      payload = {
        ...payload,
        totalHours: this.calculateTotalHours(machineHours.startHour, machineHours.endHour)
      };
    }

    return this.http.put<ApiResponse<MachineHours>>(
      `${this.apiUrl}/${id}`, 
      payload, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Eliminar un registro
   */
  deleteMachineHours(id: number): Observable<ApiResponse<any>> {
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
   * Obtener tipos de máquinas
   */
  getMachineTypes(): Observable<ApiResponse<MachineType[]>> {
    return this.http.get<ApiResponse<MachineType[]>>(
      `${this.catalogsUrl}/machine-types`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener lista de máquinas disponibles
   */
  getMachines(): Observable<ApiResponse<Machine[]>> {
    return this.http.get<ApiResponse<Machine[]>>(
      `${this.catalogsUrl}/machines`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener máquinas por tipo
   */
  getMachinesByType(machineTypeId: string): Observable<ApiResponse<Machine[]>> {
    return this.http.get<ApiResponse<Machine[]>>(
      `${this.catalogsUrl}/machines/by-type/${machineTypeId}`
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

  /**
   * Obtener operadores disponibles para un tipo de máquina específico
   */
  getOperatorsByMachineType(machineTypeId: string): Observable<ApiResponse<Operator[]>> {
    return this.http.get<ApiResponse<Operator[]>>(
      `${this.catalogsUrl}/operators/by-machine-type/${machineTypeId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Métodos de reportes y estadísticas

  /**
   * Obtener registros por rango de fechas
   */
  getMachineHoursByDateRange(startDate: string, endDate: string): Observable<ApiResponse<MachineHours[]>> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<ApiResponse<MachineHours[]>>(
      `${this.apiUrl}/by-date-range`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener registros por proyecto
   */
  getMachineHoursByProject(projectId: string): Observable<ApiResponse<MachineHours[]>> {
    return this.http.get<ApiResponse<MachineHours[]>>(
      `${this.apiUrl}/by-project/${projectId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener registros por máquina específica
   */
  getMachineHoursByMachine(machineId: string): Observable<ApiResponse<MachineHours[]>> {
    return this.http.get<ApiResponse<MachineHours[]>>(
      `${this.apiUrl}/by-machine/${machineId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener registros por operador
   */
  getMachineHoursByOperator(operatorId: string): Observable<ApiResponse<MachineHours[]>> {
    return this.http.get<ApiResponse<MachineHours[]>>(
      `${this.apiUrl}/by-operator/${operatorId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener estadísticas de horas de máquina
   */
  getMachineHoursStats(period?: string, filters?: any): Observable<ApiResponse<MachineHoursStats>> {
    let params = new HttpParams();
    
    if (period) {
      params = params.set('period', period);
    }

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params = params.set(key, filters[key]);
        }
      });
    }
    
    return this.http.get<ApiResponse<MachineHoursStats>>(
      `${this.apiUrl}/stats`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener resumen de horas por máquina en un período
   */
  getHoursSummaryByMachine(startDate: string, endDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrl}/summary/by-machine`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener consumo de combustible por período
   */
  getFuelConsumptionReport(startDate: string, endDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrl}/fuel-consumption`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Métodos de validación

  /**
   * Validar disponibilidad de máquina
   */
  validateMachineAvailability(machineId: string, date: string, startHour: number, endHour: number): Observable<ApiResponse<boolean>> {
    const params = new HttpParams()
      .set('machineId', machineId)
      .set('date', date)
      .set('startHour', startHour.toString())
      .set('endHour', endHour.toString());

    return this.http.get<ApiResponse<boolean>>(
      `${this.apiUrl}/validate-machine`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Validar disponibilidad de operador
   */
  validateOperatorAvailability(operatorId: string, date: string, startHour: number, endHour: number): Observable<ApiResponse<boolean>> {
    const params = new HttpParams()
      .set('operatorId', operatorId)
      .set('date', date)
      .set('startHour', startHour.toString())
      .set('endHour', endHour.toString());

    return this.http.get<ApiResponse<boolean>>(
      `${this.apiUrl}/validate-operator`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Validar que las horas de fin sean mayores a las de inicio
   */
  validateHourSequence(startHour: number, endHour: number): boolean {
    return endHour > startHour;
  }

  /**
   * Validar lectura de horómetro (que no sea menor a la última lectura registrada)
   */
  validateHourMeterReading(machineId: string, hourReading: number): Observable<ApiResponse<boolean>> {
    const params = new HttpParams()
      .set('machineId', machineId)
      .set('hourReading', hourReading.toString());

    return this.http.get<ApiResponse<boolean>>(
      `${this.apiUrl}/validate-hour-meter`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Métodos de utilidad

  /**
   * Calcular total de horas trabajadas
   */
  calculateTotalHours(startHour: number, endHour: number): number {
    if (endHour <= startHour) {
      return 0;
    }
    return Math.round((endHour - startHour) * 100) / 100; // Redondear a 2 decimales
  }

  /**
   * Calcular eficiencia de combustible (horas por litro)
   */
  calculateFuelEfficiency(totalHours: number, fuelUsed: number): number {
    if (fuelUsed <= 0) {
      return 0;
    }
    return Math.round((totalHours / fuelUsed) * 100) / 100;
  }

  /**
   * Formatear horas para mostrar (ejemplo: 2450.5 → "2450.5 hrs")
   */
  formatHours(hours: number): string {
    return `${hours.toFixed(1)} hrs`;
  }

  /**
   * Obtener la última lectura de horómetro para una máquina
   */
  getLastHourMeterReading(machineId: string): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(
      `${this.apiUrl}/last-hour-meter/${machineId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Manejo de errores
  private handleError(error: any): Observable<never> {
    console.error('Error en MachineHoursService:', error);
    
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
        case 409:
          errorMessage = 'Conflicto: La máquina u operador ya está asignado en ese horario.';
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