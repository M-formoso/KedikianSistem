import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface WorkDay {
  id?: number;
  fecha: string;
  horaInicio: string;
  horaFin?: string;
  tiempoDescanso: number;
  totalHoras: number;
  usuarioId: number;
  notas?: string;
  estado: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClockInRequest {
  usuario_id: number;
  fecha_asignacion: string; // ISO string
  notas?: string;
}

export interface ClockOutRequest {
  horas_turno: string; // ISO string
  notas?: string;
}

export interface ReporteLaboral {
  id?: number;
  maquina_id?: number;
  usuario_id: number;
  fecha_asignacion: string;
  horas_turno?: string;
  created?: string;
  updated?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class WorkHoursService {
  private apiUrl = `${environment.apiUrl}`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  /**
   * Fichar entrada - Crear nuevo reporte laboral
   */
  clockIn(usuarioId: number, notas?: string): Observable<ApiResponse<ReporteLaboral>> {
    const payload: ClockInRequest = {
      usuario_id: usuarioId,
      fecha_asignacion: new Date().toISOString(),
      notas: notas || ''
    };

    console.log('📤 Enviando clockIn:', payload);

    return this.http.post<ReporteLaboral>(
      `${this.apiUrl}/reportes-laborales`, 
      payload, 
      this.httpOptions
    ).pipe(
      map(response => ({
        success: true,
        data: response,
        message: 'Fichaje de entrada registrado correctamente'
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Fichar salida - Actualizar reporte laboral existente
   */
  clockOut(reporteId: number, tiempoDescanso: number = 0, notas?: string): Observable<ApiResponse<ReporteLaboral>> {
    const payload: ClockOutRequest = {
      horas_turno: new Date().toISOString(),
      notas: notas || ''
    };

    console.log('📤 Enviando clockOut para reporte:', reporteId, payload);

    return this.http.put<ReporteLaboral>(
      `${this.apiUrl}/reportes-laborales/${reporteId}`, 
      payload, 
      this.httpOptions
    ).pipe(
      map(response => ({
        success: true,
        data: response,
        message: 'Fichaje de salida registrado correctamente'
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener reportes laborales recientes
   */
  getRecentWorkDays(limit: number = 10): Observable<ApiResponse<WorkDay[]>> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('orderBy', 'fecha_asignacion')
      .set('order', 'desc');

    return this.http.get<ReporteLaboral[]>(
      `${this.apiUrl}/reportes-laborales`,
      { params, ...this.httpOptions }
    ).pipe(
      map(reportes => ({
        success: true,
        data: this.mapReportesToWorkDays(reportes.slice(0, limit)),
        message: 'Registros obtenidos correctamente'
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Buscar reporte laboral activo para un usuario
   */
  getActiveWorkDay(usuarioId: number): Observable<ApiResponse<ReporteLaboral | null>> {
    return this.http.get<ReporteLaboral[]>(
      `${this.apiUrl}/reportes-laborales`,
      this.httpOptions
    ).pipe(
      map(reportes => {
        // Buscar reportes del usuario que no tengan horas_turno (no finalizados)
        const activeReport = reportes.find(reporte => 
          reporte.usuario_id === usuarioId && !reporte.horas_turno
        );

        return {
          success: true,
          data: activeReport || null,
          message: activeReport ? 'Reporte activo encontrado' : 'No hay reportes activos'
        };
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Eliminar reporte laboral
   */
  deleteWorkDay(reporteId: number): Observable<ApiResponse<any>> {
    return this.http.delete<any>(
      `${this.apiUrl}/reportes-laborales/${reporteId}`,
      this.httpOptions
    ).pipe(
      map(() => ({
        success: true,
        data: null,
        message: 'Registro eliminado correctamente'
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener reportes por usuario
   */
  getWorkDaysByUser(usuarioId: number): Observable<ApiResponse<WorkDay[]>> {
    const params = new HttpParams()
      .set('usuario_id', usuarioId.toString());

    return this.http.get<ReporteLaboral[]>(
      `${this.apiUrl}/reportes-laborales`,
      { params, ...this.httpOptions }
    ).pipe(
      map(reportes => ({
        success: true,
        data: this.mapReportesToWorkDays(reportes),
        message: 'Registros del usuario obtenidos correctamente'
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener usuarios (operarios)
   */
  getUsers(): Observable<ApiResponse<any[]>> {
    return this.http.get<any[]>(
      `${this.apiUrl}/usuarios`,
      this.httpOptions
    ).pipe(
      map(usuarios => ({
        success: true,
        data: usuarios.filter(u => u.estado === true),
        message: 'Usuarios obtenidos correctamente'
      })),
      catchError(this.handleError)
    );
  }

  // ============ MÉTODOS DE UTILIDAD ============

  /**
   * Mapear reportes del backend a WorkDay del frontend
   */
  private mapReportesToWorkDays(reportes: ReporteLaboral[]): WorkDay[] {
    return reportes.map(reporte => ({
      id: reporte.id,
      fecha: reporte.fecha_asignacion.split('T')[0], // Solo la fecha
      horaInicio: this.extractTime(reporte.fecha_asignacion),
      horaFin: reporte.horas_turno ? this.extractTime(reporte.horas_turno) : undefined,
      tiempoDescanso: 60, // Valor por defecto
      totalHoras: reporte.horas_turno 
        ? this.calculateHours(reporte.fecha_asignacion, reporte.horas_turno) 
        : 0,
      usuarioId: reporte.usuario_id,
      notas: '',
      estado: reporte.horas_turno ? 'completado' : 'activo',
      createdAt: reporte.created ? new Date(reporte.created) : new Date(reporte.fecha_asignacion),
      updatedAt: reporte.updated ? new Date(reporte.updated) : new Date(reporte.fecha_asignacion)
    }));
  }

  /**
   * Extraer tiempo de un timestamp ISO
   */
  private extractTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Calcular horas entre dos timestamps
   */
  private calculateHours(start: string, end: string): number {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.round(diffHours * 100) / 100;
  }

  /**
   * Formatear horas para mostrar
   */
  formatHours(hours: number): string {
    return `${hours.toFixed(1)}h`;
  }

  /**
   * Calcular tiempo transcurrido
   */
  calculateElapsedTime(startTime: Date): { hours: number; minutes: number; seconds: number } {
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  }

  /**
   * Verificar si está cerca del límite de 9 horas
   */
  isNearingLimit(startTime: Date): boolean {
    const elapsed = this.calculateElapsedTime(startTime);
    const totalHours = elapsed.hours + (elapsed.minutes / 60);
    return totalHours >= 8; // Alerta a partir de 8 horas
  }

  /**
   * Verificar si ha superado el límite de 9 horas
   */
  hasExceededLimit(startTime: Date): boolean {
    const elapsed = this.calculateElapsedTime(startTime);
    const totalHours = elapsed.hours + (elapsed.minutes / 60);
    return totalHours >= 9; // Límite a las 9 horas
  }

  // Manejo de errores
  private handleError(error: any): Observable<never> {
    console.error('Error en WorkHoursService:', error);
    
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
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
          errorMessage = 'Ya existe un fichaje activo.';
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