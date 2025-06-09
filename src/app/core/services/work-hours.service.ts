import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface WorkDay {
  id?: number;
  date: string;
  startTime: string;
  endTime: string;
  breakTime: number;
  totalHours: number;
  project: string;
  notes?: string;
  clockInTimestamp?: Date;
  clockOutTimestamp?: Date;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkDayRequest {
  date: string;
  startTime: string;
  endTime: string;
  breakTime: number;
  totalHours?: number; // Calculado automáticamente
  project: string;
  notes?: string;
  clockInTimestamp?: Date;
  clockOutTimestamp?: Date;
}

export interface ClockStatus {
  isActive: boolean;
  startTime: string;
  startTimestamp: Date;
  project: string;
  userId?: string;
}

export interface Project {
  id: string;
  name: string;
  status?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface Employee {
  id: string;
  name: string;
  position?: string;
  department?: string;
  status?: string;
  email?: string;
}

export interface WorkSchedule {
  id: string;
  employeeId: string;
  dayOfWeek: number; // 0 = domingo, 1 = lunes, etc.
  startTime: string;
  endTime: string;
  breakTime: number;
  isActive: boolean;
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

export interface WorkHoursStats {
  totalHours: number;
  totalDays: number;
  averageHoursPerDay: number;
  totalBreakTime: number;
  mostActiveProject: string;
  totalRecords: number;
  periodStart: string;
  periodEnd: string;
  overtimeHours: number;
}

export interface TimeTrackingSession {
  id?: number;
  employeeId: string;
  projectId: string;
  startTime: string;
  startTimestamp: Date;
  isActive: boolean;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WorkHoursService {
  private apiUrl = `${environment.apiUrl}/work-hours`;
  private catalogsUrl = `${environment.apiUrl}/catalogs`;
  private timeTrackingUrl = `${environment.apiUrl}/time-tracking`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  // CRUD Operations para Work Days

  /**
   * Crear un nuevo registro de jornada laboral
   */
  createWorkDay(workDay: WorkDayRequest): Observable<ApiResponse<WorkDay>> {
    // Calcular total de horas antes de enviar
    const payload = {
      ...workDay,
      totalHours: this.calculateTotalHours(workDay.startTime, workDay.endTime, workDay.breakTime)
    };

    return this.http.post<ApiResponse<WorkDay>>(
      `${this.apiUrl}`, 
      payload, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener todos los registros de jornadas laborales con paginación
   */
  getWorkDays(page: number = 1, limit: number = 10, filters?: any): Observable<PaginatedResponse<WorkDay>> {
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

    return this.http.get<PaginatedResponse<WorkDay>>(
      `${this.apiUrl}`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener registros recientes (últimos 10)
   */
  getRecentWorkDays(limit: number = 10): Observable<ApiResponse<WorkDay[]>> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('recent', 'true');

    return this.http.get<ApiResponse<WorkDay[]>>(
      `${this.apiUrl}/recent`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener un registro específico por ID
   */
  getWorkDayById(id: number): Observable<ApiResponse<WorkDay>> {
    return this.http.get<ApiResponse<WorkDay>>(
      `${this.apiUrl}/${id}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualizar un registro existente
   */
  updateWorkDay(id: number, workDay: Partial<WorkDayRequest>): Observable<ApiResponse<WorkDay>> {
    // Recalcular total de horas si se actualizan los tiempos
    let payload = { ...workDay };
    if (workDay.startTime && workDay.endTime && workDay.breakTime !== undefined) {
      payload = {
        ...payload,
        totalHours: this.calculateTotalHours(workDay.startTime, workDay.endTime, workDay.breakTime)
      };
    }

    return this.http.put<ApiResponse<WorkDay>>(
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
  deleteWorkDay(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.apiUrl}/${id}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Time Tracking Operations (Fichaje)

  /**
   * Fichar entrada
   */
  clockIn(projectId: string, notes?: string): Observable<ApiResponse<TimeTrackingSession>> {
    const payload = {
      projectId,
      notes,
      startTime: new Date().toISOString(),
      startTimestamp: new Date()
    };

    return this.http.post<ApiResponse<TimeTrackingSession>>(
      `${this.timeTrackingUrl}/clock-in`, 
      payload, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Fichar salida
   */
  clockOut(breakTime: number = 0, notes?: string): Observable<ApiResponse<WorkDay>> {
    const payload = {
      breakTime,
      notes,
      endTime: new Date().toISOString(),
      clockOutTimestamp: new Date()
    };

    return this.http.post<ApiResponse<WorkDay>>(
      `${this.timeTrackingUrl}/clock-out`, 
      payload, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener sesión activa de fichaje
   */
  getActiveClockIn(): Observable<ApiResponse<TimeTrackingSession | null>> {
    return this.http.get<ApiResponse<TimeTrackingSession | null>>(
      `${this.timeTrackingUrl}/active-session`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Cancelar sesión activa (en caso de error)
   */
  cancelActiveSession(): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.timeTrackingUrl}/active-session`
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
   * Obtener proyectos por estado
   */
  getProjectsByStatus(status: string): Observable<ApiResponse<Project[]>> {
    return this.http.get<ApiResponse<Project[]>>(
      `${this.catalogsUrl}/projects/by-status/${status}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener lista de empleados
   */
  getEmployees(): Observable<ApiResponse<Employee[]>> {
    return this.http.get<ApiResponse<Employee[]>>(
      `${this.catalogsUrl}/employees`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener horarios de trabajo configurados para un empleado
   */
  getWorkSchedule(employeeId: string): Observable<ApiResponse<WorkSchedule[]>> {
    return this.http.get<ApiResponse<WorkSchedule[]>>(
      `${this.catalogsUrl}/work-schedules/${employeeId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Métodos de reportes y estadísticas

  /**
   * Obtener registros por rango de fechas
   */
  getWorkDaysByDateRange(startDate: string, endDate: string): Observable<ApiResponse<WorkDay[]>> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<ApiResponse<WorkDay[]>>(
      `${this.apiUrl}/by-date-range`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener registros por proyecto
   */
  getWorkDaysByProject(projectId: string): Observable<ApiResponse<WorkDay[]>> {
    return this.http.get<ApiResponse<WorkDay[]>>(
      `${this.apiUrl}/by-project/${projectId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener registros por empleado
   */
  getWorkDaysByEmployee(employeeId: string): Observable<ApiResponse<WorkDay[]>> {
    return this.http.get<ApiResponse<WorkDay[]>>(
      `${this.apiUrl}/by-employee/${employeeId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener estadísticas de horas trabajadas
   */
  getWorkHoursStats(period?: string, filters?: any): Observable<ApiResponse<WorkHoursStats>> {
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
    
    return this.http.get<ApiResponse<WorkHoursStats>>(
      `${this.apiUrl}/stats`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener resumen de horas por proyecto en un período
   */
  getHoursSummaryByProject(startDate: string, endDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrl}/summary/by-project`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener reporte de asistencia
   */
  getAttendanceReport(startDate: string, endDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrl}/attendance-report`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener reporte de horas extras
   */
  getOvertimeReport(startDate: string, endDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrl}/overtime-report`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Métodos de validación

  /**
   * Validar que no existan registros duplicados para la misma fecha
   */
  validateDuplicateWorkDay(employeeId: string, date: string): Observable<ApiResponse<boolean>> {
    const params = new HttpParams()
      .set('employeeId', employeeId)
      .set('date', date);

    return this.http.get<ApiResponse<boolean>>(
      `${this.apiUrl}/validate-duplicate`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Validar horarios de trabajo (que no excedan límites legales)
   */
  validateWorkHours(startTime: string, endTime: string, breakTime: number): Observable<ApiResponse<any>> {
    const payload = { startTime, endTime, breakTime };

    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/validate-hours`, 
      payload, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Validar que el empleado no tenga una sesión activa
   */
  validateActiveSession(employeeId: string): Observable<ApiResponse<boolean>> {
    return this.http.get<ApiResponse<boolean>>(
      `${this.timeTrackingUrl}/validate-active/${employeeId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Métodos de utilidad

  /**
   * Calcular total de horas trabajadas (considerando tiempo de descanso)
   */
  calculateTotalHours(startTime: string, endTime: string, breakTime: number = 0): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    let totalMinutes = endMinutes - startMinutes - breakTime;
    
    if (totalMinutes < 0) {
      totalMinutes = 0;
    }
    
    return Math.round((totalMinutes / 60) * 100) / 100; // Redondear a 2 decimales
  }

  /**
   * Calcular tiempo transcurrido desde una hora específica
   */
  calculateElapsedTime(startTimestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - startTimestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    return `${hours}h ${mins}m`;
  }

  /**
   * Determinar si las horas trabajadas califican como horas extras
   */
  calculateOvertimeHours(totalHours: number, standardHours: number = 8): number {
    return totalHours > standardHours ? totalHours - standardHours : 0;
  }

  /**
   * Formatear tiempo para mostrar (HH:MM)
   */
  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }

  /**
   * Formatear horas para mostrar (ejemplo: 8.5 → "8.5 hrs")
   */
  formatHours(hours: number): string {
    return `${hours.toFixed(1)} hrs`;
  }

  /**
   * Obtener el horario estándar para un día específico
   */
  getStandardSchedule(employeeId: string, date: string): Observable<ApiResponse<WorkSchedule>> {
    const dayOfWeek = new Date(date).getDay();
    const params = new HttpParams()
      .set('employeeId', employeeId)
      .set('dayOfWeek', dayOfWeek.toString());

    return this.http.get<ApiResponse<WorkSchedule>>(
      `${this.catalogsUrl}/standard-schedule`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Validar formato de hora (HH:MM)
   */
  isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Validar que la hora de fin sea posterior a la de inicio
   */
  isValidTimeSequence(startTime: string, endTime: string): boolean {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return endMinutes > startMinutes;
  }

  // Métodos para localStorage (para funciones offline)

  /**
   * Guardar sesión activa en localStorage
   */
  saveActiveClockInLocally(clockStatus: ClockStatus): void {
    localStorage.setItem('activeClockIn', JSON.stringify(clockStatus));
  }

  /**
   * Obtener sesión activa del localStorage
   */
  getActiveClockInLocally(): ClockStatus | null {
    const saved = localStorage.getItem('activeClockIn');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Asegurar que startTimestamp sea un objeto Date
      parsed.startTimestamp = new Date(parsed.startTimestamp);
      return parsed;
    }
    return null;
  }

  /**
   * Limpiar sesión activa del localStorage
   */
  clearActiveClockInLocally(): void {
    localStorage.removeItem('activeClockIn');
  }

  // Manejo de errores
  private handleError(error: any): Observable<never> {
    console.error('Error en WorkHoursService:', error);
    
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
          errorMessage = 'Conflicto: Ya existe un registro para esta fecha o hay una sesión activa.';
          break;
        case 422:
          errorMessage = 'Error de validación. Verifique los datos ingresados.';
          break;
        case 429:
          errorMessage = 'Demasiadas solicitudes. Intente nuevamente en unos momentos.';
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