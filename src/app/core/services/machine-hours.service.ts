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
  startHour: number;
  endHour: number;
  totalHours: number;
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

export interface MachineHoursRequest {
  usuario_id: number;
  maquina_id: number;
  proyecto_id?: number;
  fecha_inicio: string;
  fecha_fin?: string;
  horas_trabajadas?: number;
  notas?: string;
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

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  // ========== MÉTODOS PRINCIPALES ==========

  /**
   * Obtener proyectos desde /proyectos
   */
  getProjects(): Observable<ApiResponse<Project[]>> {
    return this.http.get<Project[]>(`${this.apiUrl}/proyectos`, this.httpOptions).pipe(
      map(projects => {
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
        console.error('Error obteniendo proyectos:', error);
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
   * Obtener máquinas desde /maquinas  
   */
  getMachines(): Observable<ApiResponse<Machine[]>> {
    return this.http.get<Machine[]>(`${this.apiUrl}/maquinas`, this.httpOptions).pipe(
      map(machines => {
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
        console.error('Error obteniendo máquinas:', error);
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
   * Obtener tipos de máquina (basado en las máquinas existentes)
   */
  getMachineTypes(): Observable<ApiResponse<MachineType[]>> {
    return this.getMachines().pipe(
      map(response => {
        if (response.success && response.data) {
          // Extraer tipos únicos de las máquinas
          const types = new Set<string>();
          response.data.forEach(machine => {
            const machineName = machine.nombre.toLowerCase();
            if (machineName.includes('excavadora')) {
              types.add('excavadora');
            } else if (machineName.includes('retroexcavadora')) {
              types.add('retroexcavadora');
            } else if (machineName.includes('bulldozer')) {
              types.add('bulldozer');
            } else if (machineName.includes('cargador')) {
              types.add('cargador');
            } else if (machineName.includes('motoniveladora')) {
              types.add('motoniveladora');
            } else {
              types.add('maquina');
            }
          });

          const machineTypes: MachineType[] = Array.from(types).map(type => ({
            id: type,
            name: this.getMachineTypeName(type)
          }));

          return {
            success: true,
            data: machineTypes
          };
        }
        
        // Fallback a tipos por defecto
        return {
          success: true,
          data: [
            { id: 'excavadora', name: 'Excavadora' },
            { id: 'retroexcavadora', name: 'Retroexcavadora' },
            { id: 'bulldozer', name: 'Bulldozer' },
            { id: 'cargador', name: 'Cargador Frontal' },
            { id: 'motoniveladora', name: 'Motoniveladora' }
          ]
        };
      })
    );
  }

  /**
   * Obtener operadores desde /usuarios
   */
  getOperators(): Observable<ApiResponse<Operator[]>> {
    return this.http.get<Operator[]>(`${this.apiUrl}/usuarios`, this.httpOptions).pipe(
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
        console.error('Error obteniendo operadores:', error);
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

  /**
   * Obtener máquinas por tipo (filtrado local)
   */
  getMachinesByType(machineTypeId: string): Observable<ApiResponse<Machine[]>> {
    return this.getMachines().pipe(
      map(response => {
        if (response.success) {
          // Filtrar máquinas por tipo basado en el nombre
          const filtered = response.data.filter(machine => 
            machine.nombre.toLowerCase().includes(machineTypeId.toLowerCase())
          );
          return {
            success: true,
            data: filtered
          };
        }
        return response;
      })
    );
  }

  /**
   * Crear registro de horas de máquina
   */
  createMachineHours(machineHours: any): Observable<ApiResponse<any>> {
    // Transformar datos para el backend usando reportes-laborales
    const reporteData: MachineHoursRequest = {
      usuario_id: parseInt(machineHours.operator),
      maquina_id: parseInt(machineHours.machineId),
      proyecto_id: machineHours.project ? parseInt(machineHours.project) : undefined,
      fecha_inicio: new Date(machineHours.date + 'T' + this.formatDecimalToTime(machineHours.startHour)).toISOString(),
      fecha_fin: new Date(machineHours.date + 'T' + this.formatDecimalToTime(machineHours.endHour)).toISOString(),
      horas_trabajadas: machineHours.totalHours || this.calculateTotalHours(machineHours.startHour, machineHours.endHour),
      notas: machineHours.notes || ''
    };

    console.log('📤 Enviando registro de horas máquina:', reporteData);

    return this.http.post<any>(`${this.apiUrl}/reportes-laborales`, reporteData, this.httpOptions).pipe(
      map(response => ({
        success: true,
        data: response,
        message: 'Registro de horas de máquina guardado correctamente'
      })),
      catchError(error => {
        console.error('Error creando registro de horas máquina:', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Obtener registros recientes de reportes laborales
   */
  getRecentMachineHours(limit: number = 10): Observable<ApiResponse<MachineHours[]>> {
    return this.http.get<any[]>(`${this.apiUrl}/reportes-laborales`, this.httpOptions).pipe(
      map(reportes => {
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
        console.error('Error obteniendo registros recientes:', error);
        return of({
          success: true,
          data: []
        });
      })
    );
  }

  /**
   * Validar disponibilidad de máquina
   */
  validateMachineAvailability(machineId: string, date: string, startHour: number, endHour: number): Observable<ApiResponse<boolean>> {
    // Por ahora devolver siempre disponible
    // En el futuro se puede implementar validación real contra el backend
    return of({
      success: true,
      data: true,
      message: 'Máquina disponible'
    });
  }

  // ========== MÉTODOS DE UTILIDAD ==========

  /**
   * Mapear reporte del backend a MachineHours del frontend
   */
  private mapReporteToMachineHours(reporte: any): MachineHours {
    const fechaInicio = reporte.fecha_inicio || reporte.fecha_asignacion;
    const fechaFin = reporte.fecha_fin || reporte.horas_turno;
    
    return {
      id: reporte.id,
      date: fechaInicio ? fechaInicio.split('T')[0] : new Date().toISOString().split('T')[0],
      machineType: this.inferMachineType(reporte.maquina_id),
      machineId: reporte.maquina_id?.toString() || '',
      startHour: fechaInicio ? this.getDecimalHours(new Date(fechaInicio)) : 0,
      endHour: fechaFin ? this.getDecimalHours(new Date(fechaFin)) : 0,
      totalHours: reporte.horas_trabajadas || (fechaFin && fechaInicio ? 
        this.calculateHours(fechaInicio, fechaFin) : 0),
      project: reporte.proyecto_id?.toString() || '',
      operator: reporte.usuario_id?.toString() || '',
      notes: reporte.notas || ''
    };
  }

  /**
   * Inferir tipo de máquina basado en ID (implementación básica)
   */
  private inferMachineType(maquinaId: number): string {
    // Por ahora devolver 'excavadora' por defecto
    // En el futuro se puede hacer lookup a la tabla de máquinas
    return 'excavadora';
  }

  /**
   * Obtener nombre del tipo de máquina
   */
  private getMachineTypeName(type: string): string {
    const names: { [key: string]: string } = {
      'excavadora': 'Excavadora',
      'retroexcavadora': 'Retroexcavadora',
      'bulldozer': 'Bulldozer',
      'cargador': 'Cargador Frontal',
      'motoniveladora': 'Motoniveladora',
      'maquina': 'Maquinaria General'
    };
    
    return names[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Convertir horas decimales a formato HH:MM
   */
  private formatDecimalToTime(decimalHours: number): string {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Convertir Date a horas decimales (desde medianoche)
   */
  private getDecimalHours(date: Date): number {
    return date.getHours() + (date.getMinutes() / 60) + (date.getSeconds() / 3600);
  }

  /**
   * Calcular horas entre dos timestamps
   */
  private calculateHours(start: string, end: string): number {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
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
    console.error('Error en MachineHoursService:', error);
    
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.status === 404) {
      errorMessage = 'Recurso no encontrado. Verifica que el backend esté corriendo.';
    } else if (error.status === 0) {
      errorMessage = 'No se puede conectar al servidor. Verifica la URL del API.';
    } else if (error.status === 401) {
      errorMessage = 'No autorizado. Inicie sesión nuevamente.';
    } else if (error.status === 422) {
      errorMessage = 'Datos inválidos. Verifique la información ingresada.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}