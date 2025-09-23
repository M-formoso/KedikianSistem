// src/app/core/services/work-hours.service.ts - CORREGIDO PARA USAR NUEVO SISTEMA

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ✅ INTERFACES CORREGIDAS para el nuevo sistema de jornadas
export interface JornadaLaboralCreate {
  usuario_id: number;
  notas_inicio?: string;
  ubicacion?: any;
}

export interface JornadaLaboralResponse {
  id: number;
  usuario_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin?: string;
  tiempo_descanso: number;
  horas_regulares: number;
  horas_extras: number;
  total_horas: number;
  estado: string;
  es_feriado: boolean;
  limite_regular_alcanzado: boolean;
  overtime_confirmado: boolean;
  notas_inicio?: string;
  notas_fin?: string;
  created: string;
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
  // ✅ CORREGIDO: Usar el endpoint correcto del nuevo sistema
  private apiUrl = `${environment.apiUrl}/jornadas-laborales`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  /**
   * ✅ CORREGIDO: Fichar entrada usando el nuevo sistema
   */
  clockIn(usuarioId: number, notas?: string): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('🚀 Iniciando fichaje con nuevo sistema para usuario:', usuarioId);

    const payload = {
      usuario_id: usuarioId,
      notas_inicio: notas || '',
      ubicacion: null
    };

    console.log('📤 Payload para fichar-entrada:', payload);

    // ✅ Usar endpoint correcto
    return this.http.post<JornadaLaboralResponse>(
      `${this.apiUrl}/fichar-entrada`,
      null, // ✅ No body, usar query params
      {
        ...this.httpOptions,
        params: new HttpParams()
          .set('usuario_id', usuarioId.toString())
          .set('notas_inicio', notas || '')
      }
    ).pipe(
      map((response: JornadaLaboralResponse) => ({
        success: true,
        data: response,
        message: 'Fichaje de entrada registrado correctamente'
      })),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ CORREGIDO: Fichar salida usando el nuevo sistema
   */
  clockOut(jornadaId: number, tiempoDescanso: number = 60, notas?: string): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('🛑 Finalizando jornada con nuevo sistema:', jornadaId);

    // ✅ Usar endpoint correcto
    return this.http.put<JornadaLaboralResponse>(
      `${this.apiUrl}/finalizar/${jornadaId}`,
      null, // ✅ No body, usar query params
      {
        ...this.httpOptions,
        params: new HttpParams()
          .set('tiempo_descanso', tiempoDescanso.toString())
          .set('notas_fin', notas || '')
          .set('forzado', 'false')
      }
    ).pipe(
      map((response: JornadaLaboralResponse) => ({
        success: true,
        data: response,
        message: 'Fichaje de salida registrado correctamente'
      })),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ NUEVO: Confirmar horas extras
   */
  confirmOvertime(jornadaId: number, notas?: string): Observable<ApiResponse<JornadaLaboralResponse>> {
    return this.http.put<JornadaLaboralResponse>(
      `${this.apiUrl}/confirmar-overtime/${jornadaId}`,
      null,
      {
        ...this.httpOptions,
        params: new HttpParams().set('notas_overtime', notas || '')
      }
    ).pipe(
      map((response: JornadaLaboralResponse) => ({
        success: true,
        data: response,
        message: 'Horas extras confirmadas'
      })),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ NUEVO: Rechazar horas extras
   */
  declineOvertime(jornadaId: number, tiempoDescanso: number = 60, notas?: string): Observable<ApiResponse<JornadaLaboralResponse>> {
    return this.http.put<JornadaLaboralResponse>(
      `${this.apiUrl}/rechazar-overtime/${jornadaId}`,
      null,
      {
        ...this.httpOptions,
        params: new HttpParams()
          .set('tiempo_descanso', tiempoDescanso.toString())
          .set('notas_fin', notas || '')
      }
    ).pipe(
      map((response: JornadaLaboralResponse) => ({
        success: true,
        data: response,
        message: 'Jornada finalizada en 9 horas regulares'
      })),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ CORREGIDO: Obtener jornada activa
   */
  getActiveWorkDay(usuarioId: number): Observable<ApiResponse<JornadaLaboralResponse | null>> {
    return this.http.get<JornadaLaboralResponse>(
      `${this.apiUrl}/activa/${usuarioId}`,
      this.httpOptions
    ).pipe(
      map((response: JornadaLaboralResponse) => ({
        success: true,
        data: response,
        message: 'Jornada activa encontrada'
      })),
      catchError((error) => {
        if (error.status === 404) {
          return [{
            success: true,
            data: null,
            message: 'No hay jornada activa'
          } as ApiResponse<JornadaLaboralResponse | null>];
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * ✅ CORREGIDO: Obtener jornadas recientes
   */
  getRecentWorkDays(limit: number = 10): Observable<ApiResponse<JornadaLaboralResponse[]>> {
    // Necesitamos el usuario_id, lo obtenemos del localStorage o AuthService
    const usuarioActual = localStorage.getItem('usuarioActual');
    let usuarioId = 1; // fallback

    if (usuarioActual) {
      try {
        const usuario = JSON.parse(usuarioActual);
        usuarioId = usuario.id || 1;
      } catch (error) {
        console.error('Error parsing usuario actual:', error);
      }
    }

    return this.http.get<JornadaLaboralResponse[]>(
      `${this.apiUrl}/usuario/${usuarioId}`,
      {
        ...this.httpOptions,
        params: new HttpParams()
          .set('limite', limit.toString())
          .set('offset', '0')
      }
    ).pipe(
      map((response: JornadaLaboralResponse[]) => ({
        success: true,
        data: response,
        message: 'Registros obtenidos correctamente'
      })),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ NUEVO: Obtener estadísticas del mes
   */
  getMonthlyStats(usuarioId: number, mes: number, anio: number): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/estadisticas/${usuarioId}/${mes}/${anio}`,
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  // ============ MÉTODOS DE UTILIDAD COMPATIBLES ============

  /**
   * ✅ Mapear JornadaLaboralResponse a WorkDay para compatibilidad
   */
  private mapJornadaToWorkDay(jornada: JornadaLaboralResponse): any {
    return {
      id: jornada.id,
      fecha: jornada.fecha,
      horaInicio: this.extractTime(jornada.hora_inicio),
      horaFin: jornada.hora_fin ? this.extractTime(jornada.hora_fin) : null,
      tiempoDescanso: jornada.tiempo_descanso,
      totalHoras: jornada.total_horas,
      horasRegulares: jornada.horas_regulares,
      horasExtras: jornada.horas_extras,
      usuarioId: jornada.usuario_id,
      estado: jornada.estado,
      notas: jornada.notas_inicio || '',
      esFeriado: jornada.es_feriado,
      createdAt: new Date(jornada.created),
      updatedAt: jornada.updated ? new Date(jornada.updated) : new Date()
    };
  }

  /**
   * ✅ Extraer tiempo de un timestamp ISO
   */
  private extractTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * ✅ Calcular tiempo transcurrido
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
   * ✅ Verificar si está cerca del límite
   */
  isNearingLimit(startTime: Date): boolean {
    const elapsed = this.calculateElapsedTime(startTime);
    const totalHours = elapsed.hours + (elapsed.minutes / 60);
    return totalHours >= 8;
  }

  /**
   * ✅ Verificar si ha superado el límite
   */
  hasExceededLimit(startTime: Date): boolean {
    const elapsed = this.calculateElapsedTime(startTime);
    const totalHours = elapsed.hours + (elapsed.minutes / 60);
    return totalHours >= 9;
  }

  /**
   * ✅ Manejo de errores mejorado
   */
  private handleError(error: any): Observable<never> {
    console.error('❌ Error en WorkHoursService (nuevo sistema):', error);
    
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 0:
          errorMessage = 'Error de conexión. Verifique su conexión a internet.';
          break;
        case 400:
          errorMessage = 'Solicitud incorrecta. Verifique los datos enviados.';
          break;
        case 401:
          errorMessage = 'No autorizado. Tu sesión ha expirado.';
          break;
        case 403:
          errorMessage = 'Acceso prohibido. No tienes permisos suficientes.';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado. El endpoint puede no estar disponible.';
          break;
        case 409:
          errorMessage = 'Conflicto. Ya existe una jornada activa.';
          break;
        case 422:
          errorMessage = 'Error de validación en el servidor.';
          break;
        case 500:
          errorMessage = 'Error interno del servidor. Intente nuevamente más tarde.';
          break;
        default:
          errorMessage = `Error ${error.status}: ${error.message || error.statusText}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}