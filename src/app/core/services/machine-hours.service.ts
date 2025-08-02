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
}

export interface Machine {
  id: number;
  nombre: string;
  estado: boolean;
  horas_uso: number;
  proyecto_id?: number;
}

export interface MachineType {
  id: string;
  name: string;
}

export interface Operator {
  id: number;
  nombre: string;
  email: string;
  roles: string;
}

@Injectable({
  providedIn: 'root'
})
export class MachineHoursService {
  private apiUrl = environment.apiUrl;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  // ========== MÉTODOS PRINCIPALES ==========

  /**
   * Obtener proyectos desde /proyectos
   */
  getProjects(): Observable<{ success: boolean; data: Project[] }> {
    return this.http.get<Project[]>(`${this.apiUrl}/proyectos`).pipe(
      map(projects => ({
        success: true,
        data: projects.filter(p => p.estado === true) // Solo proyectos activos
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener máquinas desde /maquinas  
   */
  getMachines(): Observable<{ success: boolean; data: Machine[] }> {
    return this.http.get<Machine[]>(`${this.apiUrl}/maquinas`).pipe(
      map(machines => ({
        success: true,
        data: machines.filter(m => m.estado === true) // Solo máquinas activas
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener tipos de máquina (simulado por ahora)
   */
  getMachineTypes(): Observable<{ success: boolean; data: MachineType[] }> {
    const mockTypes: MachineType[] = [
      { id: 'excavadora', name: 'Excavadora' },
      { id: 'retroexcavadora', name: 'Retroexcavadora' },
      { id: 'bulldozer', name: 'Bulldozer' },
      { id: 'cargador', name: 'Cargador Frontal' },
      { id: 'motoniveladora', name: 'Motoniveladora' }
    ];

    return of({
      success: true,
      data: mockTypes
    });
  }

  /**
   * Obtener operadores desde /usuarios
   */
  getOperators(): Observable<{ success: boolean; data: Operator[] }> {
    return this.http.get<Operator[]>(`${this.apiUrl}/usuarios`).pipe(
      map(usuarios => ({
        success: true,
        data: usuarios.filter(u => u.roles === 'operario') // Solo operarios
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener máquinas por tipo (filtrado local)
   */
  getMachinesByType(machineTypeId: string): Observable<{ success: boolean; data: Machine[] }> {
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
   * Crear registro de horas de máquina (usando reportes-laborales)
   */
  createMachineHours(machineHours: any): Observable<{ success: boolean; data: any }> {
    // Transformar datos para el backend
    const reporteData = {
      usuario_id: parseInt(machineHours.operator),
      maquina_id: parseInt(machineHours.machineId),
      fecha_asignacion: new Date().toISOString(),
      horas_turno: new Date().toISOString()
    };

    return this.http.post<any>(`${this.apiUrl}/reportes-laborales`, reporteData, this.httpOptions).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener registros recientes de reportes laborales
   */
  getRecentMachineHours(limit: number = 10): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<any[]>(`${this.apiUrl}/reportes-laborales`).pipe(
      map(reportes => {
        // Transformar reportes del backend al formato del frontend
        const transformedData = reportes.slice(0, limit).map(reporte => ({
          id: reporte.id,
          date: reporte.fecha_asignacion ? reporte.fecha_asignacion.split('T')[0] : '',
          machineType: 'excavadora', // Por defecto, se puede mejorar
          machineId: reporte.maquina_id?.toString() || '',
          startHour: reporte.fecha_asignacion ? this.getDecimalHours(new Date(reporte.fecha_asignacion)) : 0,
          endHour: reporte.horas_turno ? this.getDecimalHours(new Date(reporte.horas_turno)) : 0,
          totalHours: reporte.horas_turno ? this.calculateHours(reporte.fecha_asignacion, reporte.horas_turno) : 0,
          project: reporte.proyecto_id?.toString() || '',
          operator: reporte.usuario_id?.toString() || '',
          notes: ''
        }));

        return {
          success: true,
          data: transformedData
        };
      }),
      catchError(this.handleError)
    );
  }

  // ========== MÉTODOS DE UTILIDAD ==========

  /**
   * Calcular total de horas trabajadas
   */
  calculateTotalHours(startHour: number, endHour: number): number {
    if (endHour <= startHour) return 0;
    return Math.round((endHour - startHour) * 100) / 100;
  }

  /**
   * Validar disponibilidad de máquina (simulado)
   */
  validateMachineAvailability(machineId: string, date: string, startHour: number, endHour: number): Observable<{ success: boolean; data: boolean }> {
    return of({
      success: true,
      data: true // Por ahora siempre disponible
    });
  }

  // ========== MÉTODOS PRIVADOS ==========

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

  // ========== MANEJO DE ERRORES ==========

  private handleError(error: any): Observable<never> {
    console.error('Error en MachineHoursService:', error);
    
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.status === 404) {
      errorMessage = 'Recurso no encontrado. Verifica que el backend esté corriendo.';
    } else if (error.status === 0) {
      errorMessage = 'No se puede conectar al servidor. Verifica la URL del API.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}