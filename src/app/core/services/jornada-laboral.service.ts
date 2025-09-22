// jornada-laboral.service.ts - CORREGIDO COMPLETAMENTE

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
   * ✅ CRÍTICO: Obtener primera máquina disponible
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
   * ✅ CRÍTICO: Fichar entrada - LÓGICA CORREGIDA
   */
  ficharEntrada(
    usuario_id: number, 
    notas_inicio?: string, 
    ubicacion?: any
  ): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('🚀 Iniciando fichaje para usuario ID:', usuario_id);

    return this.getFirstAvailableMachine().pipe(
      switchMap((maquinaId: number) => {
        // ✅ CRÍTICO: Crear payload correcto para inicio de jornada
        const payload = {
          maquina_id: maquinaId,
          usuario_id: usuario_id,
          fecha_asignacion: new Date().toISOString(),
          horas_turno: 0  // ✅ 0 = jornada activa (sin finalizar)
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
   * ✅ CRÍTICO: Finalizar jornada - LÓGICA COMPLETAMENTE CORREGIDA
   */
  finalizarJornada(
    jornada_id: number,
    tiempo_descanso: number = 60,
    notas_fin?: string,
    ubicacion?: any,
    forzado: boolean = false
  ): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('🛑 Finalizando jornada ID:', jornada_id);
    console.log('📋 Parámetros:', { tiempo_descanso, notas_fin, forzado });

    // ✅ PASO 1: Obtener el reporte actual para calcular horas trabajadas
    return this.http.get<any>(`${this.API_URL}/${jornada_id}`, this.getHttpOptions()).pipe(
      switchMap(reporteActual => {
        console.log('📋 Reporte actual obtenido:', reporteActual);

        // ✅ PASO 2: Calcular horas trabajadas dinámicamente
        const fechaInicio = new Date(reporteActual.fecha_asignacion);
        const ahora = new Date();
        const diffMs = ahora.getTime() - fechaInicio.getTime();
        
        // Calcular horas trabajadas considerando tiempo de descanso
        const horasTrabajadasDecimal = diffMs / (1000 * 60 * 60);
        const tiempoDescansoHoras = tiempo_descanso / 60;
        const horasNetas = Math.max(1, horasTrabajadasDecimal - tiempoDescansoHoras);
        
        // ✅ CRÍTICO: Convertir a entero pero respetando la lógica de negocio
        let horasEntero: number;
        
        if (forzado) {
          // Si es forzado, usar las horas reales trabajadas
          horasEntero = Math.round(horasNetas);
        } else {
          // Lógica normal: máximo 9 horas regulares, después son extras
          if (horasNetas <= 9) {
            horasEntero = Math.round(horasNetas);
          } else {
            // Si supera 9 horas, registrar como máximo permitido (13h = 9 regulares + 4 extras)
            horasEntero = Math.min(13, Math.round(horasNetas));
          }
        }

        console.log('⏱️ Cálculo de horas:', {
          fechaInicio: fechaInicio.toISOString(),
          ahora: ahora.toISOString(),
          horasTrabajadasDecimal: horasTrabajadasDecimal.toFixed(2),
          tiempoDescansoHoras: tiempoDescansoHoras.toFixed(2),
          horasNetas: horasNetas.toFixed(2),
          horasEntero,
          forzado
        });

        // ✅ PASO 3: Crear payload para actualización
        const payload = {
          maquina_id: reporteActual.maquina_id || 1,
          usuario_id: reporteActual.usuario_id,
          fecha_asignacion: reporteActual.fecha_asignacion,
          horas_turno: horasEntero  // ✅ Horas finales calculadas
        };

        console.log('📤 Payload FINAL para actualizar jornada:', payload);

        // ✅ PASO 4: Actualizar el reporte en el backend
        return this.http.put<any>(`${this.API_URL}/${jornada_id}`, payload, this.getHttpOptions()).pipe(
          retry(1),
          map(response => {
            console.log('📥 Respuesta finalización jornada:', response);
            const mappedResponse = this.mapReporteToJornada(response);
            
            return {
              success: true,
              data: mappedResponse,
              message: `Jornada finalizada correctamente. Horas trabajadas: ${horasEntero}h`
            } as ApiResponse<JornadaLaboralResponse>;
          }),
          catchError(this.handleError.bind(this))
        );
      }),
      catchError(error => {
        console.error('❌ Error obteniendo reporte actual:', error);
        return this.handleError(error);
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
    console.log('🕐 Confirmando horas extras para jornada:', jornada_id);
    
    return this.http.get<any>(`${this.API_URL}/${jornada_id}`, this.getHttpOptions()).pipe(
      switchMap(reporteActual => {
        // Calcular horas extras (permitir hasta 4 horas adicionales = 13h total)
        const fechaInicio = new Date(reporteActual.fecha_asignacion);
        const ahora = new Date();
        const diffMs = ahora.getTime() - fechaInicio.getTime();
        const horasTrabajadasDecimal = diffMs / (1000 * 60 * 60);
        
        // Máximo 13 horas (9 regulares + 4 extras)
        const horasConExtras = Math.min(13, Math.round(horasTrabajadasDecimal));
        
        const payload = {
          maquina_id: reporteActual.maquina_id || 1,
          usuario_id: reporteActual.usuario_id,
          fecha_asignacion: reporteActual.fecha_asignacion,
          horas_turno: horasConExtras
        };

        console.log('📤 Confirmando horas extras con payload:', payload);

        return this.http.put<any>(`${this.API_URL}/${jornada_id}`, payload, this.getHttpOptions()).pipe(
          map(response => {
            const mappedResponse = this.mapReporteToJornada(response);
            mappedResponse.overtime_confirmado = true;
            
            return {
              success: true,
              data: mappedResponse,
              message: `Horas extras confirmadas. Total: ${horasConExtras}h`
            } as ApiResponse<JornadaLaboralResponse>;
          })
        );
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * ✅ CORREGIDO: Rechazar horas extras (finalizar en 9 horas exactas)
   */
  rechazarHorasExtras(
    jornada_id: number,
    tiempo_descanso: number = 60,
    notas_fin?: string
  ): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('❌ Rechazando horas extras para jornada:', jornada_id);
    
    return this.http.get<any>(`${this.API_URL}/${jornada_id}`, this.getHttpOptions()).pipe(
      switchMap(reporteActual => {
        // Finalizar exactamente en 9 horas (jornada regular completa)
        const payload = {
          maquina_id: reporteActual.maquina_id || 1,
          usuario_id: reporteActual.usuario_id,
          fecha_asignacion: reporteActual.fecha_asignacion,
          horas_turno: 9  // ✅ Exactamente 9 horas regulares
        };

        console.log('📤 Rechazando horas extras con payload:', payload);

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
   * ✅ CRÍTICO: Obtener jornada activa
   */
  obtenerJornadaActiva(usuario_id: number): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('📤 Consultando jornada activa para usuario:', usuario_id);

    return this.http.get<any[]>(this.API_URL, this.getHttpOptions()).pipe(
      retry(1),
      map(reportes => {
        console.log('📥 Todos los reportes recibidos:', reportes);
        
        // ✅ CRÍTICO: Buscar reportes del usuario que tengan 0 horas (activos)
        const activeReport = reportes.find(reporte => 
          reporte.usuario_id === usuario_id && reporte.horas_turno === 0
        );

        if (activeReport) {
          console.log('✅ Jornada activa encontrada:', activeReport);
          const mappedJornada = this.mapReporteToJornada(activeReport);
          return {
            success: true,
            data: mappedJornada,
            message: 'Jornada activa encontrada'
          } as ApiResponse<JornadaLaboralResponse>;
        }

        console.log('ℹ️ No se encontró jornada activa');
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
   * ✅ NUEVO: Limpiar jornadas fantasma (reportes con horas_turno = 0 antiguos)
   */
  limpiarJornadasFantasma(usuario_id: number): Observable<void> {
    console.log('🧹 Limpiando jornadas fantasma para usuario:', usuario_id);
    
    return this.http.get<any[]>(this.API_URL, this.getHttpOptions()).pipe(
      map(reportes => {
        console.log('📋 Reportes para limpieza:', reportes.length);
        
        // Buscar reportes activos (horas_turno = 0) del usuario
        const reportesActivos = reportes.filter(reporte => 
          reporte.usuario_id === usuario_id && reporte.horas_turno === 0
        );

        console.log('🔍 Reportes activos encontrados:', reportesActivos.length);

        // Si hay múltiples reportes activos, cerrar los más antiguos
        if (reportesActivos.length > 1) {
          // Ordenar por fecha y mantener solo el más reciente
          reportesActivos.sort((a, b) => 
            new Date(b.fecha_asignacion).getTime() - new Date(a.fecha_asignacion).getTime()
          );

          // Cerrar todos excepto el más reciente
          const reportesAntiguos = reportesActivos.slice(1);
          
          reportesAntiguos.forEach(reporte => {
            console.log('🧹 Cerrando reporte fantasma:', reporte.id);
            
            const payload = {
              maquina_id: reporte.maquina_id || 1,
              usuario_id: reporte.usuario_id,
              fecha_asignacion: reporte.fecha_asignacion,
              horas_turno: 8 // Cerrar con 8 horas por defecto
            };

            this.http.put(`${this.API_URL}/${reporte.id}`, payload, this.getHttpOptions()).subscribe({
              next: () => console.log('✅ Jornada fantasma cerrada:', reporte.id),
              error: err => console.error('❌ Error cerrando jornada fantasma:', err)
            });
          });
        }

        return;
      }),
      catchError(error => {
        console.error('❌ Error limpiando jornadas fantasma:', error);
        return [];
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
    return this.http.get<any[]>(this.API_URL, this.getHttpOptions()).pipe(
      retry(1),
      map(reportes => {
        const jornadasUsuario = reportes
          .filter(reporte => reporte.usuario_id === usuario_id)
          .filter(reporte => reporte.horas_turno > 0) // Solo jornadas finalizadas
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

  /**
   * ✅ Obtener estadísticas del mes
   */
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
            if (reporte.horas_turno === 0) return false; // Solo jornadas finalizadas
            
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
   * ✅ Actualizar estado de jornada
   */
  actualizarEstadoJornada(jornada_id: number): Observable<ApiResponse<JornadaLaboralResponse>> {
    return this.http.get<any>(`${this.API_URL}/${jornada_id}`, this.getHttpOptions()).pipe(
      switchMap(reporteActual => {
        // Solo actualizar timestamp, mantener otros datos igual
        const payload = {
          maquina_id: reporteActual.maquina_id || 1,
          usuario_id: reporteActual.usuario_id,
          fecha_asignacion: reporteActual.fecha_asignacion,
          horas_turno: reporteActual.horas_turno
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
   * ✅ CRÍTICO: Mapear ReporteLaboral del backend a JornadaLaboralResponse
   */
  private mapReporteToJornada(reporte: any): JornadaLaboralResponse {
    const fechaInicio = new Date(reporte.fecha_asignacion);
    const esActiva = reporte.horas_turno === 0;
    
    // Calcular fecha/hora de fin si la jornada está completada
    let fechaFin: Date | null = null;
    if (!esActiva) {
      fechaFin = new Date(fechaInicio.getTime() + (reporte.horas_turno * 60 * 60 * 1000));
    }

    // Calcular horas regulares y extras
    const totalHoras = reporte.horas_turno || 0;
    const horasRegulares = Math.min(totalHoras, 9);
    const horasExtras = Math.max(0, totalHoras - 9);

    return {
      id: reporte.id,
      maquina_id: reporte.maquina_id,
      usuario_id: reporte.usuario_id,
      fecha_asignacion: reporte.fecha_asignacion,
      horas_turno: reporte.horas_turno || 0,
      created: reporte.created,
      updated: reporte.updated,

      // Propiedades calculadas para el frontend
      fecha: fechaInicio.toISOString().split('T')[0],
      hora_inicio: reporte.fecha_asignacion,
      hora_fin: fechaFin ? fechaFin.toISOString() : undefined,
      tiempo_descanso: 60, // Valor por defecto
      horas_regulares: horasRegulares,
      horas_extras: horasExtras,
      total_horas: totalHoras,
      estado: esActiva ? 'activa' : 'completada',
      es_feriado: false,
      limite_regular_alcanzado: totalHoras >= 9,
      overtime_solicitado: totalHoras > 9,
      overtime_confirmado: totalHoras > 9,
      overtime_iniciado: totalHoras > 9 ? reporte.fecha_asignacion : undefined,
      pausa_automatica: false,
      finalizacion_forzosa: false,
      notas_inicio: reporte.notas || '',
      notas_fin: reporte.notas || '',
      advertencia_8h_mostrada: false,
      advertencia_limite_mostrada: false
    };
  }

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