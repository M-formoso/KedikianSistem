// src/app/eviromet.ts/reporte-laboral.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';

// Interfaces que coinciden con tu modelo de backend
export interface ReporteLaboral {
  id?: number;
  maquina_id?: number;
  usuario_id: number;
  fecha_asignacion: string; // DateTime como string ISO
  horas_turno?: string; // DateTime como string ISO
  created?: string;
  updated?: string;
}

// Interface para crear reportes (lo que envía el frontend)
export interface ReporteLaboralCreate {
  fecha: string; // Fecha como string YYYY-MM-DD
  horaInicio: string; // Hora como string HH:MM
  tiempoDescanso: number; // En minutos
  usuarioId: string;
  notas: string;
  horaInicioTimestamp: Date;
  horaFin?: string; // Para cuando se cierra el reporte
  totalHoras?: number; // Calculado en el frontend
  estado?: string; // Estado del reporte
}

@Injectable({
  providedIn: 'root'
})
export class ReporteLaboralService extends BaseApiService {
  private readonly endpoint = '/reportes-laborales';

  // Obtener todos los reportes con parámetros
  getReportes(params?: {
    page?: number;
    limit?: number;
    usuario_id?: number;
    proyecto_id?: number;
    orderBy?: string;
    order?: string;
  }): Observable<any> {
    return this.get(this.endpoint, params);
  }

  // Obtener reporte por ID
  getReporte(id: number): Observable<any> {
    return this.get(`${this.endpoint}/${id}`);
  }

  // Crear nuevo reporte (adaptado para el formato del backend)
  createReporte(data: ReporteLaboralCreate): Observable<any> {
    // Transformar los datos del frontend al formato del backend
    const backendData: Partial<ReporteLaboral> = {
      usuario_id: parseInt(data.usuarioId),
      fecha_asignacion: new Date(`${data.fecha}T${data.horaInicio}:00`).toISOString(),
    };

    return this.post(this.endpoint, backendData);
  }

  // Actualizar reporte existente
  updateReporte(id: number, data: any): Observable<any> {
    // Si vienen datos del frontend, transformarlos
    if (data.horaFin || data.tiempoDescanso !== undefined) {
      const updateData: any = {};
      
      if (data.horaFin) {
        // Calcular horas_turno basado en horaFin
        updateData.horas_turno = new Date().toISOString(); // Timestamp actual
      }
      
      // Agregar otros campos que vengan
      Object.keys(data).forEach(key => {
        if (!['horaFin', 'tiempoDescanso'].includes(key)) {
          updateData[key] = data[key];
        }
      });
      
      return this.put(`${this.endpoint}/${id}`, updateData);
    }
    
    return this.put(`${this.endpoint}/${id}`, data);
  }

  // Eliminar reporte
  deleteReporte(id: number): Observable<any> {
    return this.delete(`${this.endpoint}/${id}`);
  }

  // Obtener reportes por usuario
  getReportesPorUsuario(usuarioId: number): Observable<any> {
    return this.getReportes({ usuario_id: usuarioId });
  }

  // Obtener reportes por proyecto (si tienes esa relación)
  getReportesPorProyecto(proyectoId: number): Observable<any> {
    return this.getReportes({ proyecto_id: proyectoId });
  }

  // Aprobar reporte
  aprobarReporte(id: number): Observable<any> {
    return this.put(`${this.endpoint}/${id}/aprobar`, {});
  }

  // Rechazar reporte
  rechazarReporte(id: number, motivo: string): Observable<any> {
    return this.put(`${this.endpoint}/${id}/rechazar`, { motivo: motivo });
  }

  // Obtener reportes recientes (helper method)
  getReportesRecientes(limit: number = 10): Observable<any> {
    return this.getReportes({ 
      limit: limit, 
      orderBy: 'fecha_asignacion', 
      order: 'desc' 
    });
  }

  // Métodos específicos para el sistema de fichaje del frontend

  // Verificar si hay un fichaje activo para un usuario
  getActiveClockIn(usuarioId: number): Observable<any> {
    return this.getReportesPorUsuario(usuarioId).pipe(
      map(response => {
        if (response && response.data) {
          // Buscar reportes que no tengan horas_turno (no cerrados)
          const activeReport = response.data.find((reporte: ReporteLaboral) => 
            !reporte.horas_turno
          );
          
          if (activeReport) {
            return {
              success: true,
              data: activeReport,
              message: 'Fichaje activo encontrado'
            };
          }
        }
        
        return {
          success: true,
          data: null,
          message: 'No hay fichaje activo'
        };
      })
    );
  }

  // Cerrar fichaje activo
  closeActiveClockIn(usuarioId: number, data: { horaFin: string; tiempoDescanso: number; notas: string }): Observable<any> {
    return this.getActiveClockIn(usuarioId).pipe(
      map(response => {
        if (response.data) {
          // Actualizar el reporte activo
          return this.updateReporte(response.data.id, data);
        }
        throw new Error('No hay fichaje activo para cerrar');
      })
    );
  }

  // Validar si el usuario puede fichar (no tiene fichaje activo)
  canClockIn(usuarioId: number): Observable<boolean> {
    return this.getActiveClockIn(usuarioId).pipe(
      map(response => response.data === null)
    );
  }

  // Formatear datos para mostrar en la tabla del frontend
  formatForTable(reportes: ReporteLaboral[]): any[] {
    return reportes.map(reporte => ({
      id: reporte.id,
      fecha: reporte.fecha_asignacion ? new Date(reporte.fecha_asignacion).toISOString().split('T')[0] : '',
      horaInicio: reporte.fecha_asignacion ? new Date(reporte.fecha_asignacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '',
      horaFin: reporte.horas_turno ? new Date(reporte.horas_turno).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '',
      tiempoDescanso: 60, // Default, se puede calcular si tienes el campo
      totalHoras: reporte.horas_turno ? this.calculateTotalHours(reporte.fecha_asignacion!, reporte.horas_turno) : 0,
      usuarioId: reporte.usuario_id,
      estado: reporte.horas_turno ? 'completado' : 'activo',
      createdAt: reporte.created ? new Date(reporte.created) : new Date(),
      updatedAt: reporte.updated ? new Date(reporte.updated) : new Date()
    }));
  }

  // Helper para calcular total de horas
  private calculateTotalHours(inicio: string, fin: string): number {
    const startTime = new Date(inicio);
    const endTime = new Date(fin);
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.round(diffHours * 100) / 100;
  }
}