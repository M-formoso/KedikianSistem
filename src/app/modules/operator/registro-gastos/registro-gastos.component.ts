import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { 
  ExpenseService,
  ExpenseRequest,
  ExpenseRecord,
  ExpenseType,
  PaymentMethod,
  Operator
} from '../../../core/services/registro-gastos.service';

@Component({
  selector: 'app-registro-gastos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './registro-gastos.component.html',
  styleUrls: ['./registro-gastos.component.css']
})
export class RegistroGastosComponent implements OnInit, OnDestroy {
  // Formulario
  expenseForm!: FormGroup;
  
  // Estados del componente
  submitted = false;
  success = false;
  error = '';
  loading = false;
  loadingMasterData = false;
  
  // Datos maestros desde el backend
  expenseTypes: ExpenseType[] = [];
  paymentMethods: PaymentMethod[] = [];
  operators: Operator[] = [];
  
  // Registros recientes
  recentExpenses: ExpenseRecord[] = [];
  
  // Fecha formateada para mostrar
  formattedCurrentDate: string = '';
  
  // Para cancelar suscripciones
  private destroy$ = new Subject<void>();
  
  constructor(
    private formBuilder: FormBuilder,
    private expenseService: ExpenseService
  ) {
    this.initializeForm();
    this.setFormattedCurrentDate();
  }
  
  ngOnInit(): void {
    this.loadMasterData();
    this.loadRecentExpenses();
    this.setupMobileTable();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.expenseForm = this.formBuilder.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      expenseType: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      paymentMethod: ['', Validators.required],
      receiptNumber: [''],
      operator: ['', Validators.required],
      description: ['', Validators.maxLength(500)]
    });
  }
  
  // Configuración para la tabla responsiva en móviles
  setupMobileTable(): void {
    // Implementar lógica para tabla responsiva si es necesario
  }
  
  // Getter para acceder más fácilmente a los campos del formulario
  get f() { 
    return this.expenseForm.controls; 
  }
  
  /**
   * Cargar todos los datos maestros necesarios para el formulario
   */
  loadMasterData(): void {
    this.loadingMasterData = true;
    this.error = '';
    
    // Cargar todos los datos maestros en paralelo
    forkJoin({
      expenseTypes: this.expenseService.getExpenseTypes(),
      paymentMethods: this.expenseService.getPaymentMethods(),
      operators: this.expenseService.getOperators()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (responses: any) => {
        // Verificar que todas las respuestas sean exitosas
        if (responses.expenseTypes && responses.expenseTypes.success) {
          this.expenseTypes = responses.expenseTypes.data || [];
        }
        
        if (responses.paymentMethods && responses.paymentMethods.success) {
          this.paymentMethods = responses.paymentMethods.data || [];
        }
        
        if (responses.operators && responses.operators.success) {
          this.operators = responses.operators.data || [];
        }
        
        this.loadingMasterData = false;
      },
      error: (error: any) => {
        this.error = `Error al cargar datos: ${error.message || error}`;
        this.loadingMasterData = false;
        console.error('Error cargando datos maestros:', error);
      }
    });
  }
  
  /**
   * Cargar registros recientes de gastos
   */
  loadRecentExpenses(): void {
    this.expenseService.getRecentExpenses(10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.success && response.data) {
            this.recentExpenses = response.data;
          }
        },
        error: (error: any) => {
          console.error('Error cargando registros recientes:', error);
          // No mostrar error al usuario para registros recientes
        }
      });
  }
  
  /**
   * Enviar formulario
   */
  onSubmit(): void {
    this.submitted = true;
    this.success = false;
    this.error = '';
    
    if (this.expenseForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    
    const formValues = this.expenseForm.value;
    const expenseData: ExpenseRequest = {
      date: formValues.date,
      expenseType: formValues.expenseType,
      amount: parseFloat(formValues.amount),
      paymentMethod: formValues.paymentMethod,
      receiptNumber: formValues.receiptNumber || '',
      operator: formValues.operator,
      description: formValues.description || ''
    };

    this.expenseService.createExpense(expenseData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          if (response && response.success) {
            this.success = true;
            this.loadRecentExpenses(); // Recargar la lista
            this.resetForm();
            
            // Ocultar mensaje de éxito después de 5 segundos
            setTimeout(() => {
              this.success = false;
            }, 5000);
          } else {
            this.error = (response && response.message) || 'Error al crear el registro de gasto';
          }
        },
        error: (error: any) => {
          this.loading = false;
          this.error = error.message || error || 'Error al procesar la solicitud';
          console.error('Error creando registro de gasto:', error);
        }
      });
  }

  /**
   * Resetear formulario
   */
  resetForm(): void {
    this.submitted = false;
    this.expenseForm.reset({
      date: new Date().toISOString().split('T')[0],
      expenseType: '',
      amount: '',
      paymentMethod: '',
      receiptNumber: '',
      operator: '',
      description: ''
    });
  }
  
  /**
   * Marcar todos los campos del formulario como tocados para mostrar errores
   */
  private markFormGroupTouched(): void {
    Object.keys(this.expenseForm.controls).forEach(key => {
      const control = this.expenseForm.get(key);
      control?.markAsTouched();
    });
  }
  
  /**
   * Refrescar datos maestros
   */
  refreshMasterData(): void {
    this.loadMasterData();
  }
  
  /**
   * Refrescar registros recientes
   */
  refreshRecentExpenses(): void {
    this.loadRecentExpenses();
  }
  
  /**
   * Manejar cambio de tipo de gasto
   */
  onExpenseTypeChange(): void {
    const expenseTypeId = this.expenseForm.get('expenseType')?.value;
    
    if (expenseTypeId) {
      // Cargar operadores por tipo de gasto (si existe esa funcionalidad en el futuro)
      // Por ahora usar todos los operadores disponibles
      this.expenseService.getOperators()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response && response.success) {
              this.operators = response.data || [];
            }
          },
          error: (error: any) => {
            console.error('Error cargando operadores:', error);
          }
        });
    }
  }
  
  /**
   * Validar número de recibo duplicado
   */
  validateReceiptNumber(): void {
    const receiptNumber = this.expenseForm.get('receiptNumber')?.value;
    
    if (receiptNumber && receiptNumber.trim() !== '') {
      this.expenseService.validateReceiptNumber(receiptNumber)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response && (!response.success || !response.data)) {
              this.expenseForm.get('receiptNumber')?.setErrors({ 'duplicate': true });
            } else {
              // Limpiar error si la validación es exitosa
              const receiptControl = this.expenseForm.get('receiptNumber');
              if (receiptControl?.errors?.['duplicate']) {
                delete receiptControl.errors['duplicate'];
                if (Object.keys(receiptControl.errors).length === 0) {
                  receiptControl.setErrors(null);
                }
              }
            }
          },
          error: (error: any) => {
            console.error('Error validando número de recibo:', error);
          }
        });
    }
  }
  
  // ============ MÉTODOS DE UTILIDAD PARA LA VISTA ============
  
  /**
   * Obtener nombre del tipo de gasto por ID
   */
  getExpenseTypeName(expenseTypeId: string): string {
    const expenseType = this.expenseTypes.find(et => et.id === expenseTypeId);
    return expenseType ? expenseType.name : 'Tipo desconocido';
  }
  
  /**
   * Obtener nombre del método de pago por ID
   */
  getPaymentMethodName(paymentMethodId: string): string {
    const paymentMethod = this.paymentMethods.find(pm => pm.id === paymentMethodId);
    return paymentMethod ? paymentMethod.name : 'Método desconocido';
  }
  
  /**
   * Obtener nombre del operador por ID
   */
  getOperatorName(operatorId: string): string {
    const operator = this.operators.find(o => o.id === operatorId);
    return operator ? operator.name : 'Operador desconocido';
  }
  
  /**
   * Verificar si un campo del formulario tiene errores
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.expenseForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }
  
  /**
   * Obtener mensaje de error para un campo específico
   */
  getFieldError(fieldName: string): string {
    const field = this.expenseForm.get(fieldName);
    
    if (field?.errors) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} es requerido`;
      }
      if (field.errors['min']) {
        return `${this.getFieldLabel(fieldName)} debe ser mayor a ${field.errors['min'].min}`;
      }
      if (field.errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} no puede exceder ${field.errors['maxlength'].requiredLength} caracteres`;
      }
      if (field.errors['duplicate']) {
        return `Este número de recibo ya existe en el sistema`;
      }
    }
    
    return '';
  }
  
  /**
   * Obtener etiqueta del campo para mensajes de error
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'date': 'La fecha',
      'expenseType': 'El tipo de gasto',
      'amount': 'El monto',
      'paymentMethod': 'El método de pago',
      'receiptNumber': 'El número de recibo',
      'operator': 'El operador',
      'description': 'La descripción'
    };
    
    return labels[fieldName] || fieldName;
  }
  
  /**
   * Obtener estado de carga general
   */
  get isLoading(): boolean {
    return this.loading || this.loadingMasterData;
  }
  
  /**
   * Manejar cambio de número de recibo
   */
  onReceiptNumberChange(): void {
    this.validateReceiptNumber();
  }
  
  /**
   * Filtrar operadores por estado activo
   */
  get activeOperators(): Operator[] {
    return this.operators.filter(operator => operator.isActive !== false);
  }
  
  /**
   * Filtrar tipos de gasto por estado activo
   */
  get activeExpenseTypes(): ExpenseType[] {
    return this.expenseTypes.filter(expenseType => expenseType.isActive !== false);
  }
  
  /**
   * Filtrar métodos de pago por estado activo
   */
  get activePaymentMethods(): PaymentMethod[] {
    return this.paymentMethods.filter(paymentMethod => paymentMethod.isActive !== false);
  }
  
  /**
   * Formatear monto para mostrar
   */
  formatAmount(amount: number): string {
    return this.expenseService.formatAmount(amount);
  }
  
  /**
   * Obtener estado del gasto
   */
  getExpenseStatus(expense: ExpenseRecord): string {
    return expense.status || 'pending';
  }
  
  /**
   * Obtener clase CSS para el estado
   */
  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'pending': 'badge-warning',
      'approved': 'badge-success',
      'rejected': 'badge-danger'
    };
    
    return statusClasses[status] || 'badge-secondary';
  }
  
  /**
   * Calcular total de gastos recientes
   */
  getTotalRecentExpenses(): number {
    return this.recentExpenses.reduce((total, expense) => total + expense.amount, 0);
  }
  
  /**
   * Obtener gastos por estado
   */
  getExpensesByStatus(status: string): ExpenseRecord[] {
    return this.recentExpenses.filter(expense => expense.status === status);
  }

  /**
   * Establecer la fecha formateada para mostrar en la vista
   */
  private setFormattedCurrentDate(): void {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    this.formattedCurrentDate = today.toLocaleDateString('es-ES', options);
  }
}