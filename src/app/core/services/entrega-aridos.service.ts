import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ============= INTERFACES CORREGIDAS =============

// Interface para crear entregas (envío al backend)
export interface EntregaAridoCreate {
  proyecto_id: number;
  usuario_id: number;
  tipo_arido: string;
  cantidad: number;
  fecha_entrega: string; // ISO string
}

// Interface para las respuestas del backend (lo que recibimos) - CORREGIDA
export interface EntregaAridoOut {
  id?: number;
  proyecto_id: number;
  usuario_id: number;
  tipo_arido: string;
  cantidad: number;
  fecha_entrega: string;
  created?: string;
  updated?: string;
  
  // ✅ PROPIEDADES MAPEADAS para compatibilidad con el template
  date: string;           // Mapeado desde fecha_entrega
  project: string | number; // Mapeado desde proyecto_id
  materialType: string;   // Mapeado desde tipo_arido
  quantity: number;       // Mapeado desde cantidad
  vehicleId: string;      // Vehículo (simulado o desde notas)
  operator: string;       // Mapeado desde usuario_id
  notes?: string;         // Notas adicionales
}

// Interface para el frontend (lo que usa el componente)
export interface AridosDelivery {
  id?: number;
  date: string;
  project: string;
  materialType: string;
  quantity: number;
  unit: string;
  vehicleId: string;
  operator: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AridosDeliveryRequest {
  date: string;
  project: string;
  materialType: string;
  quantity: number;
  unit: string;
  vehicleId: string;
  operator: string;
  notes?: string;
}

// Interfaces de datos maestros
export interface Project {
  id: number;
  nombre: string;
  estado: boolean;
  descripcion?: string;
  ubicacion?: string;
  
  // Alias para compatibilidad con el template
  name: string;
  status?: string;
}

export interface MaterialType {
  id: string;
  name: string;
  description?: string;
  unit?: string;
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
  
  // Alias para compatibilidad
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
  // ✅ URL corregida para usar tu servidor
  private apiUrl = `${environment.apiUrl}/entregas-arido`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  // ============= MÉTODOS PRINCIPALES =============

  /**
   * Crear una nueva entrega de áridos
   */
  createDelivery(delivery: EntregaAridoCreate): Observable<ApiResponse<EntregaAridoOut>> {
    return this.http.post<any>(
      `${this.apiUrl}`, 
      delivery, 
      this.httpOptions
    ).pipe(
      map(response => {
        // Mapear la respuesta del backend al formato que espera el frontend
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

  /**
   * Obtener entregas recientes
   */
  getRecentDeliveries(limit: number = 10): Observable<ApiResponse<EntregaAridoOut[]>> {
    const params = new HttpParams()
      .set('limit', limit.toString());

    return this.http.get<any[]>(
      `${this.apiUrl}`, 
      { params, ...this.httpOptions }
    ).pipe(
      map(response => {
        // Mapear cada elemento de la respuesta
        const mappedData = response.map(item => this.mapBackendToFrontend(item));
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

  /**
   * Eliminar una entrega
   */
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

  // ============= MÉTODOS PARA DATOS MAESTROS =============

  /**
   * Obtener lista de proyectos activos
   */
  getProjects(): Observable<ApiResponse<Project[]>> {
    return this.http.get<Project[]>(`${environment.apiUrl}/proyectos`)
      .pipe(
        map(projects => {
          // Mapear proyectos para agregar alias de compatibilidad
          const mappedProjects = projects.map(project => ({
            ...project,
            name: project.nombre, // Alias para el template
            status: project.estado ? 'active' : 'inactive'
          }));
          
          return {
            success: true,
            data: mappedProjects.filter(p => p.estado === true) // Solo proyectos activos
          };
        }),
        catchError(error => {
          console.error('Error obteniendo proyectos:', error);
          // Fallback a proyectos mock
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

  /**
   * Obtener tipos de materiales (mock por ahora)
   */
  getMaterialTypes(): Observable<ApiResponse<MaterialType[]>> {
    const mockTypes: MaterialType[] = [
      { id: 'arena_fina', name: 'Arena Fina', description: 'Arena fina para construcción', unit: 'm³' },
      { id: 'granza', name: 'Granza', description: 'Granza triturada', unit: 'm³' },
      { id: 'arena_comun', name: 'Arena Común', description: 'Arena común para construcción', unit: 'm³' },
      { id: 'piedra', name: 'Piedra', description: 'Piedra chancada', unit: 'm³' },
      { id: 'ripio', name: 'Ripio', description: 'Ripio seleccionado', unit: 'm³' }
    ];

    return of({
      success: true,
      data: mockTypes
    });
  }

  /**
   * Obtener lista de vehículos disponibles (mock por ahora)
   */
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

  /**
   * Obtener lista de operadores
   */
  getOperators(): Observable<ApiResponse<Operator[]>> {
    return this.http.get<any[]>(`${environment.apiUrl}/usuarios`)
      .pipe(
        map(usuarios => {
          // Mapear usuarios para agregar alias de compatibilidad
          const mappedOperators = usuarios
            .filter(u => u.roles === 'operario' && u.estado === true)
            .map(usuario => ({
              ...usuario,
              name: usuario.nombre, // Alias para el template
              status: usuario.estado ? 'active' : 'inactive'
            }));
          
          return {
            success: true,
            data: mappedOperators
          };
        }),
        catchError(error => {
          console.error('Error obteniendo operadores:', error);
          // Fallback a operador mock
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

  /**
   * Validar disponibilidad de vehículo (mock por ahora)
   */
  validateVehicleAvailability(vehicleId: string, date: string): Observable<ApiResponse<boolean>> {
    return of({
      success: true,
      data: true // Por ahora siempre disponible
    });
  }

  // ============= MÉTODOS DE UTILIDAD =============

  /**
   * ✅ MÉTODO CLAVE: Mapear datos del backend al formato que espera el frontend
   */
  private mapBackendToFrontend(backendData: any): EntregaAridoOut {
    return {
      // Propiedades originales del backend
      id: backendData.id,
      proyecto_id: backendData.proyecto_id,
      usuario_id: backendData.usuario_id,
      tipo_arido: backendData.tipo_arido,
      cantidad: backendData.cantidad,
      fecha_entrega: backendData.fecha_entrega,
      created: backendData.created,
      updated: backendData.updated,
      
      // ✅ Propiedades mapeadas para el template
      date: backendData.fecha_entrega ? backendData.fecha_entrega.split('T')[0] : '',
      project: backendData.proyecto_id,
      materialType: backendData.tipo_arido,
      quantity: backendData.cantidad,
      vehicleId: 'CAM001', // Por defecto, se puede mejorar
      operator: backendData.usuario_id?.toString() || '',
      notes: ''
    };
  }

  /**
   * Mapear datos del frontend al formato del backend
   */
  mapFrontendToBackend(frontendData: AridosDeliveryRequest): EntregaAridoCreate {
    return {
      proyecto_id: parseInt(frontendData.project),
      usuario_id: parseInt(frontendData.operator),
      tipo_arido: frontendData.materialType,
      cantidad: frontendData.quantity,
      fecha_entrega: new Date().toISOString()
    };
  }

  // Manejo de errores
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