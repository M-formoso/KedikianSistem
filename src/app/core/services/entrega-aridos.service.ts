// src/app/core/services/entrega-aridos.service.ts - TIPOS DE ÁRIDOS ACTUALIZADOS

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ============= INTERFACES (sin cambios) =============

export interface EntregaAridoCreate {
  proyecto_id: number;
  usuario_id: number;
  tipo_arido: string;
  cantidad: number;
  fecha_entrega: string; // ISO string
}

export interface EntregaAridoOut {
  id?: number;
  proyecto_id: number;
  usuario_id: number;
  tipo_arido: string;
  cantidad: number;
  fecha_entrega: string;
  created?: string;
  updated?: string;
  
  // Propiedades mapeadas para compatibilidad con el template
  date: string;
  project: string | number;
  materialType: string;
  quantity: number;
  vehicleId: string;
  operator: string;
  notes?: string;
}

export interface MaterialType {
  id: string;
  name: string;
  description?: string;
  unit?: string;
}

export interface Project {
  id: number;
  nombre: string;
  estado: boolean;
  descripcion?: string;
  ubicacion?: string;
  name: string;
  status?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  capacity?: string;
  status?: string;
  type?: string;
}

export interface Operator {
  id: number;
  nombre: string;
  email: string;
  roles: string;
  estado: boolean;
  name: string;
  status?: string;
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
export class EntregaAridosService {
  private apiUrl = `${environment.apiUrl}/entregas-arido`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  // ============= MÉTODOS PRINCIPALES (sin cambios) =============

  createDelivery(delivery: EntregaAridoCreate): Observable<ApiResponse<EntregaAridoOut>> {
    return this.http.post<any>(
      `${this.apiUrl}`, 
      delivery, 
      this.httpOptions
    ).pipe(
      map(response => {
        const mappedResponse = this.mapBackendToFrontend(response);
        return {
          success: true,
          data: mappedResponse,
          message: 'Entrega creada correctamente'
        };
      }),
      catchError(this.handleError)
    );
  }

  getRecentDeliveries(limit: number = 10, usuarioId?: number): Observable<ApiResponse<EntregaAridoOut[]>> {
    const params = new HttpParams()
      .set('limit', limit.toString());

    console.log('🔍 Obteniendo entregas recientes', usuarioId ? `del usuario ${usuarioId}` : '');

    return this.http.get<any[]>(
      `${this.apiUrl}`, 
      { params, ...this.httpOptions }
    ).pipe(
      map(response => {
        console.log('📥 Entregas totales recibidas:', response.length);

        // ✅ FILTRO CRÍTICO: Solo entregas del usuario autenticado
        let entregasFiltradas = response;
        if (usuarioId) {
          entregasFiltradas = response.filter(e => {
            const matches = e.usuario_id === usuarioId;
            if (!matches) {
              console.log(`❌ Descartando entrega ID ${e.id}: usuario_id=${e.usuario_id}, esperado=${usuarioId}`);
            }
            return matches;
          });
          console.log(`✅ Entregas filtradas del usuario ${usuarioId}: ${entregasFiltradas.length} de ${response.length} totales`);
        } else {
          console.warn('⚠️ No se proporcionó usuarioId, mostrando todas las entregas');
        }

        const mappedData = entregasFiltradas.map(item => this.mapBackendToFrontend(item));
        
        return {
          success: true,
          data: mappedData
        };
      }),
      catchError(error => {
        console.error('Error obteniendo entregas recientes:', error);
        return of({
          success: true,
          data: []
        });
      })
    );
  }
  deleteDelivery(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<any>(
      `${this.apiUrl}/${id}`
    ).pipe(
      map(() => ({
        success: true,
        data: null,
        message: 'Entrega eliminada correctamente'
      })),
      catchError(this.handleError)
    );
  }

  // ============= TIPOS DE MATERIALES ACTUALIZADOS =============

  /**
   * ✅ ACTUALIZADO: Obtener tipos de materiales con los nombres correctos
   */
  getMaterialTypes(): Observable<ApiResponse<MaterialType[]>> {
    const updatedTypes: MaterialType[] = [
      { 
        id: 'Arena Fina (m3)', 
        name: 'Arena Fina (m³)', 
        description: 'Arena fina para construcción y acabados', 
        unit: 'm³' 
      },
      { 
        id: 'Granza (m3)', 
        name: 'Granza (m³)', 
        description: 'Granza triturada para base de construcción', 
        unit: 'm³' 
      },
      { 
        id: 'Arena Comun (m3)', 
        name: 'Arena Común (m³)', 
        description: 'Arena común para construcción general', 
        unit: 'm³' 
      },
      { 
        id: 'Relleno (m3)', 
        name: 'Relleno (m³)', 
        description: 'Material de relleno para nivelación', 
        unit: 'm³' 
      },
      { 
        id: 'Tierra Negra (m3)', 
        name: 'Tierra Negra (m³)', 
        description: 'Tierra negra rica en nutrientes', 
        unit: 'm³' 
      },
      { 
        id: 'Piedra (m3)', 
        name: 'Piedra (m³)', 
        description: 'Piedra chancada para construcción', 
        unit: 'm³' 
      },
      { 
        id: '0.20 (m3)', 
        name: '0.20 (m³)', 
        description: 'Material granular 0.20mm', 
        unit: 'm³' 
      },
      { 
        id: 'blinder (m3)', 
        name: 'Blinder (m³)', 
        description: 'Material blinder para mezclas', 
        unit: 'm³' 
      },
      { 
        id: 'Arena Lavada (m3)', 
        name: 'Arena Lavada (m³)', 
        description: 'Arena lavada libre de impurezas', 
        unit: 'm³' 
      }
    ];

    console.log('✅ Tipos de materiales actualizados cargados:', updatedTypes.length);

    return of({
      success: true,
      data: updatedTypes
    });
  }

  // ============= MÉTODOS EXISTENTES (sin cambios) =============

  getProjects(): Observable<ApiResponse<Project[]>> {
    return this.http.get<Project[]>(`${environment.apiUrl}/proyectos`)
      .pipe(
        map(projects => {
          const mappedProjects = projects.map(project => ({
            ...project,
            name: project.nombre,
            status: project.estado ? 'active' : 'inactive'
          }));
          
          return {
            success: true,
            data: mappedProjects.filter(p => p.estado === true)
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
              status: 'active',
              descripcion: 'Proyecto de prueba',
              ubicacion: 'Ubicación de prueba'
            }]
          });
        })
      );
  }

  getVehicles(): Observable<ApiResponse<Vehicle[]>> {
    const mockVehicles: Vehicle[] = [
      { id: 'CAM001', name: 'Camión Tolva CAM001', capacity: '10m³', status: 'active', type: 'camion' },
      { id: 'CAM002', name: 'Camión Tolva CAM002', capacity: '15m³', status: 'active', type: 'camion' },
      { id: 'VOL001', name: 'Volquete VOL001', capacity: '20m³', status: 'active', type: 'volquete' },
      { id: 'VOL002', name: 'Volquete VOL002', capacity: '25m³', status: 'active', type: 'volquete' },
      { id: 'MIX001', name: 'Mixer MIX001', capacity: '8m³', status: 'maintenance', type: 'mixer' }
    ];

    return of({
      success: true,
      data: mockVehicles
    });
  }

  getOperators(): Observable<ApiResponse<Operator[]>> {
    return this.http.get<any[]>(`${environment.apiUrl}/usuarios`)
      .pipe(
        map(usuarios => {
          const mappedOperators = usuarios
            .filter(u => u.roles === 'operario' && u.estado === true)
            .map(usuario => ({
              ...usuario,
              name: usuario.nombre
            }));
          
          return {
            success: true,
            data: mappedOperators
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
              estado: true,
              status: 'active'
            }]
          });
        })
      );
  }

  validateVehicleAvailability(vehicleId: string, date: string): Observable<ApiResponse<boolean>> {
    return of({
      success: true,
      data: true
    });
  }

  // ============= MÉTODOS DE UTILIDAD (sin cambios) =============

  private mapBackendToFrontend(backendData: any): EntregaAridoOut {
    return {
      id: backendData.id,
      proyecto_id: backendData.proyecto_id,
      usuario_id: backendData.usuario_id,
      tipo_arido: backendData.tipo_arido,
      cantidad: backendData.cantidad,
      fecha_entrega: backendData.fecha_entrega,
      created: backendData.created,
      updated: backendData.updated,
      
      date: backendData.fecha_entrega ? backendData.fecha_entrega.split('T')[0] : '',
      project: backendData.proyecto_id,
      materialType: backendData.tipo_arido,
      quantity: backendData.cantidad,
      vehicleId: 'CAM001',
      operator: backendData.usuario_id?.toString() || '',
      notes: ''
    };
  }

  mapFrontendToBackend(frontendData: any): EntregaAridoCreate {
    return {
      proyecto_id: parseInt(frontendData.project),
      usuario_id: parseInt(frontendData.operator),
      tipo_arido: frontendData.materialType,
      cantidad: frontendData.quantity,
      fecha_entrega: new Date().toISOString()
    };
  }

  private handleError(error: any): Observable<never> {
    console.error('Error en EntregaAridosService:', error);
    
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = 'Datos inválidos. Verifique la información ingresada.';
          break;
        case 401:
          errorMessage = 'No autorizado. Inicie sesión nuevamente.';
          break;
        case 403:
          errorMessage = 'No tiene permisos para realizar esta acción.';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado.';
          break;
        case 422:
          errorMessage = 'Error de validación. Verifique los datos ingresados.';
          break;
        case 500:
          errorMessage = 'Error interno del servidor. Intente nuevamente más tarde.';
          break;
        default:
          errorMessage = `Error ${error.status}: ${error.message}`;
      }
      
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}