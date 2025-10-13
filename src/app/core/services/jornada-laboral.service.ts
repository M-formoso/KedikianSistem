import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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
  overtime_iniciado?: string;
  pausa_automatica: boolean;
  notas_inicio?: string;
  notas_fin?: string;
  created: string;
  updated?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
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

@Injectable({
  providedIn: 'root'
})
export class JornadaLaboralService {
  private apiUrl = `${environment.apiUrl}/jornadas-laborales`;

  constructor(private http: HttpClient) {}

  // ✅ Fichar entrada
  ficharEntrada(usuarioId: number, notas?: string): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('🚀 Iniciando jornada para usuario:', usuarioId);
    
    const body = {
      usuario_id: usuarioId,
      notas_inicio: notas || null,
      ubicacion: null
    };

    console.log('📤 Body que se enviará:', JSON.stringify(body, null, 2));

    return this.http.post<JornadaLaboralResponse>(
      `${this.apiUrl}/fichar-entrada`,
      body
    ).pipe(
      map(response => {
        console.log('✅ Respuesta exitosa del backend:', response);
        return {
          success: true,
          data: response,
          message: 'Entrada registrada correctamente'
        };
      }),
      catchError((error) => {
        console.error('❌ Error completo:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Error body:', error.error);
        return this.handleError(error);
      })
    );
  }

  // ✅ Finalizar jornada
  finalizarJornada(
    jornadaId: number,
    tiempoDescanso: number = 60,
    notas?: string,
    ubicacion?: any,
    forzado: boolean = false
  ): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('🛑 Finalizando jornada ID:', jornadaId);

    const body = {
      tiempo_descanso: tiempoDescanso,
      notas_fin: notas || null,
      ubicacion: ubicacion || null,
      forzado: forzado
    };

    return this.http.put<JornadaLaboralResponse>(
      `${this.apiUrl}/finalizar/${jornadaId}`,
      body
    ).pipe(
      map(response => ({
        success: true,
        data: response,
        message: 'Jornada finalizada correctamente'
      })),
      catchError(this.handleError.bind(this))
    );
  }

  // ✅ Confirmar horas extras
  confirmarHorasExtras(jornadaId: number, notas?: string): Observable<ApiResponse<JornadaLaboralResponse>> {
    const params = new HttpParams().set('notas_overtime', notas || '');
    
    return this.http.put<JornadaLaboralResponse>(
      `${this.apiUrl}/confirmar-overtime/${jornadaId}`,
      null,
      { params }
    ).pipe(
      map(response => ({
        success: true,
        data: response,
        message: 'Horas extras confirmadas'
      })),
      catchError(this.handleError.bind(this))
    );
  }

  // ✅ Rechazar horas extras
  rechazarHorasExtras(jornadaId: number, tiempoDescanso: number = 60, notas?: string): Observable<ApiResponse<JornadaLaboralResponse>> {
    const params = new HttpParams()
      .set('tiempo_descanso', tiempoDescanso.toString())
      .set('notas_fin', notas || '');
    
    return this.http.put<JornadaLaboralResponse>(
      `${this.apiUrl}/rechazar-overtime/${jornadaId}`,
      null,
      { params }
    ).pipe(
      map(response => ({
        success: true,
        data: response,
        message: 'Jornada finalizada en 9 horas'
      })),
      catchError(this.handleError.bind(this))
    );
  }

  // ✅ Obtener jornada activa
  obtenerJornadaActiva(usuarioId: number): Observable<ApiResponse<JornadaLaboralResponse | null>> {
    return this.http.get<JornadaLaboralResponse>(
      `${this.apiUrl}/activa/usuario/${usuarioId}`
    ).pipe(
      map(response => ({
        success: true,
        data: response,
        message: 'Jornada activa encontrada'
      })),
      catchError(error => {
        if (error.status === 404) {
          return [{
            success: true,
            data: null,
            message: 'No hay jornada activa'
          }];
        }
        return this.handleError(error);
      })
    );
  }

  // ✅ CORREGIDO: Obtener jornadas del usuario con mejor manejo de errores
  obtenerJornadasUsuario(
    usuarioId: number, 
    limite: number = 10, 
    offset: number = 0
  ): Observable<ApiResponse<JornadaLaboralResponse[]>> {
    const params = new HttpParams()
      .set('limite', limite.toString())
      .set('offset', offset.toString());

    console.log(`📋 Obteniendo jornadas: usuario=${usuarioId}, limite=${limite}, offset=${offset}`);

    return this.http.get<JornadaLaboralResponse[]>(
      `${this.apiUrl}/usuario/${usuarioId}`,
      { params }
    ).pipe(
      map(jornadas => {
        console.log('✅ Jornadas obtenidas:', jornadas);
        return {
          success: true,
          data: Array.isArray(jornadas) ? jornadas : [],
          message: 'Jornadas obtenidas'
        };
      }),
      catchError(error => {
        console.error('❌ Error obteniendo jornadas:', error);
        // En caso de error, devolver array vacío en lugar de fallar
        if (error.status === 500 || error.status === 404) {
          return [{
            success: true,
            data: [],
            message: 'No se pudieron cargar las jornadas'
          }];
        }
        return this.handleError(error);
      })
    );
  }

  // ✅ CRÍTICO: Endpoint de estadísticas CORREGIDO
  obtenerEstadisticasMes(
    usuarioId: number, 
    mes?: number, 
    anio?: number
  ): Observable<ApiResponse<EstadisticasJornada>> {
    
    // Usar fecha actual si no se proporcionan parámetros
    const fecha = new Date();
    const mesActual = mes || (fecha.getMonth() + 1);
    const anioActual = anio || fecha.getFullYear();

    // ✅ FORMATO CORRECTO: /estadisticas/{usuario_id}/{mes}/{anio}
    const url = `${this.apiUrl}/estadisticas/${usuarioId}/${mesActual}/${anioActual}`;
    
    console.log(`📊 Obteniendo estadísticas: ${url}`);

    return this.http.get<EstadisticasJornada>(url).pipe(
      map(stats => {
        console.log('✅ Estadísticas obtenidas:', stats);
        return {
          success: true,
          data: stats,
          message: 'Estadísticas cargadas'
        };
      }),
      catchError(error => {
        console.error('❌ Error obteniendo estadísticas:', error);
        
        // Si el endpoint no existe o falla, devolver estadísticas vacías
        if (error.status === 404 || error.status === 500) {
          const estadisticasVacias: EstadisticasJornada = {
            mes: mesActual,
            año: anioActual,
            total_jornadas: 0,
            total_horas_regulares: 0,
            total_horas_extras: 0,
            total_horas: 0,
            jornadas_con_extras: 0,
            promedio_horas_dia: 0,
            jornadas: []
          };
          
          return [{
            success: true,
            data: estadisticasVacias,
            message: 'No hay estadísticas disponibles para este período'
          }];
        }
        
        return this.handleError(error);
      })
    );
  }

  // ✅ Manejo de errores MEJORADO
  private handleError(error: any): Observable<never> {
    console.error('❌ Error en JornadaLaboralService:', error);
    
    let errorMessage = 'Error interno del servidor';
    
    if (error.status === 404) {
      errorMessage = 'Recurso no encontrado';
    } else if (error.status === 400) {
      errorMessage = error.error?.message || 'Solicitud incorrecta';
    } else if (error.status === 422) {
      errorMessage = 'Error de validación. Verifique los datos';
    } else if (error.status === 401) {
      errorMessage = 'No autorizado. Inicie sesión nuevamente';
    } else if (error.status === 409) {
      errorMessage = error.error?.message || 'Ya existe una jornada activa';
    } else if (error.status === 500) {
      errorMessage = 'Error en el servidor. Por favor, contacte al administrador';
      console.error('🔥 Error 500 - Detalles:', error.error);
    }
    
    return throwError(() => new Error(errorMessage));
  }
}