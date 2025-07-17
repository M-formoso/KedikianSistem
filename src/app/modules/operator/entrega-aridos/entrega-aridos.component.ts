import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { 
  EntregaAridosService, 
  AridosDeliveryRequest,
  AridosDelivery,
  Project,
  MaterialType,
  Vehicle,
  Operator 
} from '../../../core/services/entrega-aridos.service';

@Component({
  selector: 'app-entrega-aridos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './entrega-aridos.component.html',
  styleUrls: ['./entrega-aridos.component.css']
})
export class EntregaAridosComponent implements OnInit, OnDestroy {
  // Formulario
  aridosDeliveryForm!: FormGroup;
  
  // Estados del componente
  submitted = false;
  success = false;
  error = '';
  loading = false;
  loadingMasterData = false;
  
  // Datos maestros desde el backend
  projects: Project[] = [];
  materialTypes: MaterialType[] = [];
  vehicles: Vehicle[] = [];
  operators: Operator[] = [];
  
  // Registros recientes
  recentRecords: AridosDelivery[] = [];

  formattedCurrentDate: string = '';
  
  // Operador actual (obtenido de la sesión)
  currentOperator: Operator | null = null;
  
  currentDate = new Date();

  // Para cancelar suscripciones
  private destroy$ = new Subject<void>();
  
  constructor(
    private formBuilder: FormBuilder, 
    private entregaAridosService: EntregaAridosService
  ) {
    this.initializeForm();
    this.setFormattedCurrentDate(); // ⬇️ AGREGAR ESTA LÍNEA AQUÍ
  }
  
  ngOnInit(): void {
    this.loadMasterData();
    this.loadRecentRecords();
    this.loadCurrentOperator();
    this.setupMobileTable();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private initializeForm(): void {
    this.aridosDeliveryForm = this.formBuilder.group({
      // La fecha se establece automáticamente como hoy y es readonly
      date: [{ value: new Date().toISOString().split('T')[0], disabled: true }],
      project: ['', Validators.required],
      materialType: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(0.1)]],
      // La unidad se establece por defecto como m3 y es readonly
      unit: [{ value: 'm3', disabled: true }],
      vehicleId: ['', Validators.required],
      // El operador se carga automáticamente desde la sesión
      operator: [{ value: '', disabled: true }],
      notes: ['']
    });
  }
  
  // Configuración para la tabla responsiva en móviles
  setupMobileTable(): void {
    // Implementar lógica para tabla responsiva si es necesario
  }
  
  // Getter para acceder más fácilmente a los campos del formulario
  get f() { 
    return this.aridosDeliveryForm.controls; 
  }
  
  /**
   * Cargar operador actual desde el servicio de autenticación
   */
  loadCurrentOperator(): void {
    // CÓDIGO COMENTADO TEMPORALMENTE
    /*
    // Aquí deberías obtener el operador desde tu servicio de autenticación
    // Por ejemplo: this.authService.getCurrentOperator()
    this.entregaAridosService.getCurrentOperator()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.currentOperator = response.data;
            // Establecer el operador en el formulario
            this.aridosDeliveryForm.patchValue({
              operator: this.currentOperator.id
            });
          }
        },
        error: (error) => {
          console.error('Error cargando operador actual:', error);
          this.error = 'Error al cargar información del operador';
        }
      });
    */
  }
  
  /**
   * Cargar todos los datos maestros necesarios para el formulario
   */
  loadMasterData(): void {
    this.loadingMasterData = true;
    this.error = '';
    
    // Cargar solo los datos maestros necesarios (sin operadores ya que se carga automáticamente)
    forkJoin({
      projects: this.entregaAridosService.getProjects(),
      materialTypes: this.entregaAridosService.getMaterialTypes(),
      vehicles: this.entregaAridosService.getVehicles()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (responses) => {
        // Verificar que todas las respuestas sean exitosas
        if (responses.projects.success) {
          this.projects = responses.projects.data || [];
        }
        
        if (responses.materialTypes.success) {
          this.materialTypes = responses.materialTypes.data || [];
        }
        
        if (responses.vehicles.success) {
          this.vehicles = responses.vehicles.data || [];
        }
        
        this.loadingMasterData = false;
      },
      error: (error) => {
        this.error = `Error al cargar datos: ${error.message}`;
        this.loadingMasterData = false;
        console.error('Error cargando datos maestros:', error);
      }
    });
  }
  
  /**
   * Cargar registros recientes de entregas
   */
  loadRecentRecords(): void {
    this.entregaAridosService.getRecentDeliveries(10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.recentRecords = response.data;
          }
        },
        error: (error) => {
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
    
    if (this.aridosDeliveryForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    
    const deliveryData: AridosDeliveryRequest = {
      // Usar la fecha actual ya que es fija
      date: new Date().toISOString().split('T')[0],
      project: this.aridosDeliveryForm.value.project,
      materialType: this.aridosDeliveryForm.value.materialType,
      quantity: parseFloat(this.aridosDeliveryForm.value.quantity),
      // La unidad siempre será m3
      unit: 'm3',
      vehicleId: this.aridosDeliveryForm.value.vehicleId,
      // Usar el operador actual
      operator: this.currentOperator?.id || '',
      notes: this.aridosDeliveryForm.value.notes || ''
    };

    this.entregaAridosService.createDelivery(deliveryData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.success = true;
            this.loadRecentRecords(); // Recargar la lista
            this.resetForm();
            
            // Ocultar mensaje de éxito después de 5 segundos
            setTimeout(() => {
              this.success = false;
            }, 5000);
          } else {
            this.error = response.message || 'Error al crear la entrega';
          }
        },
        error: (error) => {
          this.loading = false;
          this.error = error.message || 'Error al procesar la solicitud';
          console.error('Error creando entrega:', error);
        }
      });
  }

  /**
   * Resetear formulario
   */
  resetForm(): void {
    this.submitted = false;
    this.aridosDeliveryForm.reset({
      // La fecha siempre se mantiene como hoy
      date: new Date().toISOString().split('T')[0],
      project: '',
      materialType: '',
      quantity: '',
      // La unidad siempre es m3
      unit: 'm3',
      vehicleId: '',
      // Mantener el operador actual
      operator: this.currentOperator?.id || '',
      notes: ''
    });
    
    // Deshabilitar nuevamente los campos que deben estar deshabilitados
    this.aridosDeliveryForm.get('date')?.disable();
    this.aridosDeliveryForm.get('unit')?.disable();
    this.aridosDeliveryForm.get('operator')?.disable();
  }
  
  /**
   * Marcar todos los campos del formulario como tocados para mostrar errores
   */
  private markFormGroupTouched(): void {
    Object.keys(this.aridosDeliveryForm.controls).forEach(key => {
      const control = this.aridosDeliveryForm.get(key);
      // Solo marcar como tocados los campos que están habilitados
      if (control && !control.disabled) {
        control.markAsTouched();
      }
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
  refreshRecentRecords(): void {
    this.loadRecentRecords();
  }
  
  /**
   * Validar disponibilidad de vehículo
   */
  validateVehicleAvailability(): void {
    const vehicleId = this.aridosDeliveryForm.get('vehicleId')?.value;
    // Usar siempre la fecha actual
    const date = new Date().toISOString().split('T')[0];
    
    if (vehicleId && date) {
      this.entregaAridosService.validateVehicleAvailability(vehicleId, date)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (!response.success || !response.data) {
              this.aridosDeliveryForm.get('vehicleId')?.setErrors({ 'unavailable': true });
            }
          },
          error: (error) => {
            console.error('Error validando disponibilidad de vehículo:', error);
          }
        });
    }
  }
  
  // ============ MÉTODOS DE UTILIDAD PARA LA VISTA ============
  
  /**
   * Obtener nombre del proyecto por ID
   */
  getProjectName(projectId: string): string {
    const project = this.projects.find(p => p.id === projectId);
    return project ? project.name : 'Proyecto desconocido';
  }
  
  /**
   * Obtener nombre del material por ID
   */
  getMaterialName(materialId: string): string {
    const material = this.materialTypes.find(m => m.id === materialId);
    return material ? material.name : 'Material desconocido';
  }
  
  /**
   * Obtener nombre del vehículo por ID
   */
  getVehicleName(vehicleId: string): string {
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    return vehicle ? vehicle.name : 'Vehículo desconocido';
  }
  
  /**
   * Obtener nombre del operador por ID
   */
  getOperatorName(operatorId: string): string {
    // Si es el operador actual, usar su información
    if (this.currentOperator && operatorId === this.currentOperator.id) {
      return this.currentOperator.name;
    }
    // Si no, buscar en la lista (para registros históricos)
    const operator = this.operators.find(o => o.id === operatorId);
    return operator ? operator.name : 'Operador desconocido';
  }
  
  /**
   * Obtener capacidad del vehículo por ID
   */
  getVehicleCapacity(vehicleId: string): string {
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    return vehicle?.capacity || '';
  }
  
  /**
   * Verificar si un campo del formulario tiene errores
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.aridosDeliveryForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted) && !field.disabled);
  }
  
  /**
   * Obtener mensaje de error para un campo específico
   */
  getFieldError(fieldName: string): string {
    const field = this.aridosDeliveryForm.get(fieldName);
    
    if (field?.errors) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} es requerido`;
      }
      if (field.errors['min']) {
        return `${this.getFieldLabel(fieldName)} debe ser mayor a ${field.errors['min'].min}`;
      }
      if (field.errors['unavailable']) {
        return `${this.getFieldLabel(fieldName)} no está disponible para la fecha seleccionada`;
      }
    }
    
    return '';
  }
  
  /**
   * Obtener etiqueta del campo para mensajes de error
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'project': 'El proyecto',
      'materialType': 'El tipo de material',
      'quantity': 'La cantidad',
      'vehicleId': 'El vehículo'
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
   * Manejar cambio de vehículo
   */
  onVehicleChange(): void {
    this.validateVehicleAvailability();
  }
  
  /**
   * Filtrar vehículos por estado activo
   */
  get activeVehicles(): Vehicle[] {
    return this.vehicles.filter(vehicle => vehicle.status !== 'inactive');
  }
  
  /**
   * Filtrar proyectos por estado activo
   */
  get activeProjects(): Project[] {
    return this.projects.filter(project => project.status !== 'inactive');
  }
  
  /**
   * Obtener nombre del operador actual
   */
  get currentOperatorName(): string {
    return this.currentOperator?.name || 'No definido';
  }

  /**
 * TrackBy function for better performance in ngFor
 */
  trackByRecordId(index: number, record: AridosDelivery): string {
    return record.id?.toString() || index.toString();
  }
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