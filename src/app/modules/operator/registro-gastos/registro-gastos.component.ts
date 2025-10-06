// src/app/modules/operator/registro-gastos/registro-gastos.component.ts - SIMPLIFICADO

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../environments/environment';
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
  
  // Datos maestros (mantenemos para compatibilidad)
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

  get f() { 
    return this.expenseForm.controls; 
  }

  /**
   * Inicializar formulario simplificado (sin método de pago ni número de recibo)
   */
  private initializeForm(): void {
    this.expenseForm = this.formBuilder.group({
      date: [{ value: new Date().toISOString().split('T')[0], disabled: true }],
      expenseType: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      operator: [{ value: '', disabled: true }],
      description: ['']
    });
  }
  
  /**
   * Cargar operador actual desde el servicio de autenticación
   */
  private loadCurrentOperator(): void {
    const currentUser = this.authService.getCurrentUser();
    console.log('🔍 Usuario obtenido del AuthService:', currentUser);
    
    if (currentUser && currentUser.id) {
      const userId = typeof currentUser.id === 'string' 
        ? parseInt(currentUser.id, 10) 
        : Number(currentUser.id);

      if (isNaN(userId)) {
        console.error('❌ ID de usuario inválido:', currentUser.id);
        this.error = 'Error: ID de usuario inválido. Inicie sesión nuevamente.';
        return;
      }

      this.currentOperator = {
        id: userId.toString(),
        name: currentUser.nombre || 'Usuario Test',
        position: Array.isArray(currentUser.roles) ? currentUser.roles.join(',') : (currentUser.roles || 'operario'),
        isActive: true
      };
      
      this.expenseForm.patchValue({
        operator: this.currentOperator.id
      });
      
      console.log('✅ Operador actual cargado:', this.currentOperator);
    } else {
      console.error('❌ No se encontró usuario autenticado');
      this.error = 'No se pudo cargar la información del usuario. Inicie sesión nuevamente.';
      
      setTimeout(() => {
        this.authService.cerrarSesion();
      }, 2000);
    }
  }

  setupMobileTable(): void {
    // Implementar lógica para tabla responsiva si es necesario
  }
  
  /**
   * Cargar datos maestros (simplificado - solo operadores)
   */
  loadMasterData(): void {
    this.loadingMasterData = true;
    this.error = '';
    
    this.expenseService.getOperators()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.success) {
            this.operators = response.data || [];
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
        }
      });
  }
  
  /**
   * Enviar formulario (sin método de pago ni número de recibo)
   */
  onSubmit(): void {
    this.submitted = true;
    this.success = false;
    this.error = '';
    
    console.group('🚀 REGISTRO DE GASTO');
    console.log('📋 Estado del formulario:', {
      valid: this.expenseForm.valid,
      invalid: this.expenseForm.invalid,
      values: this.expenseForm.value,
      errors: this.expenseForm.errors
    });
  
    if (this.expenseForm.invalid) {
      this.markFormGroupTouched();
      console.log('❌ Formulario inválido, errores por campo:');
      Object.keys(this.expenseForm.controls).forEach(key => {
        const control = this.expenseForm.get(key);
        if (control && control.errors) {
          console.log(`   ${key}:`, control.errors);
        }
      });
      console.groupEnd();
      return;
    }
  
    if (!this.currentOperator) {
      this.error = 'No se pudo cargar la información del operador';
      console.error('❌ No hay operador actual');
      console.groupEnd();
      return;
    }
  
    console.log('👤 Operador actual:', this.currentOperator);
    
    this.loading = true;
    const formValues = this.expenseForm.value;
    
    // Datos simplificados - sin método de pago ni número de recibo
    const expenseData: ExpenseRequest = {
      date: new Date().toISOString().split('T')[0],
      expenseType: formValues.expenseType,
      amount: parseFloat(formValues.amount),
      operator: this.currentOperator.id,
      paymentMethod: '', // Vacío - no se usa
      receiptNumber: '', // Vacío - no se usa
      description: formValues.description || ''
    };
  
    console.log('📤 Datos a enviar:', expenseData);
    console.log('🔗 API URL:', environment.apiUrl);
    console.groupEnd();
  
    this.expenseService.createExpense(expenseData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          console.group('✅ RESPUESTA EXITOSA');
          console.log('📥 Respuesta completa:', response);
          console.groupEnd();
          
          if (response && response.success) {
            this.success = true;
            this.loadRecentExpenses();
            this.resetForm();
            
            setTimeout(() => {
              this.success = false;
            }, 5000);
          } else {
            this.error = response?.message || 'Error al crear el registro';
          }
        },
        error: (error: any) => {
          this.loading = false;
          console.group('❌ ERROR EN PETICIÓN');
          console.error('Error completo:', error);
          console.error('Status:', error.status);
          console.error('Error body:', error.error);
          console.error('Message:', error.message);
          console.groupEnd();
          
          this.error = error.message || 'Error al procesar la solicitud';
        }
      });
  }

  /**
   * Resetear formulario simplificado
   */
  resetForm(): void {
    this.submitted = false;
    this.expenseForm.reset({
      date: new Date().toISOString().split('T')[0],
      expenseType: '',
      amount: '',
      operator: this.currentOperator?.id || '',
      description: ''
    });
    
    this.expenseForm.get('date')?.disable();
    this.expenseForm.get('operator')?.disable();
  }
  
  /**
   * Marcar todos los campos como tocados
   */
  private markFormGroupTouched(): void {
    Object.keys(this.expenseForm.controls).forEach(key => {
      const control = this.expenseForm.get(key);
      if (control && !control.disabled) {
        control.markAsTouched();
      }
    });
  }
  
  /**
   * Verificar si un campo tiene errores
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.expenseForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted) && !field.disabled);
  }
  
  /**
   * Obtener mensaje de error para un campo
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
    }
    
    return '';
  }
  
  /**
   * Obtener etiqueta del campo
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'date': 'La fecha',
      'expenseType': 'El tipo de gasto',
      'amount': 'El monto',
      'operator': 'El operador',
      'description': 'La descripción'
    };
    
    return labels[fieldName] || fieldName;
  }
  
  /**
   * Estado de carga general
   */
  get isLoading(): boolean {
    return this.loading || this.loadingMasterData;
  }
  
  /**
   * Refrescar registros recientes
   */
  refreshRecentExpenses(): void {
    this.loadRecentExpenses();
  }
  
  // ============ MÉTODOS DE UTILIDAD PARA LA VISTA ============
  
  /**
   * Obtener etiqueta legible del tipo de gasto
   */
  getExpenseTypeLabel(type: string): string {
    const types: { [key: string]: string } = {
      'combustible': 'Combustible',
      'otro': 'Otro'
    };
    return types[type] || type || 'No especificado';
  }

  /**
   * TrackBy para optimizar renderización
   */
  trackByExpenseId(index: number, expense: ExpenseRecord): string {
    return expense.id?.toString() || index.toString();
  }
  
  /**
   * Formatear monto
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
   * Filtrar operadores activos
   */
  get activeOperators(): Operator[] {
    return this.operators.filter(operator => operator.isActive !== false);
  }

  /**
   * Establecer fecha formateada
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