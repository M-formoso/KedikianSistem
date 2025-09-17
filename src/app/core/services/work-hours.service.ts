import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ✅ INTERFACES CORREGIDAS según el esquema del backend
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

// ✅ CORREGIDO: Interface según el modelo real del backend
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
 * ✅ NUEVO: Obtener primera máquina disponible
 */
private getFirstAvailableMachine(): Observable<number> {
  return this.http.get<any[]>(`${environment.apiUrl}/maquinas`, this.httpOptions).pipe(
    map(maquinas => {
      console.log('📋 Máquinas disponibles:', maquinas);
      
      if (!maquinas || maquinas.length === 0) {
        throw new Error('No hay máquinas disponibles en el sistema');
      }
      
      // Usar la primera máquina activa
      const primeraMatera = maquinas.find(m => m.estado === true) || maquinas[0];
      const maquinaId = primeraMatera.id;
      
      console.log('✅ Usando máquina ID:', maquinaId, 'Nombre:', primeraMatera.nombre);
      return maquinaId;
    })
  );
}
  /**
   * ✅ CORREGIDO: Fichar entrada - Crear nuevo reporte laboral
   * horas_turno se inicializa como 0 (entero) para indicar que el trabajo está activo
   */
  /**
 * ✅ CORREGIDO: Fichar entrada con máquina real del backend
 */
clockIn(usuarioId: number, notas?: string): Observable<ApiResponse<ReporteLaboral>> {
  console.log('🚀 Iniciando fichaje para usuario ID:', usuarioId);

  // Paso 1: Obtener máquina disponible
  return this.getFirstAvailableMachine().pipe(
    switchMap((maquinaId: number) => {
      // Paso 2: Crear reporte con máquina real
      const payload: ReporteLaboralCreate = {
        maquina_id: maquinaId, // ✅ Máquina real del backend
        usuario_id: usuarioId,
        fecha_asignacion: new Date().toISOString(),
        horas_turno: 0 // ✅ 0 = trabajo activo
      };

      console.log('✅ Enviando clockIn con máquina real:', payload);

      return this.http.post<ReporteLaboral>(
        this.apiUrl, 
        payload, 
        this.httpOptions
      );
    }),
    map((response: ReporteLaboral) => ({
      success: true,
      data: response,
      message: 'Fichaje de entrada registrado correctamente'
    })),
    catchError(error => {
      console.error('❌ Error en clockIn:', error);
      
      // Si falla con máquina, intentar sin máquina
      if (error.message?.includes('maquina_id')) {
        console.warn('⚠️ Falló con máquina, intentando sin máquina...');
        
        const payloadSinMaquina = {
          usuario_id: usuarioId,
          fecha_asignacion: new Date().toISOString(),
          horas_turno: 0
        };

        console.log('📤 Enviando clockIn SIN máquina:', payloadSinMaquina);

        return this.http.post<ReporteLaboral>(
          this.apiUrl, 
          payloadSinMaquina, 
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
      
      return this.handleError(error);
    })
  );
}

  /**
   * ✅ CORREGIDO: Fichar salida - Actualizar reporte laboral existente
   * Calcula las horas trabajadas como entero basado en el tiempo transcurrido
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
        
        // 👈 CORREGIDO: Calcular horas como entero, considerando tiempo de descanso
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60)); // Horas completas
        const minutesWorked = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        // Si hay más de 30 minutos, redondear hacia arriba
        const totalHours = minutesWorked >= 30 ? diffHours + 1 : diffHours;
        
        // Restar tiempo de descanso (convertir minutos a horas y redondear)
        const breakHours = Math.round(tiempoDescanso / 60);
        horasTrabajadasEntero = Math.max(1, totalHours - breakHours); // Mínimo 1 hora
        
        console.log(`Cálculo de horas: ${diffHours}h ${minutesWorked}m - Descanso: ${tiempoDescanso}min = ${horasTrabajadasEntero}h`);
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
   * ✅ CORREGIDO: Fichar salida con cálculo dinámico de horas
   * Usa enteros para horas_turno y calcula correctamente el tiempo trabajado
   */
  clockOutWithDynamicHours(reporteId: number, startTime: Date, tiempoDescanso: number = 60, notas?: string): Observable<ApiResponse<ReporteLaboral>> {
    // Calcular horas trabajadas dinámicamente
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    
    // 👈 CORREGIDO: Calcular horas como entero considerando descanso
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutesWorked = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // Si hay más de 30 minutos, redondear hacia arriba
    const totalHours = minutesWorked >= 30 ? diffHours + 1 : diffHours;
    
    // Restar tiempo de descanso
    const breakHours = Math.round(tiempoDescanso / 60);
    const hoursWorked = Math.max(1, totalHours - breakHours);
    
    const payload: Partial<ReporteLaboralCreate> = {
      horas_turno: hoursWorked // 👈 CORREGIDO: ENTERO de horas calculadas dinámicamente
    };

    console.log('✅ Enviando clockOut dinámico CORREGIDO:', { reporteId, hoursWorked, detalles: { diffHours, minutesWorked, totalHours, breakHours } });

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
   * ✅ CORREGIDO: Mapear reportes del backend a WorkDay del frontend
   * Ahora maneja horas_turno como entero correctamente
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
   * ✅ CORREGIDO: Calcular hora de fin basada en hora de inicio y horas trabajadas (entero)
   * hoursWorked es ahora un entero de horas, no un timestamp
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

  // ✅ CORREGIDO: Manejo de errores mejorado
  private handleError(error: any): Observable<never> {
    console.error('❌ Error en WorkHoursService:', error);
    
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
            // ✅ Manejo específico para errores de validación de Pydantic
            if (Array.isArray(error.error.detail)) {
              const validationErrors = error.error.detail.map((e: any) => {
                if (e.type === 'int_parsing' && e.loc?.includes('horas_turno')) {
                  return 'El campo horas_turno debe ser un número entero';
                }
                return e.msg || e.message || JSON.stringify(e);
              }).join(', ');
              errorMessage = 'Error de validación: ' + validationErrors;
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