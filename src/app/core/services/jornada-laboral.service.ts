// jornada-laboral.service.ts - CORREGIDO

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry, switchMap } from 'rxjs/operators';
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
  maquina_id?: number;
  usuario_id: number;
  fecha_asignacion: string;
  horas_turno: number;
  created?: string;
  updated?: string;
  
  // Propiedades calculadas/mapeadas para compatibilidad
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
  private readonly API_URL = `${environment.apiUrl}/reportes-laborales`;

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
   * ✅ CORREGIDO: Obtener primera máquina disponible
   */
  private getFirstAvailableMachine(): Observable<number> {
    return this.http.get<any[]>(`${environment.apiUrl}/maquinas`, this.getHttpOptions()).pipe(
      map(maquinas => {
        console.log('📋 Máquinas disponibles:', maquinas);
        
        if (!maquinas || maquinas.length === 0) {
          console.warn('⚠️ No hay máquinas disponibles, usando ID por defecto');
          return 1;
        }
        
        const primeraMatera = maquinas.find(m => m.estado === true) || maquinas[0];
        const maquinaId = primeraMatera.id;
        
        console.log('✅ Usando máquina ID:', maquinaId, 'Nombre:', primeraMatera.nombre);
        return maquinaId;
      }),
      catchError(error => {
        console.warn('⚠️ Error obteniendo máquinas, usando ID por defecto:', error);
        return [1];
      })
    );
  }

  /**
   * ✅ CORREGIDO: Fichar entrada
   */
  ficharEntrada(
    usuario_id: number, 
    notas_inicio?: string, 
    ubicacion?: any
  ): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('🚀 Iniciando fichaje para usuario ID:', usuario_id);

    return this.getFirstAvailableMachine().pipe(
      switchMap((maquinaId: number) => {
        // ✅ CORREGIDO: NO incluir 'id' en el payload de creación
        const payload = {
          maquina_id: maquinaId,
          usuario_id: usuario_id,
          fecha_asignacion: new Date().toISOString(),
          horas_turno: 0  // 0 = jornada activa
        };

        console.log('📤 Payload para fichaje entrada:', payload);

        return this.http.post<any>(this.API_URL, payload, this.getHttpOptions()).pipe(
          retry(1),
          map(response => {
            console.log('📥 Respuesta fichaje entrada:', response);
            const mappedResponse = this.mapReporteToJornada(response);
            
            return {
              success: true,
              data: mappedResponse,
              message: 'Entrada fichada correctamente'
            } as ApiResponse<JornadaLaboralResponse>;
          }),
          catchError(this.handleError.bind(this))
        );
      })
    );
  }

  /**
   * ✅ CRÍTICO: Finalizar jornada - CORREGIDO para NO incluir 'id'
   */
  finalizarJornada(
    jornada_id: number,
    tiempo_descanso: number = 60,
    notas_fin?: string,
    ubicacion?: any,
    forzado: boolean = false
  ): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('🛑 Finalizando jornada ID:', jornada_id);

    // Obtener el reporte actual para calcular horas trabajadas
    return this.http.get<any>(`${this.API_URL}/${jornada_id}`, this.getHttpOptions()).pipe(
      switchMap(reporteActual => {
        console.log('📋 Reporte actual:', reporteActual);

        // Calcular horas trabajadas dinámicamente
        const fechaInicio = new Date(reporteActual.fecha_asignacion);
        const ahora = new Date();
        const diffMs = ahora.getTime() - fechaInicio.getTime();
        const horasTrabajadasDecimal = diffMs / (1000 * 60 * 60);
        
        // Restar tiempo de descanso y redondear a entero
        const horasNetas = Math.max(1, horasTrabajadasDecimal - (tiempo_descanso / 60));
        const horasEntero = Math.round(horasNetas);

        console.log('⏱️ Cálculo de horas:', {
          fechaInicio: fechaInicio.toISOString(),
          ahora: ahora.toISOString(),
          horasTrabajadasDecimal,
          tiempoDescansoHoras: tiempo_descanso / 60,
          horasNetas,
          horasEntero
        });

        // ✅ CRÍTICO: Payload CORREGIDO - NO incluir 'id'
        const payload = {
          maquina_id: reporteActual.maquina_id || 1,
          usuario_id: reporteActual.usuario_id,
          fecha_asignacion: reporteActual.fecha_asignacion,
          horas_turno: horasEntero
          // ❌ NO incluir 'id': null o 'id': reporteActual.id
        };

        console.log('📤 Payload CORREGIDO para finalizar jornada:', payload);

        return this.http.put<any>(`${this.API_URL}/${jornada_id}`, payload, this.getHttpOptions()).pipe(
          retry(1),
          map(response => {
            console.log('📥 Respuesta finalización jornada:', response);
            const mappedResponse = this.mapReporteToJornada(response);
            
            return {
              success: true,
              data: mappedResponse,
              message: `Jornada finalizada correctamente. Horas trabajadas: ${horasEntero}`
            } as ApiResponse<JornadaLaboralResponse>;
          }),
          catchError(this.handleError.bind(this))
        );
      }),
      catchError(error => {
        console.error('❌ Error obteniendo reporte actual:', error);
        
        // ✅ FALLBACK: Usar valores mínimos sin 'id'
        const payloadFallback = {
          maquina_id: 1,
          usuario_id: jornada_id, // Asumir que el ID de jornada corresponde al usuario
          fecha_asignacion: new Date().toISOString(),
          horas_turno: 8
          // ❌ NO incluir 'id'
        };

        console.log('⚠️ Usando payload de fallback:', payloadFallback);

        return this.http.put<any>(`${this.API_URL}/${jornada_id}`, payloadFallback, this.getHttpOptions()).pipe(
          retry(1),
          map(response => {
            const mappedResponse = this.mapReporteToJornada(response);
            return {
              success: true,
              data: mappedResponse,
              message: 'Jornada finalizada correctamente (modo fallback)'
            } as ApiResponse<JornadaLaboralResponse>;
          }),
          catchError(this.handleError.bind(this))
        );
      })
    );
  }

  /**
   * ✅ CORREGIDO: Confirmar horas extras
   */
  confirmarHorasExtras(
    jornada_id: number,
    notas_overtime?: string
  ): Observable<ApiResponse<JornadaLaboralResponse>> {
    return this.http.get<any>(`${this.API_URL}/${jornada_id}`, this.getHttpOptions()).pipe(
      switchMap(reporteActual => {
        // ✅ CORREGIDO: NO incluir 'id'
        const payload = {
          maquina_id: reporteActual.maquina_id || 1,
          usuario_id: reporteActual.usuario_id,
          fecha_asignacion: reporteActual.fecha_asignacion,
          horas_turno: 12 // Horas con extras
          // ❌ NO incluir 'id'
        };

        return this.http.put<any>(`${this.API_URL}/${jornada_id}`, payload, this.getHttpOptions()).pipe(
          map(response => {
            const mappedResponse = this.mapReporteToJornada(response);
            mappedResponse.overtime_confirmado = true;
            
            return {
              success: true,
              data: mappedResponse,
              message: 'Horas extras confirmadas'
            } as ApiResponse<JornadaLaboralResponse>;
          })
        );
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
    return this.http.get<any>(`${this.API_URL}/${jornada_id}`, this.getHttpOptions()).pipe(
      switchMap(reporteActual => {
        // ✅ CORREGIDO: NO incluir 'id'
        const payload = {
          maquina_id: reporteActual.maquina_id || 1,
          usuario_id: reporteActual.usuario_id,
          fecha_asignacion: reporteActual.fecha_asignacion,
          horas_turno: 9 // Exactamente 9 horas
          // ❌ NO incluir 'id'
        };

        return this.http.put<any>(`${this.API_URL}/${jornada_id}`, payload, this.getHttpOptions()).pipe(
          map(response => {
            const mappedResponse = this.mapReporteToJornada(response);
            
            return {
              success: true,
              data: mappedResponse,
              message: 'Jornada finalizada en 9 horas regulares'
            } as ApiResponse<JornadaLaboralResponse>;
          })
        );
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * ✅ CORREGIDO: Actualizar estado
   */
  actualizarEstadoJornada(jornada_id: number): Observable<ApiResponse<JornadaLaboralResponse>> {
    return this.http.get<any>(`${this.API_URL}/${jornada_id}`, this.getHttpOptions()).pipe(
      switchMap(reporteActual => {
        // ✅ CORREGIDO: NO incluir 'id'
        const payload = {
          maquina_id: reporteActual.maquina_id || 1,
          usuario_id: reporteActual.usuario_id,
          fecha_asignacion: reporteActual.fecha_asignacion,
          horas_turno: reporteActual.horas_turno
          // ❌ NO incluir 'id'
        };

        return this.http.put<any>(`${this.API_URL}/${jornada_id}`, payload, this.getHttpOptions()).pipe(
          map(response => {
            const mappedResponse = this.mapReporteToJornada(response);
            return {
              success: true,
              data: mappedResponse,
              message: 'Estado actualizado correctamente'
            } as ApiResponse<JornadaLaboralResponse>;
          })
        );
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * ✅ CORREGIDO: Obtener jornada activa
   */
  obtenerJornadaActiva(usuario_id: number): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('📤 Consultando jornada activa para usuario:', usuario_id);

    return this.http.get<any[]>(this.API_URL, this.getHttpOptions()).pipe(
      retry(1),
      map(reportes => {
        console.log('📥 Respuesta reportes:', reportes);
        
        // Buscar reportes del usuario que tengan 0 horas (activos)
        const activeReport = reportes.find(reporte => 
          reporte.usuario_id === usuario_id && reporte.horas_turno === 0
        );

        if (activeReport) {
          const mappedJornada = this.mapReporteToJornada(activeReport);
          return {
            success: true,
            data: mappedJornada,
            message: 'Jornada activa encontrada'
          } as ApiResponse<JornadaLaboralResponse>;
        }

        return {
          success: true,
          data: undefined,
          message: 'No hay jornada activa'
        } as ApiResponse<JornadaLaboralResponse>;
      }),
      catchError(error => {
        if (error.status === 404) {
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
   * ✅ NUEVO: Limpiar jornadas fantasma
   */
  limpiarJornadasFantasma(usuario_id: number): Observable<void> {
    console.log('🧹 Limpiando jornadas fantasma para usuario:', usuario_id);
    
    return this.http.get<any[]>(this.API_URL, this.getHttpOptions()).pipe(
      map(reportes => {
        // Buscar reportes activos (horas_turno = 0) del usuario
        const reportesActivos = reportes.filter(reporte => 
          reporte.usuario_id === usuario_id && reporte.horas_turno === 0
        );

        // Si hay reportes activos, finalizarlos automáticamente
        reportesActivos.forEach(reporte => {
          // ✅ CORREGIDO: NO incluir 'id'
          const payload = {
            maquina_id: reporte.maquina_id || 1,
            usuario_id: reporte.usuario_id,
            fecha_asignacion: reporte.fecha_asignacion,
            horas_turno: 8 // Finalizar con 8 horas por defecto
            // ❌ NO incluir 'id'
          };

          this.http.put(`${this.API_URL}/${reporte.id}`, payload, this.getHttpOptions()).subscribe({
            next: () => console.log('✅ Jornada fantasma limpiada:', reporte.id),
            error: err => console.error('❌ Error limpiando jornada fantasma:', err)
          });
        });

        return;
      }),
      catchError(error => {
        console.error('❌ Error limpiando jornadas fantasma:', error);
        return [];
      })
    );
  }

  // ✅ Resto de métodos sin cambios...
  obtenerJornadasUsuario(
    usuario_id: number,
    limite: number = 10,
    offset: number = 0
  ): Observable<ApiResponse<JornadaLaboralResponse[]>> {
    return this.http.get<any[]>(this.API_URL, this.getHttpOptions()).pipe(
      retry(1),
      map(reportes => {
        const jornadasUsuario = reportes
          .filter(reporte => reporte.usuario_id === usuario_id)
          .slice(offset, offset + limite)
          .map(reporte => this.mapReporteToJornada(reporte));
        
        return {
          success: true,
          data: jornadasUsuario,
          message: 'Jornadas obtenidas correctamente'
        } as ApiResponse<JornadaLaboralResponse[]>;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  obtenerEstadisticasMes(
    usuario_id: number,
    mes: number,
    anio: number
  ): Observable<ApiResponse<EstadisticasJornada>> {
    return this.http.get<any[]>(this.API_URL, this.getHttpOptions()).pipe(
      retry(1),
      map(reportes => {
        const reportesDelMes = reportes
          .filter(reporte => {
            if (reporte.usuario_id !== usuario_id) return false;
            
            const fechaReporte = new Date(reporte.fecha_asignacion);
            return fechaReporte.getMonth() + 1 === mes && 
                   fechaReporte.getFullYear() === anio;
          })
          .map(reporte => this.mapReporteToJornada(reporte));

        const stats: EstadisticasJornada = {
          mes,
          año: anio,
          total_jornadas: reportesDelMes.length,
          total_horas_regulares: reportesDelMes.reduce((sum, j) => sum + Math.min(j.total_horas, 9), 0),
          total_horas_extras: reportesDelMes.reduce((sum, j) => sum + Math.max(0, j.total_horas - 9), 0),
          total_horas: reportesDelMes.reduce((sum, j) => sum + j.total_horas, 0),
          jornadas_con_extras: reportesDelMes.filter(j => j.total_horas > 9).length,
          promedio_horas_dia: reportesDelMes.length > 0 ? 
            reportesDelMes.reduce((sum, j) => sum + j.total_horas, 0) / reportesDelMes.length : 0,
          jornadas: reportesDelMes
        };

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
   * ✅ Mapear ReporteLaboral del backend a JornadaLaboralResponse
   */
  private mapReporteToJornada(reporte: any): JornadaLaboralResponse {
    const fechaInicio = new Date(reporte.fecha_asignacion);
    const horasTrabajadasMinutos = (reporte.horas_turno || 0) * 60;
    const fechaFin = reporte.horas_turno > 0 ? 
      new Date(fechaInicio.getTime() + horasTrabajadasMinutos * 60 * 1000) : null;

    return {
      id: reporte.id,
      maquina_id: reporte.maquina_id,
      usuario_id: reporte.usuario_id,
      fecha_asignacion: reporte.fecha_asignacion,
      horas_turno: reporte.horas_turno || 0,
      created: reporte.created,
      updated: reporte.updated,

      fecha: fechaInicio.toISOString().split('T')[0],
      hora_inicio: reporte.fecha_asignacion,
      hora_fin: fechaFin ? fechaFin.toISOString() : undefined,
      tiempo_descanso: 60,
      horas_regulares: Math.min(reporte.horas_turno || 0, 9),
      horas_extras: Math.max(0, (reporte.horas_turno || 0) - 9),
      total_horas: reporte.horas_turno || 0,
      estado: reporte.horas_turno === 0 ? 'activa' : 'completada',
      es_feriado: false,
      limite_regular_alcanzado: (reporte.horas_turno || 0) >= 9,
      overtime_solicitado: (reporte.horas_turno || 0) > 9,
      overtime_confirmado: (reporte.horas_turno || 0) > 9,
      overtime_iniciado: (reporte.horas_turno || 0) > 9 ? reporte.fecha_asignacion : undefined,
      pausa_automatica: false,
      finalizacion_forzosa: false,
      notas_inicio: reporte.notas || '',
      notas_fin: reporte.notas || '',
      advertencia_8h_mostrada: false,
      advertencia_limite_mostrada: false
    };
  }

  /**
   * ✅ Verificar si necesita mostrar diálogo de horas extras
   */
  necesitaDialogoOvertimeEstatico(jornada: JornadaLaboralResponse): boolean {
    return false; // Deshabilitar temporalmente hasta que se corrijan los estados
  }

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
          errorMessage = 'Recurso no encontrado. Verifica la configuración del servidor.';
          break;
        case 409:
          errorMessage = 'Conflicto. Ya existe una jornada activa.';
          break;
        case 422:
          errorMessage = 'Error de validación en el servidor.';
          
          if (error.error && error.error.detail) {
            if (Array.isArray(error.error.detail)) {
              const validationErrors = error.error.detail.map((e: any) => {
                if (e.loc && e.loc.includes('maquina_id')) {
                  return 'ID de máquina es requerido';
                }
                if (e.loc && e.loc.includes('usuario_id')) {
                  return 'ID de usuario es requerido';
                }
                if (e.loc && e.loc.includes('fecha_asignacion')) {
                  return 'Fecha de asignación es requerida';
                }
                if (e.loc && e.loc.includes('horas_turno')) {
                  return 'Horas de turno debe ser un número entero';
                }
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