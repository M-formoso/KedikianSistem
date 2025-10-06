// machine-hours.service.ts - VERSIÓN ACTUALIZADA PARA BACKEND

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
  
  // Horas de trabajo
  startHour: number;
  endHour: number;
  totalHours: number;
  
  // Horas de máquina
  hourMeterStart?: number;
  hourMeterEnd?: number;
  operatingHours?: number;
  
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
  name?: string;
}

export interface Machine {
  id: number;
  nombre: string;
  estado: boolean;
  horas_uso: number;
  proyecto_id?: number;
  tipo?: string;
  name?: string;
}

export interface Operator {
  id: number;
  nombre: string;
  email: string;
  roles: string;
  estado: boolean;
  name?: string;
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

  // ========== MÉTODOS PRINCIPALES ==========

  getProjects(): Observable<ApiResponse<Project[]>> {
    return this.http.get<Project[]>(`${this.apiUrl}/proyectos`, this.getHttpOptions()).pipe(
      map(projects => {
        console.log('✅ Proyectos recibidos:', projects);
        
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
          data: []
        });
      })
    );
  }

  getMachines(): Observable<ApiResponse<Machine[]>> {
    return this.http.get<Machine[]>(`${this.apiUrl}/maquinas`, this.getHttpOptions()).pipe(
      map(machines => {
        console.log('✅ Máquinas recibidas:', machines);
        
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
          data: []
        });
      })
    );
  }

  /**
   * ✅ ACTUALIZADO: Enviar datos correctamente al backend
   * El backend espera: maquina_id, usuario_id, proyecto_id, horas_turno, horometro_inicial
   */
  createMachineHours(machineHours: any): Observable<ApiResponse<any>> {
    console.log('📤 createMachineHours - Datos recibidos:', machineHours);
    
    // ✅ PARSEAR NOTES PARA EXTRAER HOROMETRO_INICIAL
    let horometro_inicial = null;
    let notas_parseadas = null;
    
    if (machineHours.notes) {
      try {
        notas_parseadas = JSON.parse(machineHours.notes);
        horometro_inicial = notas_parseadas.horometro_inicial;
        console.log('✅ Horómetro inicial extraído:', horometro_inicial);
      } catch (error) {
        console.warn('⚠️ No se pudo parsear notes:', error);
      }
    }
    
    // ✅ PREPARAR DATOS PARA EL BACKEND
    const reporteData = {
      // Campos obligatorios
      maquina_id: parseInt(machineHours.machineId),
      usuario_id: parseInt(machineHours.operator),
      fecha_asignacion: machineHours.date ? 
        `${machineHours.date}T${this.formatTime(machineHours.startHour)}` : 
        new Date().toISOString(),
      horas_turno: Math.round(machineHours.totalHours || 0),
      
      // ✅ CAMPOS CRÍTICOS QUE FALTABAN
      proyecto_id: machineHours.project ? parseInt(machineHours.project) : null,
      horometro_inicial: horometro_inicial,
      
      // Campo de notas (mantener el JSON completo)
      notas: machineHours.notes || null
    };

    console.log('📤 Datos transformados para backend:', reporteData);
    console.log('🔍 Verificación de campos críticos:');
    console.log('  - proyecto_id:', reporteData.proyecto_id, '(tipo:', typeof reporteData.proyecto_id, ')');
    console.log('  - horometro_inicial:', reporteData.horometro_inicial, '(tipo:', typeof reporteData.horometro_inicial, ')');
    console.log('  - maquina_id:', reporteData.maquina_id);
    console.log('  - usuario_id:', reporteData.usuario_id);
    console.log('  - horas_turno:', reporteData.horas_turno);

    return this.http.post<any>(`${this.apiUrl}/reportes-laborales`, reporteData, this.getHttpOptions()).pipe(
      map(response => {
        console.log('✅ Respuesta del backend:', response);
        return {
          success: true,
          data: response,
          message: 'Registro de horas guardado correctamente'
        };
      }),
      catchError(error => {
        console.error('❌ Error completo:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Error body:', error.error);
        
        return this.handleError(error);
      })
    );
  }

  /**
   * ✅ ACTUALIZADO: Obtener registros recientes con todos los campos
   */
  getRecentMachineHours(limit: number = 10): Observable<ApiResponse<MachineHours[]>> {
    return this.http.get<any[]>(`${this.apiUrl}/reportes-laborales`, this.getHttpOptions()).pipe(
      map(reportes => {
        console.log('✅ Reportes recibidos del backend:', reportes);
        
        const transformedData = reportes
          .filter(reporte => reporte.maquina_id)
          .slice(0, limit)
          .map(reporte => {
            // ✅ PARSEAR NOTAS SI EXISTEN
            let parsedNotes = null;
            if (reporte.notas) {
              try {
                parsedNotes = typeof reporte.notas === 'string' ? 
                  JSON.parse(reporte.notas) : reporte.notas;
              } catch (error) {
                console.warn('⚠️ No se pudo parsear notas del reporte', reporte.id);
              }
            }
            
            const fechaInicio = reporte.fecha_asignacion || new Date().toISOString();
            const startHour = this.getDecimalHours(new Date(fechaInicio));
            const endHour = startHour + (reporte.horas_turno || 0);
            
            const transformed: any = {
              id: reporte.id,
              date: fechaInicio.split('T')[0],
              machineType: 'excavadora',
              machineId: reporte.maquina_id?.toString() || '',
              startHour: startHour,
              endHour: endHour,
              totalHours: reporte.horas_turno || 0,
              
              // ✅ INCLUIR PROYECTO_ID DIRECTAMENTE
              project: reporte.proyecto_id?.toString() || '',
              
              operator: reporte.usuario_id?.toString() || '',
              notes: reporte.notas || '',
              
              // ✅ INCLUIR HOROMETRO_INICIAL DIRECTAMENTE
              hourMeterStart: reporte.horometro_inicial || (parsedNotes?.horometro_inicial)
            };
            
            console.log('📊 Registro transformado:', {
              id: transformed.id,
              project: transformed.project,
              hourMeterStart: transformed.hourMeterStart
            });
            
            return transformed;
          });

        console.log('✅ Total registros transformados:', transformedData.length);
        return {
          success: true,
          data: transformedData
        };
      }),
      catchError(error => {
        console.error('❌ Error obteniendo registros:', error);
        return of({
          success: true,
          data: []
        });
      })
    );
  }

  getOperators(): Observable<ApiResponse<Operator[]>> {
    return this.http.get<Operator[]>(`${this.apiUrl}/usuarios`, this.getHttpOptions()).pipe(
      map(usuarios => {
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
          data: []
        });
      })
    );
  }

  // ========== MÉTODOS DE UTILIDAD ==========

  /**
   * Convertir horas decimales a formato HH:MM:SS
   */
  private formatTime(decimalHours: number): string {
    const hours = Math.floor(decimalHours);
    const minutes = Math.floor((decimalHours - hours) * 60);
    const seconds = Math.floor(((decimalHours - hours) * 60 - minutes) * 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

  // ========== MANEJO DE ERRORES ==========

  private handleError(error: any): Observable<never> {
    console.error('❌ Error en MachineHoursService:', error);
    
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.status === 404) {
      errorMessage = 'Recurso no encontrado. Verifica que el backend esté corriendo.';
    } else if (error.status === 0) {
      errorMessage = 'No se puede conectar al servidor. Verifica la URL del API.';
    } else if (error.status === 401) {
      errorMessage = 'No autorizado. Inicie sesión nuevamente.';
      localStorage.removeItem('usuarioActual');
      window.location.href = '/login';
    } else if (error.status === 422) {
      errorMessage = 'Error de validación. Verifique los datos ingresados.';
      
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