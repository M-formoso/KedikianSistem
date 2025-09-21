// src/app/core/services/jornada-laboral.service.ts - COMPLETAMENTE CORREGIDO

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ===== INTERFACES PARA JORNADA LABORAL =====

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
  fecha: string; // Date en formato ISO
  hora_inicio: string; // DateTime en formato ISO
  hora_fin?: string; // DateTime en formato ISO, null si está activa
  tiempo_descanso: number; // en minutos
  
  // Cálculo de horas
  horas_regulares: number;
  horas_extras: number;
  total_horas: number;
  
  // Estado y control
  estado: 'activa' | 'pausada' | 'completada' | 'cancelada';
  es_feriado: boolean;
  
  // Control de horas extras
  limite_regular_alcanzado: boolean;
  hora_limite_regular?: string;
  overtime_solicitado: boolean;
  overtime_confirmado: boolean;
  overtime_iniciado?: string;
  pausa_automatica: boolean;
  finalizacion_forzosa: boolean;
  
  // Información adicional
  notas_inicio?: string;
  notas_fin?: string;
  motivo_finalizacion?: string;
  ubicacion_inicio?: string;
  ubicacion_fin?: string;
  
  // Control de advertencias
  advertencia_8h_mostrada: boolean;
  advertencia_limite_mostrada: boolean;
  
  // Timestamps
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

// ===== SERVICIO PRINCIPAL =====

@Injectable({
  providedIn: 'root'
})
export class JornadaLaboralService {
  private readonly API_URL = `${environment.apiUrl}/jornadas-laborales`;

  constructor(private http: HttpClient) {}

  // ✅ Obtener headers HTTP con token dinámico
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

  // ============ MÉTODOS DE FICHAJE ============

  /**
   * ✅ CORREGIDO: Fichar entrada - Iniciar jornada laboral
   */
  ficharEntrada(
    usuario_id: number, 
    notas_inicio?: string, 
    ubicacion?: any
  ): Observable<ApiResponse<JornadaLaboralResponse>> {
    const body = {
      usuario_id,
      notas_inicio,
      ubicacion
    };

    console.log('📤 Enviando fichaje de entrada:', body);

    return this.http.post<any>(
      `${this.API_URL}/fichar-entrada`, 
      body,
      this.getHttpOptions()
    ).pipe(
      retry(1),
      map(response => {
        console.log('📥 Respuesta fichaje entrada:', response);
        
        // ✅ CRÍTICO: Verificar si la respuesta ya tiene el formato ApiResponse
        if (this.isApiResponse(response)) {
          return response as ApiResponse<JornadaLaboralResponse>;
        }
        
        // Si no, crear el wrapper
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
   * ✅ CORREGIDO: Finalizar jornada laboral
   */
  finalizarJornada(
    jornada_id: number,
    tiempo_descanso: number = 60,
    notas_fin?: string,
    ubicacion?: any,
    forzado: boolean = false
  ): Observable<ApiResponse<JornadaLaboralResponse>> {
    const body = {
      tiempo_descanso,
      notas_fin,
      ubicacion,
      forzado
    };

    console.log('📤 Enviando finalización de jornada:', body);

    return this.http.put<any>(
      `${this.API_URL}/finalizar/${jornada_id}`, 
      body,
      this.getHttpOptions()
    ).pipe(
      retry(1),
      map(response => {
        console.log('📥 Respuesta finalización jornada:', response);
        
        if (this.isApiResponse(response)) {
          return response as ApiResponse<JornadaLaboralResponse>;
        }
        
        return {
          success: true,
          data: response,
          message: 'Jornada finalizada correctamente'
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
    const body = {
      notas_overtime
    };

    console.log('📤 Enviando confirmación horas extras:', body);

    return this.http.put<any>(
      `${this.API_URL}/confirmar-overtime/${jornada_id}`, 
      body,
      this.getHttpOptions()
    ).pipe(
      retry(1),
      map(response => {
        console.log('📥 Respuesta confirmación horas extras:', response);
        
        if (this.isApiResponse(response)) {
          return response as ApiResponse<JornadaLaboralResponse>;
        }
        
        return {
          success: true,
          data: response,
          message: 'Horas extras confirmadas'
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
    const body = {
      tiempo_descanso,
      notas_fin
    };

    console.log('📤 Enviando rechazo horas extras:', body);

    return this.http.put<any>(
      `${this.API_URL}/rechazar-overtime/${jornada_id}`, 
      body,
      this.getHttpOptions()
    ).pipe(
      retry(1),
      map(response => {
        console.log('📥 Respuesta rechazo horas extras:', response);
        
        if (this.isApiResponse(response)) {
          return response as ApiResponse<JornadaLaboralResponse>;
        }
        
        return {
          success: true,
          data: response,
          message: 'Horas extras rechazadas y jornada finalizada'
        } as ApiResponse<JornadaLaboralResponse>;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // ============ MÉTODOS DE CONSULTA ============

  /**
   * ✅ CORREGIDO: Obtener jornada activa de un usuario
   */
  obtenerJornadaActiva(usuario_id: number): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('📤 Consultando jornada activa para usuario:', usuario_id);

    return this.http.get<any>(
      `${this.API_URL}/activa/${usuario_id}`,
      this.getHttpOptions()
    ).pipe(
      retry(1),
      map(response => {
        console.log('📥 Respuesta jornada activa:', response);
        
        if (this.isApiResponse(response)) {
          return response as ApiResponse<JornadaLaboralResponse>;
        }
        
        // Si response es null o undefined, no hay jornada activa
        if (!response) {
          return {
            success: true,
            data: undefined,
            message: 'No hay jornada activa'
          } as ApiResponse<JornadaLaboralResponse>;
        }
        
        return {
          success: true,
          data: response,
          message: 'Jornada activa encontrada'
        } as ApiResponse<JornadaLaboralResponse>;
      }),
      catchError(error => {
        // ✅ CRÍTICO: Si es 404, no es error, simplemente no hay jornada activa
        if (error.status === 404) {
          console.log('ℹ️ No hay jornada activa (404)');
          return [{
            success: true,
            data: undefined,
            message: 'No hay jornada activa'
          } as ApiResponse<JornadaLaboralResponse>];
        }
        
        return this.handleError(error);
      })
    );
  }

  /**
   * ✅ CORREGIDO: Obtener jornadas de un usuario
   */
  obtenerJornadasUsuario(
    usuario_id: number,
    limite: number = 10,
    offset: number = 0
  ): Observable<ApiResponse<JornadaLaboralResponse[]>> {
    const params = new HttpParams()
      .set('limite', limite.toString())
      .set('offset', offset.toString());

    console.log('📤 Consultando jornadas usuario:', usuario_id);

    return this.http.get<any>(
      `${this.API_URL}/usuario/${usuario_id}`,
      { ...this.getHttpOptions(), params }
    ).pipe(
      retry(1),
      map(response => {
        console.log('📥 Respuesta jornadas usuario:', response);
        
        if (this.isApiResponse(response)) {
          return response as ApiResponse<JornadaLaboralResponse[]>;
        }
        
        // Si es un array directamente
        if (Array.isArray(response)) {
          return {
            success: true,
            data: response,
            message: 'Jornadas obtenidas correctamente'
          } as ApiResponse<JornadaLaboralResponse[]>;
        }
        
        return {
          success: true,
          data: [],
          message: 'No se encontraron jornadas'
        } as ApiResponse<JornadaLaboralResponse[]>;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * ✅ CORREGIDO: Obtener jornadas por periodo
   */
  obtenerJornadasPeriodo(
    usuario_id?: number,
    fecha_inicio?: string,
    fecha_fin?: string,
    limite: number = 50
  ): Observable<ApiResponse<JornadaLaboralResponse[]>> {
    let params = new HttpParams().set('limite', limite.toString());
    
    if (usuario_id) params = params.set('usuario_id', usuario_id.toString());
    if (fecha_inicio) params = params.set('fecha_inicio', fecha_inicio);
    if (fecha_fin) params = params.set('fecha_fin', fecha_fin);

    return this.http.get<any>(
      `${this.API_URL}/periodo`,
      { ...this.getHttpOptions(), params }
    ).pipe(
      retry(1),
      map(response => {
        if (this.isApiResponse(response)) {
          return response as ApiResponse<JornadaLaboralResponse[]>;
        }
        
        if (Array.isArray(response)) {
          return {
            success: true,
            data: response,
            message: 'Jornadas del periodo obtenidas'
          } as ApiResponse<JornadaLaboralResponse[]>;
        }
        
        return {
          success: true,
          data: [],
          message: 'No se encontraron jornadas para el periodo'
        } as ApiResponse<JornadaLaboralResponse[]>;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * ✅ CORREGIDO: Obtener estadísticas del mes
   */
  obtenerEstadisticasMes(
    usuario_id: number,
    mes: number,
    anio: number
  ): Observable<ApiResponse<EstadisticasJornada>> {
    console.log('📤 Consultando estadísticas:', { usuario_id, mes, anio });

    return this.http.get<any>(
      `${this.API_URL}/estadisticas/${usuario_id}/${mes}/${anio}`,
      this.getHttpOptions()
    ).pipe(
      retry(1),
      map(response => {
        console.log('📥 Respuesta estadísticas:', response);
        
        if (this.isApiResponse(response)) {
          return response as ApiResponse<EstadisticasJornada>;
        }
        
        return {
          success: true,
          data: response,
          message: 'Estadísticas obtenidas correctamente'
        } as ApiResponse<EstadisticasJornada>;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // ============ MÉTODOS DE CONTROL ============

  /**
   * ✅ CORREGIDO: Actualizar estado de jornada
   */
  actualizarEstadoJornada(jornada_id: number): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('📤 Actualizando estado jornada:', jornada_id);

    return this.http.put<any>(
      `${this.API_URL}/actualizar-estado/${jornada_id}`,
      {},
      this.getHttpOptions()
    ).pipe(
      retry(1),
      map(response => {
        console.log('📥 Respuesta actualización estado:', response);
        
        if (this.isApiResponse(response)) {
          return response as ApiResponse<JornadaLaboralResponse>;
        }
        
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
   * Verificar jornadas activas
   */
  verificarJornadasActivas(): Observable<ApiResponse<JornadaLaboralResponse[]>> {
    return this.http.get<any>(
      `${this.API_URL}/verificar-activas`,
      this.getHttpOptions()
    ).pipe(
      retry(1),
      map(response => {
        if (this.isApiResponse(response)) {
          return response as ApiResponse<JornadaLaboralResponse[]>;
        }
        
        if (Array.isArray(response)) {
          return {
            success: true,
            data: response,
            message: 'Jornadas activas verificadas'
          } as ApiResponse<JornadaLaboralResponse[]>;
        }
        
        return {
          success: true,
          data: [],
          message: 'No hay jornadas activas'
        } as ApiResponse<JornadaLaboralResponse[]>;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Obtener resumen del día
   */
  obtenerResumenDia(
    usuario_id: number,
    fecha: string
  ): Observable<ApiResponse<any>> {
    return this.http.get<any>(
      `${this.API_URL}/resumen-dia/${usuario_id}/${fecha}`,
      this.getHttpOptions()
    ).pipe(
      retry(1),
      map(response => {
        if (this.isApiResponse(response)) {
          return response as ApiResponse<any>;
        }
        
        return {
          success: true,
          data: response,
          message: 'Resumen del día obtenido'
        } as ApiResponse<any>;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // ============ MÉTODOS DE UTILIDAD ============

  /**
   * Calcular tiempo restante para diferentes límites
   */
  calcularTiempoRestante(jornada_id: number): Observable<ApiResponse<any>> {
    return this.http.get<any>(
      `${this.API_URL}/tiempo-restante/${jornada_id}`,
      this.getHttpOptions()
    ).pipe(
      retry(1),
      map(response => {
        if (this.isApiResponse(response)) {
          return response as ApiResponse<any>;
        }
        
        return {
          success: true,
          data: response,
          message: 'Tiempo restante calculado'
        } as ApiResponse<any>;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // ============ MÉTODOS DE TRANSFORMACIÓN ============

  /**
   * Convertir respuesta de backend a formato local
   */
  transformarJornadaParaVista(jornada: JornadaLaboralResponse): any {
    return {
      id: jornada.id,
      fecha: jornada.fecha,
      horaInicio: this.formatearHora(jornada.hora_inicio),
      horaFin: jornada.hora_fin ? this.formatearHora(jornada.hora_fin) : null,
      tiempoDescanso: jornada.tiempo_descanso,
      horasRegulares: jornada.horas_regulares,
      horasExtras: jornada.horas_extras,
      totalHoras: jornada.total_horas,
      estado: jornada.estado,
      esFeriado: jornada.es_feriado,
      limiteRegularAlcanzado: jornada.limite_regular_alcanzado,
      isOvertimeMode: jornada.overtime_confirmado,
      isActive: jornada.estado === 'activa',
      isPaused: jornada.estado === 'pausada',
      notasInicio: jornada.notas_inicio,
      notasFin: jornada.notas_fin,
      motivoFinalizacion: jornada.motivo_finalizacion
    };
  }

  /**
   * Formatear hora para mostrar (HH:MM)
   */
  private formatearHora(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Calcular tiempo transcurrido
   */
  calcularTiempoTranscurrido(hora_inicio: string, hora_fin?: string): {
    horas: number;
    minutos: number;
    totalMinutos: number;
  } {
    const inicio = new Date(hora_inicio);
    const fin = hora_fin ? new Date(hora_fin) : new Date();
    
    const diferenciaMs = fin.getTime() - inicio.getTime();
    const totalMinutos = Math.floor(diferenciaMs / (1000 * 60));
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;

    return {
      horas,
      minutos,
      totalMinutos
    };
  }

  /**
   * ✅ CORREGIDO: Verificar si necesita mostrar diálogo de horas extras
   */
  necesitaDialogoOvertimeEstatico(jornada: JornadaLaboralResponse): boolean {
    return jornada.limite_regular_alcanzado && 
           !jornada.overtime_confirmado && 
           jornada.estado === 'pausada' &&
           jornada.pausa_automatica &&
           !jornada.hora_fin; // ✅ CRÍTICO: Solo si no está finalizada
  }

  /**
   * Obtener progreso de la jornada (0-100)
   */
  calcularProgresoJornada(horas_trabajadas: number, en_overtime: boolean = false): number {
    if (!en_overtime) {
      // Progreso de horas regulares (0-9 horas)
      return Math.min(100, Math.round((horas_trabajadas / 9) * 100));
    } else {
      // Progreso de horas extras (más de 9 horas, máximo 4 extras)
      const horas_extras = horas_trabajadas - 9;
      return Math.min(100, Math.round((horas_extras / 4) * 100));
    }
  }

  /**
   * Verificar si está cerca del límite
   */
  estaCercaDelLimite(horas_trabajadas: number, en_overtime: boolean = false): boolean {
    if (!en_overtime) {
      return horas_trabajadas >= 8; // Advertir a partir de 8 horas
    } else {
      const horas_extras = horas_trabajadas - 9;
      return horas_extras >= 3; // Advertir a partir de 3 horas extras
    }
  }

  /**
   * Verificar si ha superado el límite
   */
  haExcedidoLimite(horas_trabajadas: number): boolean {
    return horas_trabajadas >= 13; // 9 regulares + 4 extras
  }

  // ============ MÉTODOS AUXILIARES ============

  /**
   * ✅ Verificar si la respuesta tiene el formato ApiResponse
   */
  private isApiResponse(response: any): boolean {
    return response && 
           typeof response === 'object' && 
           'success' in response;
  }

  /**
   * ✅ MEJORADO: Manejo de errores seguro
   */
  private handleError(error: any): Observable<never> {
    console.error('❌ Error en JornadaLaboralService:', error);
    
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      console.error(`Código de error: ${error.status}, Mensaje: ${error.message}`);
      
      // ✅ CRÍTICO: Manejo específico por código de estado
      switch (error.status) {
        case 0:
          errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
          break;
        case 400:
          errorMessage = 'Solicitud incorrecta. Verifica los datos enviados.';
          break;
        case 401:
          errorMessage = 'No autorizado. Tu sesión ha expirado.';
          // Limpiar localStorage y redirigir al login
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
          errorMessage = 'Datos de entrada inválidos.';
          
          // ✅ Manejo específico de errores de validación de FastAPI
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
      
      // Verificar si hay un mensaje específico del backend
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}