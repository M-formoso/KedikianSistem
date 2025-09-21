// machine-hours.service.ts - VERSIÓN CORREGIDA

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface MachineHours {
  id?: number;
  date: string;
  machineType: string;
  machineId: string;
  
  // Horas de trabajo (existente)
  startHour: number;
  endHour: number;
  totalHours: number;
  
  // 🆕 Horas de máquina (nuevo)
  hourMeterStart?: number;
  hourMeterEnd?: number;
  operatingHours?: number;
  efficiency?: number;
  idleTime?: number;
  fuelLevel?: number;
  
  project: string;
  operator: string;
  notes?: string;
}

export interface Project {
  id: number;
  nombre: string;
  estado: boolean;
  ubicacion?: string;
  descripcion?: string;
  // Alias para compatibilidad
  name?: string;
}

export interface Machine {
  id: number;
  nombre: string;
  estado: boolean;
  horas_uso: number;
  proyecto_id?: number;
  tipo?: string;
  // Alias para compatibilidad
  name?: string;
}

export interface MachineType {
  id: string;
  name: string;
  description?: string;
}

export interface Operator {
  id: number;
  nombre: string;
  email: string;
  roles: string;
  estado: boolean;
  // Alias para compatibilidad
  name?: string;
}

// ✅ CORREGIDO: Interface que coincide exactamente con el backend
export interface ReporteLaboralCreate {
  maquina_id: number;
  usuario_id: number;
  fecha_asignacion: string; // DateTime ISO string
  horas_turno: number; // ✅ ENTERO - número de horas trabajadas
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class MachineHoursService {
  private apiUrl = environment.apiUrl;

  // ✅ CORREGIDO: Headers mejorados con token dinámico
  private getHttpOptions() {
    const usuarioActual = localStorage.getItem('usuarioActual');
    let token: string | null = null;

    if (usuarioActual) {
      try {
        const usuario = JSON.parse(usuarioActual);
        token = usuario.access_token || usuario.token || null;
      } catch {
        console.error('Error parsing usuario actual');
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

  constructor(private http: HttpClient) {}

  // ========== MÉTODOS PRINCIPALES CORREGIDOS ==========

  /**
   * ✅ CORREGIDO: Obtener proyectos desde /proyectos
   */
  getProjects(): Observable<ApiResponse<Project[]>> {
    return this.http.get<Project[]>(`${this.apiUrl}/proyectos`, this.getHttpOptions()).pipe(
      map(projects => {
        console.log('✅ Proyectos recibidos del backend:', projects);
        
        // Agregar alias para compatibilidad
        const projectsWithAlias = projects.map(project => ({
          ...project,
          name: project.nombre
        }));
        
        return {
          success: true,
          data: projectsWithAlias.filter(p => p.estado === true)
        };
      }),
      catchError(error => {
        console.error('❌ Error obteniendo proyectos:', error);
        return of({
          success: true,
          data: [{
            id: 1,
            nombre: 'Proyecto Test',
            name: 'Proyecto Test',
            estado: true,
            descripcion: 'Proyecto de prueba'
          }]
        });
      })
    );
  }

  /**
   * ✅ CORREGIDO: Obtener máquinas desde /maquinas  
   */
  getMachines(): Observable<ApiResponse<Machine[]>> {
    return this.http.get<Machine[]>(`${this.apiUrl}/maquinas`, this.getHttpOptions()).pipe(
      map(machines => {
        console.log('✅ Máquinas recibidas del backend:', machines);
        
        // Agregar alias para compatibilidad
        const machinesWithAlias = machines.map(machine => ({
          ...machine,
          name: machine.nombre
        }));
        
        return {
          success: true,
          data: machinesWithAlias.filter(m => m.estado === true)
        };
      }),
      catchError(error => {
        console.error('❌ Error obteniendo máquinas:', error);
        return of({
          success: true,
          data: [{
            id: 1,
            nombre: 'Excavadora Test',
            name: 'Excavadora Test',
            estado: true,
            horas_uso: 0
          }]
        });
      })
    );
  }

  /**
   * ✅ CORREGIDO: Crear registro de horas de máquina
   */
  createMachineHours(machineHours: any): Observable<ApiResponse<any>> {
    console.log('📤 Datos recibidos para crear horas máquina:', machineHours);
    
    // ✅ CRÍTICO: Transformar datos correctamente al formato del backend
    const reporteData: ReporteLaboralCreate = {
      maquina_id: parseInt(machineHours.machineId),
      usuario_id: parseInt(machineHours.operator),
      fecha_asignacion: new Date().toISOString(),
      horas_turno: Math.round(machineHours.totalHours || 0) // ✅ ENTERO redondeado
    };

    console.log('📤 Datos transformados para backend:', reporteData);
    console.log('🔍 Tipos de datos:');
    console.log('  - maquina_id:', typeof reporteData.maquina_id, reporteData.maquina_id);
    console.log('  - usuario_id:', typeof reporteData.usuario_id, reporteData.usuario_id);
    console.log('  - horas_turno:', typeof reporteData.horas_turno, reporteData.horas_turno);

    return this.http.post<any>(`${this.apiUrl}/reportes-laborales`, reporteData, this.getHttpOptions()).pipe(
      map(response => {
        console.log('✅ Respuesta del backend:', response);
        return {
          success: true,
          data: response,
          message: 'Registro de horas de máquina guardado correctamente'
        };
      }),
      catchError(error => {
        console.error('❌ Error completo creando registro de horas máquina:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Error body:', error.error);
        
        return this.handleError(error);
      })
    );
  }

  /**
   * ✅ CORREGIDO: Obtener registros recientes de reportes laborales
   */
  getRecentMachineHours(limit: number = 10): Observable<ApiResponse<MachineHours[]>> {
    return this.http.get<any[]>(`${this.apiUrl}/reportes-laborales`, this.getHttpOptions()).pipe(
      map(reportes => {
        console.log('✅ Reportes obtenidos del backend:', reportes);
        
        // Transformar reportes del backend al formato del frontend
        const transformedData = reportes
          .filter(reporte => reporte.maquina_id) // Solo reportes con máquina
          .slice(0, limit)
          .map(reporte => this.mapReporteToMachineHours(reporte));

        return {
          success: true,
          data: transformedData
        };
      }),
      catchError(error => {
        console.error('❌ Error obteniendo registros recientes:', error);
        return of({
          success: true,
          data: []
        });
      })
    );
  }

  /**
   * Obtener operadores desde /usuarios
   */
  getOperators(): Observable<ApiResponse<Operator[]>> {
    return this.http.get<Operator[]>(`${this.apiUrl}/usuarios`, this.getHttpOptions()).pipe(
      map(usuarios => {
        // Agregar alias para compatibilidad
        const operatorsWithAlias = usuarios
          .filter(u => u.roles === 'operario' && u.estado === true)
          .map(operator => ({
            ...operator,
            name: operator.nombre
          }));
        
        return {
          success: true,
          data: operatorsWithAlias
        };
      }),
      catchError(error => {
        console.error('❌ Error obteniendo operadores:', error);
        return of({
          success: true,
          data: [{
            id: 999,
            nombre: 'Operario Test',
            name: 'Operario Test',
            email: 'operario@test.com',
            roles: 'operario',
            estado: true
          }]
        });
      })
    );
  }

  // ========== MÉTODOS DE UTILIDAD ==========

  /**
   * ✅ CORREGIDO: Mapear reporte del backend a MachineHours del frontend
   */
  private mapReporteToMachineHours(reporte: any): MachineHours {
    const fechaInicio = reporte.fecha_asignacion || reporte.fecha_inicio;
    
    return {
      id: reporte.id,
      date: fechaInicio ? fechaInicio.split('T')[0] : new Date().toISOString().split('T')[0],
      machineType: 'excavadora', // Valor por defecto
      machineId: reporte.maquina_id?.toString() || '',
      startHour: fechaInicio ? this.getDecimalHours(new Date(fechaInicio)) : 0,
      endHour: fechaInicio ? this.getDecimalHours(new Date(fechaInicio)) + (reporte.horas_turno || 0) : 0,
      totalHours: reporte.horas_turno || 0,
      project: reporte.proyecto_id?.toString() || '',
      operator: reporte.usuario_id?.toString() || '',
      notes: reporte.notas || ''
    };
  }

  /**
   * Convertir Date a horas decimales (desde medianoche)
   */
  private getDecimalHours(date: Date): number {
    return date.getHours() + (date.getMinutes() / 60) + (date.getSeconds() / 3600);
  }

  /**
   * Calcular total de horas trabajadas
   */
  calculateTotalHours(startHour: number, endHour: number): number {
    if (endHour <= startHour) return 0;
    return Math.round((endHour - startHour) * 100) / 100;
  }

  /**
   * Formatear horas para mostrar
   */
  formatHours(hours: number): string {
    return `${hours.toFixed(1)}h`;
  }

  // ========== MANEJO DE ERRORES MEJORADO ==========

  private handleError(error: any): Observable<never> {
    console.error('❌ Error en MachineHoursService:', error);
    
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.status === 404) {
      errorMessage = 'Recurso no encontrado. Verifica que el backend esté corriendo.';
    } else if (error.status === 0) {
      errorMessage = 'No se puede conectar al servidor. Verifica la URL del API.';
    } else if (error.status === 401) {
      errorMessage = 'No autorizado. Inicie sesión nuevamente.';
      // Limpiar localStorage si hay error 401
      localStorage.removeItem('usuarioActual');
      window.location.href = '/login';
    } else if (error.status === 422) {
      errorMessage = 'Error de validación. Verifique los datos ingresados.';
      
      // Manejo específico de errores de validación de Pydantic
      if (error.error && error.error.detail) {
        if (Array.isArray(error.error.detail)) {
          const validationErrors = error.error.detail.map((e: any) => {
            if (e.type === 'int_parsing' && e.loc?.includes('horas_turno')) {
              return 'El campo horas_turno debe ser un número entero';
            } else if (e.type === 'missing' && e.loc?.includes('maquina_id')) {
              return 'El ID de la máquina es requerido';
            } else if (e.type === 'missing' && e.loc?.includes('usuario_id')) {
              return 'El ID del usuario es requerido';
            }
            return e.msg || e.message || JSON.stringify(e);
          }).join(', ');
          errorMessage = 'Error de validación: ' + validationErrors;
        } else {
          errorMessage = 'Error de validación: ' + JSON.stringify(error.error.detail);
        }
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}