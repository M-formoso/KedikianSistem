// src/app/core/services/registro-gastos.service.ts - VERSIÓN FINAL SIN DUPLICACIÓN

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ============= INTERFACES =============

export interface ExpenseRequest {
  date: string;
  expenseType: string;
  amount: number;
  operator: string;
  paymentMethod?: string;
  receiptNumber?: string;
  description?: string;
  status?: string;
}

export interface ExpenseRecord {
  id?: number;
  usuario_id: number;
  maquina_id: number;
  tipo: string;
  importe_total: number;
  fecha: string;
  descripcion: string;
  imagen?: string;
  created?: string;
  updated?: string;
  
  date?: string;
  expenseType?: string;
  amount?: number;
  operator?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  description?: string;
  status?: string;
}

export interface ExpenseType {
  id: string;
  name: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface Operator {
  id: string;
  name: string;
  position?: string;
  department?: string;
  isActive?: boolean;
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
export class ExpenseService {
  private apiUrl = `${environment.apiUrl}/gastos/json`;
  
  constructor(private http: HttpClient) {}

  /**
   * Crear nuevo gasto - SIN DUPLICACIÓN DE TOKEN
   */
  // registro-gastos.service.ts
  // src/app/core/services/registro-gastos.service.ts - LÍNEA 66

  createExpense(expense: ExpenseRequest): Observable<ApiResponse<ExpenseRecord>> {
    console.log('📤 Datos recibidos:', expense);
    
    // ✅ Crear FormData correctamente
    const formData = new FormData();
    formData.append('usuario_id', expense.operator);
    
    // ✅ CRÍTICO: NO enviar maquina_id como string "null"
    // Si el backend espera null, simplemente no incluir el campo
    // O enviar un número válido
    // formData.append('maquina_id', '');  // NO HACER ESTO
    
    formData.append('tipo', expense.expenseType);
    formData.append('importe_total', expense.amount.toString());
    
    // ✅ Fecha en formato ISO simple
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const fechaISO = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    
    formData.append('fecha', fechaISO);
    formData.append('descripcion', this.buildDescription(expense));
    
    console.log('📤 Enviando FormData a /gastos');
    console.log('📋 Campos del FormData:');
    formData.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    return this.http.post<any>(`${environment.apiUrl}/gastos`, formData).pipe(
      map((backendResponse: any) => {
        console.log('✅ Respuesta del backend:', backendResponse);
        return {
          success: true,
          data: this.mapBackendToFrontend(backendResponse),
          message: 'Gasto registrado correctamente'
        };
      }),
      catchError((error) => {
        console.error('❌ Error completo:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Error body:', error.error);
        return this.handleError(error);
      })
    );
  }
/**
 * Formatear fecha para el backend (sin 'Z' al final)
 */
private formatDateForBackend(dateStr: string): string {
  const date = new Date(dateStr);
  // Formato: "YYYY-MM-DDTHH:MM:SS"
  return date.toISOString().replace('Z', '');
}

  /**
   * Obtener registros recientes
   */
  getRecentExpenses(limit: number = 10, usuarioId?: number): Observable<ApiResponse<ExpenseRecord[]>> {
    console.log('🔍 Obteniendo gastos recientes', usuarioId ? `del usuario ${usuarioId}` : '');
    console.log('🌐 URL:', `${environment.apiUrl}/gastos`);
    
    return this.http.get<any[]>(`${environment.apiUrl}/gastos`).pipe(
      map(response => {
        console.log('📥 Gastos totales recibidos del backend:', response.length);
        
        if (!response || !Array.isArray(response)) {
          console.warn('⚠️ Respuesta inesperada del backend:', response);
          return {
            success: true,
            data: []
          };
        }
        
        // ✅ FILTRO CRÍTICO: Solo gastos del usuario autenticado
        let gastosFiltrados = response;
        if (usuarioId) {
          gastosFiltrados = response.filter(g => {
            const matches = g.usuario_id === usuarioId;
            if (!matches) {
              console.log(`❌ Descartando gasto ID ${g.id}: usuario_id=${g.usuario_id}, esperado=${usuarioId}`);
            }
            return matches;
          });
          console.log(`✅ Gastos filtrados del usuario ${usuarioId}: ${gastosFiltrados.length} de ${response.length} totales`);
        } else {
          console.warn('⚠️ No se proporcionó usuarioId, mostrando todos los gastos');
        }
        
        // ✅ Mapear cada registro
        const mappedData = gastosFiltrados
          .slice(0, limit)  // Limitar cantidad
          .map(item => {
            try {
              return this.mapBackendToFrontend(item);
            } catch (error) {
              console.error('❌ Error mapeando registro:', item, error);
              return null;
            }
          })
          .filter(item => item !== null) as ExpenseRecord[];
        
        console.log('✅ Gastos mapeados del usuario:', mappedData.length);
        
        return {
          success: true,
          data: mappedData
        };
      }),
      catchError(error => {
        console.error('❌ Error obteniendo gastos recientes:', error);
        return of({
          success: true,
          data: []
        });
      })
    );
  }
  /**
   * Eliminar un registro
   */
  deleteExpense(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      map(() => ({
        success: true,
        data: null,
        message: 'Gasto eliminado correctamente'
      })),
      catchError(this.handleError)
    );
  }

  // ============= CATÁLOGOS =============

  getExpenseTypes(): Observable<ApiResponse<ExpenseType[]>> {
    const mockTypes: ExpenseType[] = [
      { id: 'Combustible', name: 'Combustible', isActive: true },
      { id: 'Mantenimiento', name: 'Mantenimiento', isActive: true },
      { id: 'Repuestos', name: 'Repuestos', isActive: true },
      { id: 'Alimentacion', name: 'Alimentación', isActive: true },
      { id: 'Transporte', name: 'Transporte', isActive: true },
      { id: 'Otros', name: 'Otros', isActive: true }
    ];

    return of({ success: true, data: mockTypes });
  }

  getPaymentMethods(): Observable<ApiResponse<PaymentMethod[]>> {
    const mockMethods: PaymentMethod[] = [
      { id: 'efectivo', name: 'Efectivo', isActive: true },
      { id: 'tarjeta', name: 'Tarjeta', isActive: true },
      { id: 'transferencia', name: 'Transferencia', isActive: true },
      { id: 'cheque', name: 'Cheque', isActive: true }
    ];

    return of({ success: true, data: mockMethods });
  }

  getOperators(): Observable<ApiResponse<Operator[]>> {
    return this.http.get<any[]>(`${environment.apiUrl}/usuarios`).pipe(
      map(usuarios => {
        console.log('👥 Usuarios del backend:', usuarios);
        const operators = usuarios
          .filter(u => u.estado === true)
          .map(usuario => ({
            id: usuario.id.toString(),
            name: usuario.nombre,
            position: usuario.roles,
            isActive: usuario.estado
          }));
        
        return { success: true, data: operators };
      }),
      catchError(error => {
        console.error('❌ Error obteniendo operadores:', error);
        return of({
          success: true,
          data: [{
            id: '999',
            name: 'Operario Test',
            position: 'operario',
            isActive: true
          }]
        });
      })
    );
  }

  // ============= MÉTODOS AUXILIARES =============

  private buildDescription(expense: ExpenseRequest): string {
    let description = expense.description || 'Sin descripción';
    
    if (expense.paymentMethod) {
      description += ` - Método: ${expense.paymentMethod}`;
    }
    
    if (expense.receiptNumber) {
      description += ` - Recibo: ${expense.receiptNumber}`;
    }
    
    return description;
  }

  private mapBackendToFrontend(backendData: any): ExpenseRecord {
    console.log('🔄 Mapeando datos del backend:', backendData);
    
    // ✅ El backend devuelve: { id, usuario_id, maquina_id, tipo, importe_total, fecha, descripcion, imagen }
    return {
      // Campos del backend
      id: backendData.id,
      usuario_id: backendData.usuario_id,
      maquina_id: backendData.maquina_id,
      tipo: backendData.tipo,
      importe_total: backendData.importe_total,
      fecha: backendData.fecha,
      descripcion: backendData.descripcion,
      imagen: backendData.imagen,
      created: backendData.created,
      updated: backendData.updated,
      
      // Campos para el frontend (alias)
      date: backendData.fecha ? backendData.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
      expenseType: backendData.tipo,
      amount: backendData.importe_total,
      operator: backendData.usuario_id?.toString() || '',
      description: backendData.descripcion,
      status: 'approved',  // ✅ Status por defecto
      
      // ✅ Extraer método de pago y número de recibo de la descripción
      paymentMethod: this.extractPaymentMethodFromDescription(backendData.descripcion),
      receiptNumber: this.extractReceiptNumberFromDescription(backendData.descripcion)
    };
  }

  private extractPaymentMethodFromDescription(descripcion: string): string {
    if (!descripcion) return '';
    const match = descripcion.match(/Método:\s*([^-]+)/);
    return match ? match[1].trim() : '';
  }

  private extractReceiptNumberFromDescription(descripcion: string): string {
    if (!descripcion) return '';
    const match = descripcion.match(/Recibo:\s*([^-]+)/);
    return match ? match[1].trim() : '';
  }

  formatAmount(amount: number, currency: string = 'ARS'): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  getExpenseTypeName(typeId: string, expenseTypes: ExpenseType[]): string {
    const type = expenseTypes.find(t => t.id === typeId);
    return type ? type.name : typeId;
  }

  getPaymentMethodName(methodId: string, paymentMethods: PaymentMethod[]): string {
    const method = paymentMethods.find(m => m.id === methodId);
    return method ? method.name : methodId || 'No especificado';
  }

  // ============= MANEJO DE ERRORES =============
  
  private handleError = (error: any): Observable<never> => {
    console.error('❌ Error en ExpenseService:', error);
    
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = 'Datos inválidos. Verifique la información.';
          break;
        case 401:
          errorMessage = 'Sesión expirada. Inicie sesión nuevamente.';
          localStorage.removeItem('access_token');
          localStorage.removeItem('usuarioActual');
          window.location.href = '/login';
          break;
        case 403:
          errorMessage = 'No tiene permisos para esta acción.';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado.';
          break;
        case 422:
          if (error.error?.detail) {
            if (Array.isArray(error.error.detail)) {
              const validationErrors = error.error.detail.map((err: any) => 
                `${err.loc?.join('.')}: ${err.msg}`
              ).join(', ');
              errorMessage = `Error de validación: ${validationErrors}`;
            } else {
              errorMessage = `Error de validación: ${JSON.stringify(error.error.detail)}`;
            }
          }
          break;
        case 500:
          errorMessage = 'Error del servidor. Intente más tarde.';
          if (error.error?.message) {
            errorMessage += ` (${error.error.message})`;
          }
          break;
        default:
          errorMessage = `Error ${error.status}: ${error.message || 'Desconocido'}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}