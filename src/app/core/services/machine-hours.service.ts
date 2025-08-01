// ==========================================
// 1. src/app/core/services/machine-hours.service.ts
// ==========================================

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
}

export interface Machine {
  id: number;
  nombre: string;
  estado: boolean;
  horas_uso: number;
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
      usuario_id: 1, // Por ahora usar ID fijo
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
      map(reportes => ({
        success: true,
        data: reportes.slice(0, limit) // Tomar solo los primeros 'limit' elementos
      })),
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