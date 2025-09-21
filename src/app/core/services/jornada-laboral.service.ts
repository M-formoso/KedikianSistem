// src/app/core/services/jornada-laboral.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  // ============ MÉTODOS DE FICHAJE ============

  /**
   * Fichar entrada - Iniciar jornada laboral
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

    return this.http.post<ApiResponse<JornadaLaboralResponse>>(
      `${this.API_URL}/fichar-entrada`, 
      body,
      {
        params: { usuario_id: usuario_id.toString() }
      }
    );
  }

  /**
   * Finalizar jornada laboral
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

    return this.http.put<ApiResponse<JornadaLaboralResponse>>(
      `${this.API_URL}/finalizar/${jornada_id}`, 
      body
    );
  }

  /**
   * Confirmar horas extras
   */
  confirmarHorasExtras(
    jornada_id: number,
    notas_overtime?: string
  ): Observable<ApiResponse<JornadaLaboralResponse>> {
    const body = {
      notas_overtime
    };

    return this.http.put<ApiResponse<JornadaLaboralResponse>>(
      `${this.API_URL}/confirmar-overtime/${jornada_id}`, 
      body
    );
  }

  /**
   * Rechazar horas extras
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

    return this.http.put<ApiResponse<JornadaLaboralResponse>>(
      `${this.API_URL}/rechazar-overtime/${jornada_id}`, 
      body
    );
  }

  // ============ MÉTODOS DE CONSULTA ============

  /**
   * Obtener jornada activa de un usuario
   */
  obtenerJornadaActiva(usuario_id: number): Observable<ApiResponse<JornadaLaboralResponse>> {
    return this.http.get<ApiResponse<JornadaLaboralResponse>>(
      `${this.API_URL}/activa/${usuario_id}`
    );
  }

  /**
   * Obtener jornadas de un usuario
   */
  obtenerJornadasUsuario(
    usuario_id: number,
    limite: number = 10,
    offset: number = 0
  ): Observable<ApiResponse<JornadaLaboralResponse[]>> {
    const params = new HttpParams()
      .set('limite', limite.toString())
      .set('offset', offset.toString());

    return this.http.get<ApiResponse<JornadaLaboralResponse[]>>(
      `${this.API_URL}/usuario/${usuario_id}`,
      { params }
    );
  }

  /**
   * Obtener jornadas por periodo
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

    return this.http.get<ApiResponse<JornadaLaboralResponse[]>>(
      `${this.API_URL}/periodo`,
      { params }
    );
  }

  /**
   * Obtener estadísticas del mes
   */
  obtenerEstadisticasMes(
    usuario_id: number,
    mes: number,
    anio: number
  ): Observable<ApiResponse<EstadisticasJornada>> {
    return this.http.get<ApiResponse<EstadisticasJornada>>(
      `${this.API_URL}/estadisticas/${usuario_id}/${mes}/${anio}`
    );
  }

  // ============ MÉTODOS DE CONTROL ============

  /**
   * Actualizar estado de jornada
   */
  actualizarEstadoJornada(jornada_id: number): Observable<ApiResponse<JornadaLaboralResponse>> {
    return this.http.put<ApiResponse<JornadaLaboralResponse>>(
      `${this.API_URL}/actualizar-estado/${jornada_id}`,
      {}
    );
  }

  /**
   * Verificar jornadas activas
   */
  verificarJornadasActivas(): Observable<ApiResponse<JornadaLaboralResponse[]>> {
    return this.http.get<ApiResponse<JornadaLaboralResponse[]>>(
      `${this.API_URL}/verificar-activas`
    );
  }

  /**
   * Obtener resumen del día
   */
  obtenerResumenDia(
    usuario_id: number,
    fecha: string
  ): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.API_URL}/resumen-dia/${usuario_id}/${fecha}`
    );
  }

  // ============ MÉTODOS DE UTILIDAD ============

  /**
   * Calcular tiempo restante para diferentes límites
   */
  calcularTiempoRestante(jornada_id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.API_URL}/tiempo-restante/${jornada_id}`
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
   * Verificar si necesita mostrar diálogo de horas extras
   */
  necesitaDialogoOvertimeEstatico(jornada: JornadaLaboralResponse): boolean {
    return jornada.limite_regular_alcanzado && 
           !jornada.overtime_confirmado && 
           jornada.estado === 'pausada' &&
           jornada.pausa_automatica;
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
}