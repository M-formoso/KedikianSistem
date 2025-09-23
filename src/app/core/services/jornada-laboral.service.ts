// jornada-laboral.service.ts - VERSIÓN CORREGIDA

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface JornadaLaboralCreate {
  usuario_id: number;
  notas_inicio?: string;
  ubicacion?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
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
  estado: 'activa' | 'pausada' | 'completada' | 'cancelada';
  es_feriado: boolean;
  limite_regular_alcanzado: boolean;
  hora_limite_regular?: string;
  overtime_solicitado: boolean;
  overtime_confirmado: boolean;
  overtime_iniciado?: string;
  pausa_automatica: boolean;
  finalizacion_forzosa: boolean;
  notas_inicio?: string;
  notas_fin?: string;
  motivo_finalizacion?: string;
  ubicacion_inicio?: string;
  ubicacion_fin?: string;
  advertencia_8h_mostrada: boolean;
  advertencia_limite_mostrada: boolean;
  created: string;
  updated?: string;
}

export interface EstadisticasJornada {
  mes: number;
  año: number;
  total_jornadas: number;
  total_horas_regulares: number;
  total_horas_extras: number;
  total_horas: number;
  jornadas_con_extras: number;
  promedio_horas_dia: number;
  jornadas: JornadaLaboralResponse[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class JornadaLaboralService {
  // ✅ CORREGIDO: Usar el endpoint correcto para jornadas laborales
  private readonly API_URL = `${environment.apiUrl}/jornadas-laborales`;

  constructor(private http: HttpClient) {}

  private getHttpOptions() {
    const usuarioActual = localStorage.getItem('usuarioActual');
    let token: string | null = null;

    if (usuarioActual) {
      try {
        const usuario = JSON.parse(usuarioActual);
        token = usuario.access_token || usuario.token || null;
      } catch {
        console.error('❌ Error parsing usuario actual');
      }
    }

    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return { headers: new HttpHeaders(headers) };
  }

  /**
   * ✅ CORREGIDO: Fichar entrada usando el endpoint correcto
   */
  ficharEntrada(
    usuario_id: number, 
    notas_inicio?: string, 
    ubicacion?: any
  ): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('🚀 Iniciando fichaje para usuario ID:', usuario_id);

    const payload = {
      usuario_id: usuario_id,
      notas_inicio: notas_inicio,
      ubicacion: ubicacion
    };

    console.log('📤 Payload para fichaje entrada:', payload);

    return this.http.post<JornadaLaboralResponse>(`${this.API_URL}/fichar-entrada`, payload, this.getHttpOptions()).pipe(
      retry(1),
      map(response => {
        console.log('📥 Respuesta fichaje entrada:', response);
        
        return {
          success: true,
          data: response,
          message: 'Entrada fichada correctamente'
        } as ApiResponse<JornadaLaboralResponse>;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * ✅ CORREGIDO: Finalizar jornada usando el endpoint correcto
   */
  finalizarJornada(
    jornada_id: number,
    tiempo_descanso: number = 60,
    notas_fin?: string,
    ubicacion?: any,
    forzado: boolean = false
  ): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('🛑 Finalizando jornada ID:', jornada_id);

    const payload = {
      tiempo_descanso,
      notas_fin,
      ubicacion,
      forzado
    };

    console.log('📤 Payload para finalizar jornada:', payload);

    return this.http.put<JornadaLaboralResponse>(`${this.API_URL}/finalizar/${jornada_id}`, payload, this.getHttpOptions()).pipe(
      retry(1),
      map(response => {
        console.log('📥 Respuesta finalización jornada:', response);
        
        return {
          success: true,
          data: response,
          message: `Jornada finalizada correctamente`
        } as ApiResponse<JornadaLaboralResponse>;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * ✅ CORREGIDO: Confirmar horas extras
   */
  confirmarHorasExtras(
    jornada_id: number,
    notas_overtime?: string
  ): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('🕐 Confirmando horas extras para jornada:', jornada_id);
    
    const payload = {
      notas_overtime
    };

    return this.http.put<JornadaLaboralResponse>(`${this.API_URL}/confirmar-overtime/${jornada_id}`, payload, this.getHttpOptions()).pipe(
      map(response => {
        return {
          success: true,
          data: response,
          message: 'Horas extras confirmadas correctamente'
        } as ApiResponse<JornadaLaboralResponse>;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * ✅ CORREGIDO: Rechazar horas extras
   */
  rechazarHorasExtras(
    jornada_id: number,
    tiempo_descanso: number = 60,
    notas_fin?: string
  ): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('❌ Rechazando horas extras para jornada:', jornada_id);
    
    const payload = {
      tiempo_descanso,
      notas_fin
    };

    return this.http.put<JornadaLaboralResponse>(`${this.API_URL}/rechazar-overtime/${jornada_id}`, payload, this.getHttpOptions()).pipe(
      map(response => {
        return {
          success: true,
          data: response,
          message: 'Jornada finalizada en 9 horas regulares'
        } as ApiResponse<JornadaLaboralResponse>;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * ✅ CORREGIDO: Obtener jornada activa
   */
  obtenerJornadaActiva(usuario_id: number): Observable<ApiResponse<JornadaLaboralResponse | null>> {
    console.log('📤 Consultando jornada activa para usuario:', usuario_id);

    return this.http.get<JornadaLaboralResponse>(`${this.API_URL}/activa/${usuario_id}`, this.getHttpOptions()).pipe(
      retry(1),
      map(response => {
        if (response) {
          console.log('✅ Jornada activa encontrada:', response);
          return {
            success: true,
            data: response,
            message: 'Jornada activa encontrada'
          } as ApiResponse<JornadaLaboralResponse>;
        }

        console.log('ℹ️ No se encontró jornada activa');
        return {
          success: true,
          data: null,
          message: 'No hay jornada activa'
        } as ApiResponse<JornadaLaboralResponse | null>;
      }),
      catchError(error => {
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
   * ✅ Obtener jornadas de un usuario
   */
  obtenerJornadasUsuario(
    usuario_id: number,
    limite: number = 10,
    offset: number = 0
  ): Observable<ApiResponse<JornadaLaboralResponse[]>> {
    const params = new HttpParams()
      .set('limite', limite.toString())
      .set('offset', offset.toString());

    return this.http.get<JornadaLaboralResponse[]>(`${this.API_URL}/usuario/${usuario_id}`, {
      ...this.getHttpOptions(),
      params
    }).pipe(
      retry(1),
      map(jornadas => {
        return {
          success: true,
          data: jornadas,
          message: 'Jornadas obtenidas correctamente'
        } as ApiResponse<JornadaLaboralResponse[]>;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * ✅ Obtener estadísticas del mes
   */
  obtenerEstadisticasMes(
    usuario_id: number,
    mes: number,
    anio: number
  ): Observable<ApiResponse<EstadisticasJornada>> {
    return this.http.get<EstadisticasJornada>(`${this.API_URL}/estadisticas/${usuario_id}/${mes}/${anio}`, this.getHttpOptions()).pipe(
      retry(1),
      map(stats => {
        return {
          success: true,
          data: stats,
          message: 'Estadísticas obtenidas correctamente'
        } as ApiResponse<EstadisticasJornada>;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * ✅ Actualizar estado de jornada
   */
  actualizarEstadoJornada(jornada_id: number): Observable<ApiResponse<JornadaLaboralResponse>> {
    return this.http.put<JornadaLaboralResponse>(`${this.API_URL}/actualizar-estado/${jornada_id}`, {}, this.getHttpOptions()).pipe(
      map(response => {
        return {
          success: true,
          data: response,
          message: 'Estado actualizado correctamente'
        } as ApiResponse<JornadaLaboralResponse>;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * ✅ ELIMINADO: Ya no necesitamos limpiar jornadas fantasma porque usamos endpoints específicos
   */

  /**
   * ✅ Manejo de errores mejorado
   */
  private handleError(error: any): Observable<never> {
    console.error('❌ Error en JornadaLaboralService:', error);
    
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 0:
          errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
          break;
        case 400:
          errorMessage = 'Solicitud incorrecta. Verifica los datos enviados.';
          break;
        case 401:
          errorMessage = 'No autorizado. Tu sesión ha expirado.';
          localStorage.removeItem('usuarioActual');
          break;
        case 403:
          errorMessage = 'Acceso prohibido. No tienes permisos suficientes.';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado.';
          break;
        case 409:
          errorMessage = 'Conflicto. Ya existe una jornada activa.';
          break;
        case 422:
          errorMessage = 'Error de validación en el servidor.';
          
          if (error.error && error.error.detail) {
            if (Array.isArray(error.error.detail)) {
              const validationErrors = error.error.detail.map((e: any) => {
                return e.msg || e.message || JSON.stringify(e);
              }).join(', ');
              errorMessage = 'Errores de validación: ' + validationErrors;
            } else if (typeof error.error.detail === 'string') {
              errorMessage = error.error.detail;
            }
          }
          break;
        case 500:
          errorMessage = 'Error interno del servidor. Intenta nuevamente más tarde.';
          break;
        default:
          errorMessage = `Error ${error.status}: ${error.message || error.statusText}`;
      }
      
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}