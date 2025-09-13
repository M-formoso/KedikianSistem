import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
import { AuthService } from '../../../core/services/auth.service';

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
  
  // Operador actual
  currentOperator: Operator | null = null;
  
  // Para cancelar suscripciones
  private destroy$ = new Subject<void>();
  
  constructor(
    private formBuilder: FormBuilder,
    private expenseService: ExpenseService,
    private authService: AuthService
  ) {
    this.initializeForm();
    this.setFormattedCurrentDate();
  }
  
  ngOnInit(): void {
    this.loadCurrentOperator();
    this.loadMasterData();
    this.loadRecentExpenses();
    this.setupMobileTable();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ CRÍTICO: Getter para acceder a los controles del formulario
  get f() { 
    return this.expenseForm.controls; 
  }

  /**
   * ✅ CORREGIDO: Inicializar formulario con validaciones correctas
   */
  private initializeForm(): void {
    this.expenseForm = this.formBuilder.group({
      // La fecha se establece automáticamente como hoy y es readonly
      date: [{ value: new Date().toISOString().split('T')[0], disabled: true }],
      expenseType: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      paymentMethod: [''],
      receiptNumber: [''],
      // El operador se carga automáticamente desde la sesión
      operator: [{ value: '', disabled: true }],
      description: ['']
    });
  }
  
  /**
   * ✅ CORREGIDO: Cargar operador actual desde el servicio de autenticación
   */
  private loadCurrentOperator(): void {
    const currentUser = this.authService.getCurrentUser();
    console.log('🔍 Usuario obtenido del AuthService:', currentUser);
    
    if (currentUser) {
      // ✅ CRÍTICO: Verificar que el usuario tenga un ID válido
      const userId = typeof currentUser.id === 'string' 
        ? parseInt(currentUser.id, 10) 
        : Number(currentUser.id);

      if (isNaN(userId)) {
        console.error('❌ ID de usuario inválido:', currentUser.id);
        this.error = 'Error: ID de usuario inválido. Inicie sesión nuevamente.';
        return;
      }

      // Crear objeto Operator basado en el usuario actual
      this.currentOperator = {
        id: userId.toString(),
        name: currentUser.nombreUsuario || 'Usuario Test',
        position: Array.isArray(currentUser.roles) ? currentUser.roles.join(',') : (currentUser.roles || 'operario'),
        isActive: true
      };
      
      // Establecer el operador en el formulario
      this.expenseForm.patchValue({
        operator: this.currentOperator.id
      });
      
      console.log('✅ Operador actual cargado:', this.currentOperator);
    } else {
      console.error('❌ No se encontró usuario autenticado');
      this.error = 'No se pudo cargar la información del usuario. Inicie sesión nuevamente.';
      
      // Redirigir al login si no hay usuario
      setTimeout(() => {
        this.authService.cerrarSesion();
      }, 2000);
    }
  }

  // Configuración para la tabla responsiva en móviles
  setupMobileTable(): void {
    // Implementar lógica para tabla responsiva si es necesario
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
        console.log('✅ Datos maestros cargados correctamente');
      },
      error: (error: any) => {
        this.error = `Error al cargar datos: ${error.message || error}`;
        this.loadingMasterData = false;
        console.error('❌ Error cargando datos maestros:', error);
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
            console.log('✅ Registros recientes cargados:', this.recentExpenses.length);
          }
        },
        error: (error: any) => {
          console.error('❌ Error cargando registros recientes:', error);
          // No mostrar error al usuario para registros recientes
        }
      });
  }
  
  /**
   * ✅ CORREGIDO: Enviar formulario
   */
  onSubmit(): void {
    this.submitted = true;
    this.success = false;
    this.error = '';
    
    console.log('🚀 onSubmit llamado');
    console.log('📋 Estado del formulario:', {
      valid: this.expenseForm.valid,
      invalid: this.expenseForm.invalid,
      values: this.expenseForm.value,
      errors: this.expenseForm.errors
    });

    // ✅ CRÍTICO: Verificar autenticación antes de enviar
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      this.error = 'Su sesión ha expirado. Inicie sesión nuevamente.';
      setTimeout(() => {
        this.authService.cerrarSesion();
      }, 2000);
      return;
    }

    // ✅ CRÍTICO: Verificar que hay token válido
    const usuarioActual = localStorage.getItem('usuarioActual');
    if (!usuarioActual) {
      this.error = 'No se encontró información de autenticación. Inicie sesión nuevamente.';
      setTimeout(() => {
        this.authService.cerrarSesion();
      }, 2000);
      return;
    }

    let token: string | null = null;
    try {
      const usuario = JSON.parse(usuarioActual);
      token = usuario.access_token || usuario.token || null;
    } catch (error) {
      console.error('❌ Error parsing usuario actual:', error);
      this.error = 'Error en la información de autenticación. Inicie sesión nuevamente.';
      return;
    }

    if (!token) {
      this.error = 'Token de autenticación no válido. Inicie sesión nuevamente.';
      setTimeout(() => {
        this.authService.cerrarSesion();
      }, 2000);
      return;
    }
    
    if (this.expenseForm.invalid) {
      this.markFormGroupTouched();
      console.log('❌ Formulario inválido, errores por campo:');
      Object.keys(this.expenseForm.controls).forEach(key => {
        const control = this.expenseForm.get(key);
        if (control && control.errors) {
          console.log(`   ${key}:`, control.errors);
        }
      });
      return;
    }

    if (!this.currentOperator) {
      this.error = 'No se pudo cargar la información del operador';
      return;
    }

    this.loading = true;
    
    const formValues = this.expenseForm.value;
    
    // ✅ CORREGIDO: Crear objeto de gasto según las interfaces del backend
    const expenseData: ExpenseRequest = {
      date: new Date().toISOString().split('T')[0], // Fecha actual
      expenseType: formValues.expenseType,
      amount: parseFloat(formValues.amount),
      paymentMethod: formValues.paymentMethod || '',
      receiptNumber: formValues.receiptNumber || '',
      operator: this.currentOperator.id,
      description: formValues.description || ''
    };

    console.log('📤 Enviando gasto:', expenseData);
    console.log('🎫 Token disponible:', !!token);

    this.expenseService.createExpense(expenseData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          console.log('📥 Respuesta recibida:', response);
          
          if (response && response.success) {
            this.success = true;
            this.loadRecentExpenses(); // Recargar la lista
            this.resetForm();
            
            console.log('✅ Gasto registrado exitosamente');
            
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
          console.error('❌ Error completo:', error);
          
          // ✅ MANEJO ESPECÍFICO DE ERROR 401
          if (error.message && error.message.includes('Su sesión ha expirado')) {
            this.error = 'Su sesión ha expirado. Será redirigido al login.';
            setTimeout(() => {
              this.authService.cerrarSesion();
            }, 2000);
          } else {
            this.error = error.message || error || 'Error al procesar la solicitud';
          }
          
          console.error('❌ Error creando registro de gasto:', error);
        }
      });
  }

  /**
   * ✅ CORREGIDO: Resetear formulario
   */
  resetForm(): void {
    this.submitted = false;
    this.expenseForm.reset({
      // La fecha siempre se mantiene como hoy
      date: new Date().toISOString().split('T')[0],
      expenseType: '',
      amount: '',
      paymentMethod: '',
      receiptNumber: '',
      // Mantener el operador actual
      operator: this.currentOperator?.id || '',
      description: ''
    });
    
    // Deshabilitar nuevamente los campos que deben estar deshabilitados
    this.expenseForm.get('date')?.disable();
    this.expenseForm.get('operator')?.disable();
  }
  
  /**
   * Marcar todos los campos del formulario como tocados para mostrar errores
   */
  private markFormGroupTouched(): void {
    Object.keys(this.expenseForm.controls).forEach(key => {
      const control = this.expenseForm.get(key);
      // Solo marcar como tocados los campos que están habilitados
      if (control && !control.disabled) {
        control.markAsTouched();
      }
    });
  }
  
  /**
   * ✅ CORREGIDO: Verificar si un campo del formulario tiene errores
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.expenseForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted) && !field.disabled);
  }
  
  /**
   * ✅ CORREGIDO: Obtener mensaje de error para un campo específico
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

  // Agregar este método en el archivo .ts
trackByExpenseId(index: number, expense: ExpenseRecord): string {
  return expense.id?.toString() || index.toString();
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