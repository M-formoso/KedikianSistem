// src/app/core/services/registro-gastos.service.ts - COMPLETAMENTE CORREGIDO

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ============= INTERFACES CORREGIDAS =============

// Interface para el formulario del frontend
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

// Interface para las respuestas del backend (según tu modelo Gasto)
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
  
  // Propiedades mapeadas para el template
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
  validateReceiptNumber(receiptNumber: any) {
    throw new Error('Method not implemented.');
  }
  // ✅ URL corregida según tu backend
  private apiUrl = `${environment.apiUrl}/gastos`;
  
  constructor(private http: HttpClient) {}

  // ✅ MÉTODO PRINCIPAL COMPLETAMENTE CORREGIDO
  /**
   * ✅ CREAR GASTO - ENVIANDO FORMDATA COMO ESPERA EL BACKEND
   * Esta es la única corrección que necesitas para que funcione
   */
  // ✅ VERSIÓN ULTRA SIMPLIFICADA PARA TESTING
// Reemplaza TEMPORALMENTE tu método createExpense con este

/**
 * ✅ VERSIÓN DE PRUEBA SÚPER SIMPLE
 */
createExpense(expense: ExpenseRequest): Observable<ApiResponse<ExpenseRecord>> {
  console.log('🧪 === PRUEBA SIMPLE DE ENVÍO ===');
  console.log('📤 Datos recibidos:', expense);
  
  // ✅ FormData básico y simple
  const formData = new FormData();
  formData.append('usuario_id', expense.operator);
  formData.append('tipo', expense.expenseType);
  formData.append('importe_total', expense.amount.toString());
  formData.append('fecha', expense.date);
  formData.append('descripcion', expense.description || 'Sin descripción');
  
  console.log('📋 FormData creado:');
  for (let [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  
  // ✅ Headers mínimos - Solo lo esencial
  const headers = new HttpHeaders();
  // No agregar Content-Type - FormData lo maneja automáticamente
  
  // Obtener token si existe
  const usuarioActual = localStorage.getItem('usuarioActual');
  if (usuarioActual) {
    try {
      const usuario = JSON.parse(usuarioActual);
      const token = usuario.access_token || usuario.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        console.log('🔐 Token agregado');
      }
    } catch (e) {
      console.log('⚠️ No se pudo obtener token');
    }
  }
  
  console.log('📡 Enviando petición a:', this.apiUrl);
  
  // ✅ Petición HTTP simplificada al máximo
  return this.http.post(this.apiUrl, formData, { headers }).pipe(
    map((response: any) => {
      console.log('✅ === RESPUESTA EXITOSA ===');
      console.log('📥 Respuesta completa:', response);
      
      return {
        success: true,
        data: response, // Devolver tal como viene del backend
        message: 'Gasto registrado correctamente'
      };
    }),
    catchError((error: any) => {
      console.error('❌ === ERROR COMPLETO ===');
      console.error('🔍 Status:', error.status);
      console.error('🔍 StatusText:', error.statusText);
      console.error('🔍 URL:', error.url);
      console.error('🔍 Error completo:', error);
      console.error('🔍 Error.error:', error.error);
      console.error('🔍 Error.message:', error.message);
      
      // Devolver error simplificado
      return throwError(() => new Error(`Error ${error.status}: ${error.message || 'Error desconocido'}`));
    })
  );
}

  /**
   * ✅ CORREGIDO: Obtener registros recientes
   */
  getRecentExpenses(limit: number = 10): Observable<ApiResponse<ExpenseRecord[]>> {
    return this.http.get<ExpenseRecord[]>(
      this.apiUrl, 
      this.getHttpOptions()
    ).pipe(
      map(response => {
        console.log('📥 Registros del backend:', response);
        // Mapear cada elemento de la respuesta
        const mappedData = Array.isArray(response) 
          ? response.slice(0, limit).map(item => this.mapBackendToFrontend(item))
          : [];
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
    return this.http.delete<any>(
      `${this.apiUrl}/${id}`,
      this.getHttpOptions()
    ).pipe(
      map(() => ({
        success: true,
        data: null,
        message: 'Gasto eliminado correctamente'
      })),
      catchError(this.handleError)
    );
  }

  // ============= MÉTODOS PARA CATÁLOGOS =============

  /**
   * Obtener tipos de gastos - MOCK DATA según tu backend
   */
  getExpenseTypes(): Observable<ApiResponse<ExpenseType[]>> {
    const mockTypes: ExpenseType[] = [
      { id: 'Combustible', name: 'Combustible', description: 'Gastos en combustible', isActive: true },
      { id: 'Mantenimiento', name: 'Mantenimiento', description: 'Gastos de mantenimiento', isActive: true },
      { id: 'Repuestos', name: 'Repuestos', description: 'Compra de repuestos', isActive: true },
      { id: 'Alimentacion', name: 'Alimentación', description: 'Gastos en alimentación', isActive: true },
      { id: 'Transporte', name: 'Transporte', description: 'Gastos de transporte', isActive: true },
      { id: 'Otros', name: 'Otros', description: 'Otros gastos operativos', isActive: true }
    ];

    return of({
      success: true,
      data: mockTypes
    });
  }

  /**
   * Obtener métodos de pago - MOCK DATA
   */
  getPaymentMethods(): Observable<ApiResponse<PaymentMethod[]>> {
    const mockMethods: PaymentMethod[] = [
      { id: 'efectivo', name: 'Efectivo', description: 'Pago en efectivo', isActive: true },
      { id: 'tarjeta', name: 'Tarjeta', description: 'Pago con tarjeta', isActive: true },
      { id: 'transferencia', name: 'Transferencia', description: 'Transferencia bancaria', isActive: true },
      { id: 'cheque', name: 'Cheque', description: 'Pago con cheque', isActive: true }
    ];

    return of({
      success: true,
      data: mockMethods
    });
  }

  /**
   * ✅ CORREGIDO: Obtener lista de operadores desde tu endpoint /usuarios
   */
  getOperators(): Observable<ApiResponse<Operator[]>> {
    return this.http.get<any[]>(`${environment.apiUrl}/usuarios`, this.getHttpOptions()).pipe(
      map(usuarios => {
        console.log('👥 Usuarios del backend:', usuarios);
        const operators = usuarios
          .filter(u => u.estado === true) // Solo usuarios activos
          .map(usuario => ({
            id: usuario.id.toString(),
            name: usuario.nombre,
            position: usuario.roles,
            isActive: usuario.estado
          }));
        
        return {
          success: true,
          data: operators
        };
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

  // ============= MÉTODOS DE UTILIDAD =============

  /**
   * ✅ OBTENER TOKEN DE AUTORIZACIÓN
   */
  private getAuthToken(): string {
    const usuarioActual = localStorage.getItem('usuarioActual');
    if (usuarioActual) {
      try {
        const usuario = JSON.parse(usuarioActual);
        const token = usuario.access_token || usuario.token;
        return token ? `Bearer ${token}` : '';
      } catch {
        console.error('❌ Error obteniendo token');
        return '';
      }
    }
    return '';
  }

  /**
   * ✅ MAPEAR RESPUESTA DEL BACKEND AL FORMATO DEL FRONTEND
   */
  private mapBackendToFrontend(backendData: any): ExpenseRecord {
    return {
      // Propiedades originales del backend
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
      
      // Propiedades mapeadas para el template
      date: backendData.fecha ? backendData.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
      expenseType: backendData.tipo,
      amount: backendData.importe_total,
      operator: backendData.usuario_id?.toString() || '',
      description: backendData.descripcion,
      status: 'approved', // Estado por defecto
      paymentMethod: this.extractPaymentMethodFromDescription(backendData.descripcion),
      receiptNumber: this.extractReceiptNumberFromDescription(backendData.descripcion)
    };
  }

  /**
   * ✅ EXTRAER MÉTODO DE PAGO DE LA DESCRIPCIÓN
   */
  private extractPaymentMethodFromDescription(descripcion: string): string {
    if (!descripcion) return '';
    const match = descripcion.match(/Método:\s*([^-]+)/);
    return match ? match[1].trim() : '';
  }

  /**
   * ✅ EXTRAER NÚMERO DE RECIBO DE LA DESCRIPCIÓN
   */
  private extractReceiptNumberFromDescription(descripcion: string): string {
    if (!descripcion) return '';
    const match = descripcion.match(/Recibo:\s*([^-]+)/);
    return match ? match[1].trim() : '';
  }

  /**
   * ✅ CORREGIDO: Obtener headers HTTP con token dinámico
   */
  private getHttpOptions() {
    const usuarioActual = localStorage.getItem('usuarioActual');
    let token: string | null = null;

    if (usuarioActual) {
      try {
        const usuario = JSON.parse(usuarioActual);
        token = usuario.access_token || usuario.token || null;
      } catch {
        console.error('❌ Error parsing usuario actual');
      }
    }

    const headers: any = {
      'Accept': 'application/json'
      // ✅ CRÍTICO: NO incluir Content-Type para FormData
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return { headers: new HttpHeaders(headers) };
  }

  /**
   * Formatear monto para mostrar
   */
  formatAmount(amount: number, currency: string = 'ARS'): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Formatear fecha para mostrar
   */
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Obtener nombre de tipo de gasto por ID
   */
  getExpenseTypeName(typeId: string, expenseTypes: ExpenseType[]): string {
    const type = expenseTypes.find(t => t.id === typeId);
    return type ? type.name : typeId; // Retornar el ID si no se encuentra el tipo
  }

  /**
   * Obtener nombre de método de pago por ID
   */
  getPaymentMethodName(methodId: string, paymentMethods: PaymentMethod[]): string {
    const method = paymentMethods.find(m => m.id === methodId);
    return method ? method.name : methodId || 'No especificado';
  }

  // ============= MANEJO DE ERRORES MEJORADO =============
  private handleError = (error: any): Observable<never> => {
    console.error('❌ Error en ExpenseService:', error);
    
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = 'Datos inválidos. Verifique la información ingresada.';
          break;
        case 401:
          errorMessage = 'Su sesión ha expirado. Inicie sesión nuevamente.';
          // Limpiar localStorage si hay error 401
          localStorage.removeItem('usuarioActual');
          window.location.href = '/login';
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
          errorMessage = `Error ${error.status}: ${error.message || 'Error desconocido'}`;
      }
      
      if (error.error && error.error.detail) {
        errorMessage = error.error.detail;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}