// src/app/core/services/entrega-aridos.service.ts - RUTA CORREGIDA

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ============= INTERFACES =============

export interface EntregaAridoCreate {
  proyecto_id: number;
  usuario_id: number;
  tipo_arido: string;
  cantidad: number;
  fecha_entrega: string;
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
  // ✅ CORREGIDO: Coincide con el backend FastAPI
  // Backend usa: /aridos/registros
  private apiUrl = `${environment.apiUrl}/aridos/registros`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  // ============= MÉTODOS PRINCIPALES =============

  createDelivery(delivery: EntregaAridoCreate): Observable<ApiResponse<EntregaAridoOut>> {
    console.log('📤 Creando entrega:', delivery);
    
    return this.http.post<any>(
      `${this.apiUrl}`, 
      delivery, 
      this.httpOptions
    ).pipe(
      map(response => {
        console.log('✅ Respuesta del backend al crear:', response);
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
    const params = new HttpParams().set('limit', limit.toString());

    console.log('🔍 Obteniendo entregas recientes', usuarioId ? `del usuario ${usuarioId}` : '');

    return this.http.get<any>(
      `${this.apiUrl}`, 
      { params, ...this.httpOptions }
    ).pipe(
      map(response => {
        console.log('📥 Respuesta cruda del backend:', response);
        
        // ✅ Verificar si la respuesta es un array directamente
        let entregas: any[] = [];
        
        if (Array.isArray(response)) {
          entregas = response;
        } else if (response && Array.isArray(response.data)) {
          entregas = response.data;
        } else if (response && Array.isArray(response.items)) {
          // Para respuestas paginadas
          entregas = response.items;
        } else if (response && typeof response === 'object') {
          console.warn('⚠️ Respuesta inesperada del servidor:', response);
          return {
            success: true,
            data: []
          };
        }

        console.log('📥 Entregas totales recibidas:', entregas.length);

        // ✅ FILTRO CRÍTICO: Solo entregas del usuario autenticado
        let entregasFiltradas = entregas;
        if (usuarioId) {
          entregasFiltradas = entregas.filter(e => {
            const entregaUsuarioId = Number(e.usuario_id);
            const usuarioIdNumber = Number(usuarioId);
            
            const matches = entregaUsuarioId === usuarioIdNumber;
            
            if (!matches) {
              console.log(`❌ Descartando entrega ID ${e.id}: usuario_id=${e.usuario_id}, esperado=${usuarioId}`);
            }
            return matches;
          });
          console.log(`✅ Entregas filtradas del usuario ${usuarioId}: ${entregasFiltradas.length} de ${entregas.length} totales`);
        } else {
          console.warn('⚠️ No se proporcionó usuarioId, mostrando todas las entregas');
        }

        // ✅ Mapear los datos
        const mappedData = entregasFiltradas.map(item => {
          try {
            return this.mapBackendToFrontend(item);
          } catch (error) {
            console.error('❌ Error mapeando entrega:', item, error);
            return null;
          }
        }).filter(item => item !== null) as EntregaAridoOut[];
        
        console.log('✅ Entregas mapeadas:', mappedData.length);
        
        return {
          success: true,
          data: mappedData
        };
      }),
      catchError(error => {
        console.error('❌ Error obteniendo entregas recientes:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ URL que falló:', error.url);
        console.error('❌ Error body:', error.error);
        
        // ✅ En caso de error, devolver array vacío en lugar de fallar
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

  // ============= TIPOS DE MATERIALES =============

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

    return of({
      success: true,
      data: updatedTypes
    });
  }

  // ============= OTROS MÉTODOS =============

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
            data: []
          });
        })
      );
  }

  getVehicles(): Observable<ApiResponse<Vehicle[]>> {
    const mockVehicles: Vehicle[] = [];
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
            data: []
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

  // ============= MÉTODOS DE UTILIDAD =============

  private mapBackendToFrontend(backendData: any): EntregaAridoOut {
    if (!backendData) {
      throw new Error('Datos de backend vacíos');
    }

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
      vehicleId: 'N/A',
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
    console.error('❌ Error en EntregaAridosService:', error);
    console.error('❌ URL:', error.url);
    console.error('❌ Status:', error.status);
    console.error('❌ Error body:', error.error);
    
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
          errorMessage = 'Recurso no encontrado. Verifique que la ruta del API sea correcta.';
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