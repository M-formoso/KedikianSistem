// src/app/core/services/registro-gastos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ============= INTERFACES CORREGIDAS =============

export interface ExpenseRecord {
  id?: number;
  date: string;
  expenseType: string;
  amount: number;
  operator: string;
  paymentMethod?: string;
  receiptNumber?: string;
  description?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

// Interface para el backend de gastos - CORREGIDA según el modelo
export interface GastoCreate {
  usuario_id: number;
  maquina_id: number;
  tipo: string;
  importe_total: number;
  fecha: string; // ISO date string
  descripcion: string;
  imagen?: File | null;
}

export interface GastoOut {
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
}

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
  // CORREGIDA: URL correcta del backend
  private apiUrl = `${environment.apiUrl}/gastos`;
  
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  // ============= MÉTODOS PRINCIPALES CORREGIDOS =============

  /**
   * Crear un nuevo registro de gasto - CORREGIDO para usar FormData
   */
  createExpense(expense: ExpenseRequest): Observable<ApiResponse<ExpenseRecord>> {
    // Convertir ExpenseRequest al formato del backend
    const formData = new FormData();
    formData.append('usuario_id', expense.operator);
    formData.append('maquina_id', '1'); // Por defecto, debería venir del contexto
    formData.append('tipo', expense.expenseType);
    formData.append('importe_total', expense.amount.toString());
    formData.append('fecha', expense.date);
    formData.append('descripcion', expense.description || '');
    
    // El backend espera FormData para los gastos
    return this.http.post<GastoOut>(
      `${this.apiUrl}/`, 
      formData
    ).pipe(
      map(response => ({
        success: true,
        data: this.mapGastoToExpenseRecord(response),
        message: 'Gasto registrado correctamente'
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener registros recientes de gastos - CORREGIDO
   */
  getRecentExpenses(limit: number = 10): Observable<ApiResponse<ExpenseRecord[]>> {
    const params = new HttpParams()
      .set('limit', limit.toString());

    return this.http.get<GastoOut[]>(
      `${this.apiUrl}/`, 
      { params }
    ).pipe(
      map(gastos => ({
        success: true,
        data: gastos.slice(0, limit).map(gasto => this.mapGastoToExpenseRecord(gasto)),
        message: 'Registros obtenidos correctamente'
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener un registro específico por ID
   */
  getExpenseById(id: number): Observable<ApiResponse<ExpenseRecord>> {
    return this.http.get<GastoOut>(`${this.apiUrl}/${id}`).pipe(
      map(gasto => ({
        success: true,
        data: this.mapGastoToExpenseRecord(gasto),
        message: 'Registro obtenido correctamente'
      })),
      catchError(this.handleError)
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

  // ============= MÉTODOS PARA CATÁLOGOS =============

  /**
   * Obtener tipos de gastos - MOCK DATA
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
   * Obtener lista de operadores - USA EL ENDPOINT DE USUARIOS
   */
  getOperators(): Observable<ApiResponse<Operator[]>> {
    return this.http.get<any[]>(`${environment.apiUrl}/usuarios`).pipe(
      map(usuarios => {
        const operators = usuarios
          .filter(u => u.estado === true)
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
        console.error('Error obteniendo operadores:', error);
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

  // ============= MÉTODOS DE VALIDACIÓN =============

  /**
   * Validar número de factura/boleta único
   */
  validateReceiptNumber(receiptNumber: string, excludeId?: number): Observable<ApiResponse<boolean>> {
    // Por ahora retorna siempre válido ya que el backend no tiene esta validación
    return of({
      success: true,
      data: true,
      message: 'Número de recibo válido'
    });
  }

  // ============= MÉTODOS DE UTILIDAD =============

  /**
   * Mapear GastoOut del backend a ExpenseRecord del frontend
   */
  private mapGastoToExpenseRecord(gasto: GastoOut): ExpenseRecord {
    return {
      id: gasto.id,
      date: gasto.fecha.split('T')[0], // Solo la fecha
      expenseType: gasto.tipo,
      amount: gasto.importe_total,
      operator: gasto.usuario_id.toString(),
      description: gasto.descripcion,
      status: 'pending', // Estado por defecto
      createdAt: gasto.created,
      updatedAt: gasto.updated
    };
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
    return type ? type.name : 'Desconocido';
  }

  /**
   * Obtener nombre de método de pago por ID
   */
  getPaymentMethodName(methodId: string, paymentMethods: PaymentMethod[]): string {
    const method = paymentMethods.find(m => m.id === methodId);
    return method ? method.name : 'No especificado';
  }

  // Manejo de errores
  private handleError(error: any): Observable<never> {
    console.error('Error en ExpenseService:', error);
    
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
      
      if (error.error && error.error.detail) {
        errorMessage = error.error.detail;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}