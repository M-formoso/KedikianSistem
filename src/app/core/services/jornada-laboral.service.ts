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

// ✅ AGREGA ESTA INTERFAZ
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

  // ✅ CORREGIDO: Usar el endpoint correcto /iniciar
  ficharEntrada(usuarioId: number, notas?: string): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('🚀 Iniciando jornada para usuario:', usuarioId);
    
    const params = new HttpParams()
      .set('usuario_id', usuarioId.toString())
      .set('notas_inicio', notas || '');

    return this.http.post<JornadaLaboralResponse>(
      `${this.apiUrl}/iniciar`,
      null,
      { params }
    ).pipe(
      map(response => ({
        success: true,
        data: response,
        message: 'Entrada registrada correctamente'
      })),
      catchError(this.handleError.bind(this))
    );
  }

  // ✅ CORREGIDO: Usar el endpoint correcto /finalizar
  finalizarJornada(
    jornadaId: number,
    tiempoDescanso: number = 60,
    notas?: string,
    ubicacion?: any,
    forzado: boolean = false
  ): Observable<ApiResponse<JornadaLaboralResponse>> {
    console.log('🛑 Finalizando jornada ID:', jornadaId);

    const params = new HttpParams()
      .set('tiempo_descanso', tiempoDescanso.toString())
      .set('notas_fin', notas || '')
      .set('forzado', forzado.toString());

    return this.http.post<JornadaLaboralResponse>(
      `${this.apiUrl}/${jornadaId}/finalizar`,
      null,
      { params }
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
          return [{ success: true, data: null, message: 'No hay jornada activa' }];
        }
        return this.handleError(error);
      })
    );
  }

  // ✅ Obtener jornadas del usuario
  obtenerJornadasUsuario(usuarioId: number, limite: number = 10, offset: number = 0): Observable<ApiResponse<JornadaLaboralResponse[]>> {
    const params = new HttpParams()
      .set('limite', limite.toString())
      .set('offset', offset.toString());

    return this.http.get<JornadaLaboralResponse[]>(
      `${this.apiUrl}/usuario/${usuarioId}`,
      { params }
    ).pipe(
      map(jornadas => ({
        success: true,
        data: jornadas,
        message: 'Jornadas obtenidas'
      })),
      catchError(this.handleError.bind(this))
    );
  }

  // ✅ Obtener estadísticas del mes
  obtenerEstadisticasMes(usuarioId: number, mes: number, anio: number): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/estadisticas/usuario/${usuarioId}`
    ).pipe(
      map(stats => ({
        success: true,
        data: stats
      })),
      catchError(this.handleError.bind(this))
    );
  }

  // ✅ Manejo de errores
  private handleError(error: any): Observable<never> {
    console.error('❌ Error en JornadaLaboralService:', error);
    
    let errorMessage = 'Error interno del servidor';
    
    if (error.status === 404) {
      errorMessage = 'Recurso no encontrado';
    } else if (error.status === 400) {
      errorMessage = error.error?.message || 'Solicitud incorrecta';
    } else if (error.status === 422) {
      errorMessage = 'Error de validación. Verifique los datos';
    }
    
    return throwError(() => new Error(errorMessage));
  }
}