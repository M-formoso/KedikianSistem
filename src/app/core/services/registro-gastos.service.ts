import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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

export interface ExpenseRequest {
  date: string;
  expenseType: string;
  amount: number;
  operator: string;
  paymentMethod?: string;
  receiptNumber?: string;
  description?: string;
  status?: string; // Por defecto será 'pending'
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

export interface ExpenseStatus {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: any[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ExpenseStats {
  totalAmount: number;
  totalRecords: number;
  averageAmount: number;
  expensesByType: { [key: string]: number };
  expensesByStatus: { [key: string]: number };
  monthlyTotal: number;
  pendingAmount: number;
  approvedAmount: number;
  periodStart: string;
  periodEnd: string;
}

export interface ExpenseSummary {
  period: string;
  totalAmount: number;
  totalRecords: number;
  byType: { type: string; amount: number; count: number }[];
  byOperator: { operator: string; amount: number; count: number }[];
  byStatus: { status: string; amount: number; count: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private apiUrl = `${environment.apiUrl}/expenses`;
  private catalogsUrl = `${environment.apiUrl}/catalogs`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  // CRUD Operations para Expenses

  /**
   * Crear un nuevo registro de gasto
   */
  createExpense(expense: ExpenseRequest): Observable<ApiResponse<ExpenseRecord>> {
    const payload = {
      ...expense,
      status: expense.status || 'pending', // Estado por defecto
      amount: parseFloat(expense.amount.toString()) // Asegurar que sea número
    };

    return this.http.post<ApiResponse<ExpenseRecord>>(
      `${this.apiUrl}`, 
      payload, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener todos los registros de gastos con paginación
   */
  getExpenses(page: number = 1, limit: number = 10, filters?: any): Observable<PaginatedResponse<ExpenseRecord>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    // Aplicar filtros si existen
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params = params.set(key, filters[key]);
        }
      });
    }

    return this.http.get<PaginatedResponse<ExpenseRecord>>(
      `${this.apiUrl}`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener registros recientes (últimos 10)
   */
  getRecentExpenses(limit: number = 10): Observable<ApiResponse<ExpenseRecord[]>> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('recent', 'true');

    return this.http.get<ApiResponse<ExpenseRecord[]>>(
      `${this.apiUrl}/recent`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener un registro específico por ID
   */
  getExpenseById(id: number): Observable<ApiResponse<ExpenseRecord>> {
    return this.http.get<ApiResponse<ExpenseRecord>>(
      `${this.apiUrl}/${id}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualizar un registro existente
   */
  updateExpense(id: number, expense: Partial<ExpenseRequest>): Observable<ApiResponse<ExpenseRecord>> {
    let payload = { ...expense };
    
    // Asegurar que el amount sea número si se está actualizando
    if (expense.amount !== undefined) {
      payload.amount = parseFloat(expense.amount.toString());
    }

    return this.http.put<ApiResponse<ExpenseRecord>>(
      `${this.apiUrl}/${id}`, 
      payload, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Eliminar un registro
   */
  deleteExpense(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.apiUrl}/${id}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Cambiar estado de un gasto (aprobar, rechazar, etc.)
   */
  changeExpenseStatus(id: number, status: string, comment?: string): Observable<ApiResponse<ExpenseRecord>> {
    const payload = { status, comment };
    
    return this.http.patch<ApiResponse<ExpenseRecord>>(
      `${this.apiUrl}/${id}/status`, 
      payload, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Métodos para obtener catálogos/datos de referencia

  /**
   * Obtener tipos de gastos
   */
  getExpenseTypes(): Observable<ApiResponse<ExpenseType[]>> {
    return this.http.get<ApiResponse<ExpenseType[]>>(
      `${this.catalogsUrl}/expense-types`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener métodos de pago
   */
  getPaymentMethods(): Observable<ApiResponse<PaymentMethod[]>> {
    return this.http.get<ApiResponse<PaymentMethod[]>>(
      `${this.catalogsUrl}/payment-methods`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener lista de operadores/responsables
   */
  getOperators(): Observable<ApiResponse<Operator[]>> {
    return this.http.get<ApiResponse<Operator[]>>(
      `${this.catalogsUrl}/operators`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener estados de gastos
   */
  getExpenseStatuses(): Observable<ApiResponse<ExpenseStatus[]>> {
    return this.http.get<ApiResponse<ExpenseStatus[]>>(
      `${this.catalogsUrl}/expense-statuses`
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Métodos de reportes y estadísticas

  /**
   * Obtener gastos por rango de fechas
   */
  getExpensesByDateRange(startDate: string, endDate: string): Observable<ApiResponse<ExpenseRecord[]>> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<ApiResponse<ExpenseRecord[]>>(
      `${this.apiUrl}/by-date-range`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener gastos por tipo
   */
  getExpensesByType(expenseTypeId: string): Observable<ApiResponse<ExpenseRecord[]>> {
    return this.http.get<ApiResponse<ExpenseRecord[]>>(
      `${this.apiUrl}/by-type/${expenseTypeId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener gastos por operador
   */
  getExpensesByOperator(operatorId: string): Observable<ApiResponse<ExpenseRecord[]>> {
    return this.http.get<ApiResponse<ExpenseRecord[]>>(
      `${this.apiUrl}/by-operator/${operatorId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener gastos por estado
   */
  getExpensesByStatus(status: string): Observable<ApiResponse<ExpenseRecord[]>> {
    return this.http.get<ApiResponse<ExpenseRecord[]>>(
      `${this.apiUrl}/by-status/${status}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener gastos por método de pago
   */
  getExpensesByPaymentMethod(paymentMethodId: string): Observable<ApiResponse<ExpenseRecord[]>> {
    return this.http.get<ApiResponse<ExpenseRecord[]>>(
      `${this.apiUrl}/by-payment-method/${paymentMethodId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener estadísticas de gastos
   */
  getExpenseStats(period?: string, filters?: any): Observable<ApiResponse<ExpenseStats>> {
    let params = new HttpParams();
    
    if (period) {
      params = params.set('period', period);
    }

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params = params.set(key, filters[key]);
        }
      });
    }
    
    return this.http.get<ApiResponse<ExpenseStats>>(
      `${this.apiUrl}/stats`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener resumen de gastos por período
   */
  getExpensesSummary(startDate: string, endDate: string, groupBy?: string): Observable<ApiResponse<ExpenseSummary>> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    if (groupBy) {
      params = params.set('groupBy', groupBy);
    }

    return this.http.get<ApiResponse<ExpenseSummary>>(
      `${this.apiUrl}/summary`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener gastos mensuales
   */
  getMonthlyExpenses(year: number, month: number): Observable<ApiResponse<ExpenseRecord[]>> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString());

    return this.http.get<ApiResponse<ExpenseRecord[]>>(
      `${this.apiUrl}/monthly`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener gastos pendientes de aprobación
   */
  getPendingExpenses(): Observable<ApiResponse<ExpenseRecord[]>> {
    return this.http.get<ApiResponse<ExpenseRecord[]>>(
      `${this.apiUrl}/pending`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtener top gastos por monto
   */
  getTopExpensesByAmount(limit: number = 10): Observable<ApiResponse<ExpenseRecord[]>> {
    const params = new HttpParams()
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<ExpenseRecord[]>>(
      `${this.apiUrl}/top-by-amount`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Métodos de validación

  /**
   * Validar número de factura/boleta único
   */
  validateReceiptNumber(receiptNumber: string, excludeId?: number): Observable<ApiResponse<boolean>> {
    let params = new HttpParams()
      .set('receiptNumber', receiptNumber);

    if (excludeId) {
      params = params.set('excludeId', excludeId.toString());
    }

    return this.http.get<ApiResponse<boolean>>(
      `${this.apiUrl}/validate-receipt`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Validar límite de gasto por tipo y período
   */
  validateExpenseLimit(expenseTypeId: string, amount: number, date: string): Observable<ApiResponse<{ isValid: boolean; limit: number; currentTotal: number }>> {
    const params = new HttpParams()
      .set('expenseTypeId', expenseTypeId)
      .set('amount', amount.toString())
      .set('date', date);

    return this.http.get<ApiResponse<{ isValid: boolean; limit: number; currentTotal: number }>>(
      `${this.apiUrl}/validate-limit`, 
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Validar que la fecha no sea futura
   */
  validateExpenseDate(date: string): boolean {
    const expenseDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Permitir hasta el final del día actual
    
    return expenseDate <= today;
  }

  /**
   * Validar monto mínimo y máximo
   */
  validateAmount(amount: number): { isValid: boolean; message?: string } {
    if (amount <= 0) {
      return { isValid: false, message: 'El monto debe ser mayor a cero' };
    }
    
    if (amount > 999999999) {
      return { isValid: false, message: 'El monto es demasiado alto' };
    }
    
    return { isValid: true };
  }

  // Métodos de utilidad

  /**
   * Formatear monto para mostrar
   */
  formatAmount(amount: number, currency: string = 'CLP'): string {
    return new Intl.NumberFormat('es-CL', {
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
    return new Date(date).toLocaleDateString('es-CL', {
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

  /**
   * Obtener nombre de operador por ID
   */
  getOperatorName(operatorId: string, operators: Operator[]): string {
    const operator = operators.find(o => o.id === operatorId);
    return operator ? operator.name : 'Desconocido';
  }

  /**
   * Obtener nombre de estado por ID
   */
  getStatusName(statusId: string, statuses: ExpenseStatus[]): string {
    const status = statuses.find(s => s.id === statusId);
    return status ? status.name : 'Desconocido';
  }

  /**
   * Calcular total de gastos en un array
   */
  calculateTotal(expenses: ExpenseRecord[]): number {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  }

  /**
   * Filtrar gastos por múltiples criterios
   */
  filterExpenses(expenses: ExpenseRecord[], filters: {
    dateFrom?: string;
    dateTo?: string;
    expenseType?: string;
    operator?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
  }): ExpenseRecord[] {
    return expenses.filter(expense => {
      // Filtro por fecha desde
      if (filters.dateFrom && expense.date < filters.dateFrom) {
        return false;
      }
      
      // Filtro por fecha hasta
      if (filters.dateTo && expense.date > filters.dateTo) {
        return false;
      }
      
      // Filtro por tipo de gasto
      if (filters.expenseType && expense.expenseType !== filters.expenseType) {
        return false;
      }
      
      // Filtro por operador
      if (filters.operator && expense.operator !== filters.operator) {
        return false;
      }
      
      // Filtro por estado
      if (filters.status && expense.status !== filters.status) {
        return false;
      }
      
      // Filtro por monto mínimo
      if (filters.minAmount && expense.amount < filters.minAmount) {
        return false;
      }
      
      // Filtro por monto máximo
      if (filters.maxAmount && expense.amount > filters.maxAmount) {
        return false;
      }
      
      return true;
    });
  }

  // Métodos de exportación

  /**
   * Exportar gastos a CSV
   */
  exportToCSV(filters?: any): Observable<Blob> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params = params.set(key, filters[key]);
        }
      });
    }

    return this.http.get(`${this.apiUrl}/export/csv`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Exportar gastos a Excel
   */
  exportToExcel(filters?: any): Observable<Blob> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params = params.set(key, filters[key]);
        }
      });
    }

    return this.http.get(`${this.apiUrl}/export/excel`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Generar reporte PDF
   */
  generatePDFReport(filters?: any): Observable<Blob> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params = params.set(key, filters[key]);
        }
      });
    }

    return this.http.get(`${this.apiUrl}/report/pdf`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Manejo de errores
  private handleError(error: any): Observable<never> {
    console.error('Error en ExpenseService:', error);
    
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
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
        case 409:
          errorMessage = 'Conflicto: El número de factura/boleta ya existe.';
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