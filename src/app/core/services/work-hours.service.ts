import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Interfaces basadas en tu backend
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
  fechaPago?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface para crear reportes laborales (según tu schema)
export interface ReporteLaboralCreate {
  maquina_id?: number;
  usuario_id: number;
  fecha_asignacion: string; // DateTime ISO string
  horas_turno: number; // 👈 CORREGIDO: INTEGER - número de horas trabajadas (NO DateTime)
}

// Interface para la respuesta del backend
export interface ReporteLaboral {
  id?: number;
  maquina_id?: number;
  usuario_id: number;
  fecha_asignacion: string;
  horas_turno: number; // 👈 CORREGIDO: INTEGER - número de horas trabajadas (NO DateTime)
  created?: string;
  updated?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class WorkHoursService {
  private apiUrl = `${environment.apiUrl}/reportes-laborales`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  /**
   * Fichar entrada - Crear nuevo reporte laboral
   * 👈 CORREGIDO: horas_turno se inicializa como 0 (entero)
   */
  clockIn(usuarioId: number, notas?: string): Observable<ApiResponse<ReporteLaboral>> {
    const payload: ReporteLaboralCreate = {
      maquina_id: 1, // ID de máquina por defecto (ajustar según necesidad)
      usuario_id: usuarioId,
      fecha_asignacion: new Date().toISOString(),
      horas_turno: 0 // 👈 CORREGIDO: ENTERO 0 inicial (no un timestamp)
    };

    console.log('✅ Enviando clockIn CORREGIDO:', payload);

    return this.http.post<ReporteLaboral>(
      this.apiUrl, 
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
   * 👈 CORREGIDO: Ahora calcula las horas trabajadas como entero
   */
  clockOut(reporteId: number, tiempoDescanso: number = 60, notas?: string): Observable<ApiResponse<ReporteLaboral>> {
    // Calculamos horas trabajadas dinámicamente desde el localStorage
    const activeClockIn = localStorage.getItem('activeWorkClockIn');
    let horasTrabajadasEntero = 8; // Default fallback
    
    if (activeClockIn) {
      try {
        const parsed = JSON.parse(activeClockIn);
        const startTime = new Date(parsed.startTimestamp);
        const now = new Date();
        const diffMs = now.getTime() - startTime.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60)); // 👈 Redondear hacia abajo para entero
        horasTrabajadasEntero = Math.max(1, diffHours); // Mínimo 1 hora
      } catch (error) {
        console.error('Error calculando horas trabajadas:', error);
      }
    }

    const payload: Partial<ReporteLaboralCreate> = {
      horas_turno: horasTrabajadasEntero // 👈 CORREGIDO: ENTERO de horas trabajadas
    };

    console.log('✅ Enviando clockOut CORREGIDO:', { reporteId, payload });

    return this.http.put<ReporteLaboral>(
      `${this.apiUrl}/${reporteId}`, 
      payload, 
      this.httpOptions
    ).pipe(
      map(response => ({
        success: true,
        data: response,
        message: `Fichaje de salida registrado correctamente. Horas trabajadas: ${horasTrabajadasEntero}`
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Fichar salida con cálculo dinámico de horas
   * 👈 CORREGIDO: Ahora usa enteros para horas_turno
   */
  clockOutWithDynamicHours(reporteId: number, startTime: Date, tiempoDescanso: number = 60, notas?: string): Observable<ApiResponse<ReporteLaboral>> {
    // Calcular horas trabajadas dinámicamente
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const hoursWorked = Math.floor(diffMs / (1000 * 60 * 60)); // 👈 Redondear hacia abajo a entero
    
    const payload: Partial<ReporteLaboralCreate> = {
      horas_turno: hoursWorked // 👈 CORREGIDO: ENTERO de horas calculadas dinámicamente
    };

    console.log('✅ Enviando clockOut dinámico CORREGIDO:', { reporteId, hoursWorked });

    return this.http.put<ReporteLaboral>(
      `${this.apiUrl}/${reporteId}`, 
      payload, 
      this.httpOptions
    ).pipe(
      map(response => ({
        success: true,
        data: response,
        message: `Fichaje de salida registrado correctamente. Horas trabajadas: ${hoursWorked}`
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener reportes laborales recientes
   */
  getRecentWorkDays(limit: number = 10): Observable<ApiResponse<WorkDay[]>> {
    return this.http.get<ReporteLaboral[]>(
      this.apiUrl,
      this.httpOptions
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
      this.apiUrl,
      this.httpOptions
    ).pipe(
      map(reportes => {
        // Buscar reportes del usuario que tengan 0 horas (no finalizados)
        const activeReport = reportes.find(reporte => 
          reporte.usuario_id === usuarioId && reporte.horas_turno === 0
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
      `${this.apiUrl}/${reporteId}`,
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
    // Filtrar en el frontend ya que el backend no parece tener filtro por usuario
    return this.getRecentWorkDays(100).pipe(
      map(response => ({
        ...response,
        data: response.data?.filter(workDay => workDay.usuarioId === usuarioId) || []
      }))
    );
  }

  // ============ MÉTODOS DE UTILIDAD ============

  /**
   * Obtener ID del usuario desde localStorage
   */
  private getStoredUserId(): number {
    const activeClockIn = localStorage.getItem('activeWorkClockIn');
    if (activeClockIn) {
      try {
        const parsed = JSON.parse(activeClockIn);
        return parsed.usuarioId;
      } catch (error) {
        console.error('Error parsing activeClockIn:', error);
      }
    }
    // Fallback: intentar obtener desde auth service o usar valor por defecto
    return 1; // Valor por defecto, ajustar según tu lógica
  }

  /**
   * Mapear reportes del backend a WorkDay del frontend
   * 👈 CORREGIDO: Ahora maneja horas_turno como entero
   */
  private mapReportesToWorkDays(reportes: ReporteLaboral[]): WorkDay[] {
    return reportes.map(reporte => ({
      id: reporte.id,
      fecha: reporte.fecha_asignacion.split('T')[0],
      horaInicio: this.extractTime(reporte.fecha_asignacion),
      horaFin: reporte.horas_turno > 0 ? this.calculateEndTime(reporte.fecha_asignacion, reporte.horas_turno) : undefined,
      tiempoDescanso: 60, // Valor por defecto
      totalHoras: reporte.horas_turno, // 👈 CORREGIDO: Usar directamente el entero del backend
      usuarioId: reporte.usuario_id,
      notas: '',
      estado: reporte.horas_turno > 0 ? 'completado' : 'activo',
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
   * Calcular hora de fin basada en hora de inicio y horas trabajadas (entero)
   * 👈 CORREGIDO: hoursWorked es ahora un entero de horas
   */
  private calculateEndTime(startTime: string, hoursWorked: number): string {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + (hoursWorked * 60 * 60 * 1000)); // 👈 Multiplicar por horas enteras
    return this.extractTime(end.toISOString());
  }

  /**
   * Calcular tiempo transcurrido desde un momento dado
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

  /**
   * Formatear horas para mostrar
   */
  formatHours(hours: number): string {
    return `${hours.toFixed(1)}h`;
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
          if (error.error && error.error.detail) {
            if (Array.isArray(error.error.detail)) {
              errorMessage = 'Error de validación: ' + error.error.detail.map((e: any) => e.msg || e).join(', ');
            } else {
              errorMessage = 'Error de validación: ' + JSON.stringify(error.error.detail);
            }
          }
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