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
  
  // Para cancelar suscripciones
  private destroy$ = new Subject<void>();
  
  constructor(
    private formBuilder: FormBuilder, 
    private entregaAridosService: EntregaAridosService
  ) {
    this.initializeForm();
  }
  
  ngOnInit(): void {
    this.loadMasterData();
    this.loadRecentRecords();
    this.setupMobileTable();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private initializeForm(): void {
    this.aridosDeliveryForm = this.formBuilder.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      project: ['', Validators.required],
      materialType: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(0.1)]],
      unit: ['m3', Validators.required],
      vehicleId: ['', Validators.required],
      operator: ['', Validators.required],
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
   * Cargar todos los datos maestros necesarios para el formulario
   */
  loadMasterData(): void {
    this.loadingMasterData = true;
    this.error = '';
    
    // Cargar todos los datos maestros en paralelo
    forkJoin({
      projects: this.entregaAridosService.getProjects(),
      materialTypes: this.entregaAridosService.getMaterialTypes(),
      vehicles: this.entregaAridosService.getVehicles(),
      operators: this.entregaAridosService.getOperators()
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
        
        if (responses.operators.success) {
          this.operators = responses.operators.data || [];
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
      date: this.aridosDeliveryForm.value.date,
      project: this.aridosDeliveryForm.value.project,
      materialType: this.aridosDeliveryForm.value.materialType,
      quantity: parseFloat(this.aridosDeliveryForm.value.quantity),
      unit: this.aridosDeliveryForm.value.unit,
      vehicleId: this.aridosDeliveryForm.value.vehicleId,
      operator: this.aridosDeliveryForm.value.operator,
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
      date: new Date().toISOString().split('T')[0],
      project: '',
      materialType: '',
      quantity: '',
      unit: 'm3',
      vehicleId: '',
      operator: '',
      notes: ''
    });
  }
  
  /**
   * Marcar todos los campos del formulario como tocados para mostrar errores
   */
  private markFormGroupTouched(): void {
    Object.keys(this.aridosDeliveryForm.controls).forEach(key => {
      const control = this.aridosDeliveryForm.get(key);
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
  refreshRecentRecords(): void {
    this.loadRecentRecords();
  }
  
  /**
   * Validar disponibilidad de vehículo
   */
  validateVehicleAvailability(): void {
    const vehicleId = this.aridosDeliveryForm.get('vehicleId')?.value;
    const date = this.aridosDeliveryForm.get('date')?.value;
    
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
  
  /**
   * Validar disponibilidad de operador
   */
  validateOperatorAvailability(): void {
    const operatorId = this.aridosDeliveryForm.get('operator')?.value;
    const date = this.aridosDeliveryForm.get('date')?.value;
    
    if (operatorId && date) {
      this.entregaAridosService.validateOperatorAvailability(operatorId, date)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (!response.success || !response.data) {
              this.aridosDeliveryForm.get('operator')?.setErrors({ 'unavailable': true });
            }
          },
          error: (error) => {
            console.error('Error validando disponibilidad de operador:', error);
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
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
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
      'date': 'La fecha',
      'project': 'El proyecto',
      'materialType': 'El tipo de material',
      'quantity': 'La cantidad',
      'unit': 'La unidad',
      'vehicleId': 'El vehículo',
      'operator': 'El operador'
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
   * Manejar cambio de operador
   */
  onOperatorChange(): void {
    this.validateOperatorAvailability();
  }
  
  /**
   * Manejar cambio de fecha
   */
  onDateChange(): void {
    // Revalidar disponibilidad cuando cambia la fecha
    this.validateVehicleAvailability();
    this.validateOperatorAvailability();
  }
  
  /**
   * Filtrar vehículos por estado activo
   */
  get activeVehicles(): Vehicle[] {
    return this.vehicles.filter(vehicle => vehicle.status !== 'inactive');
  }
  
  /**
   * Filtrar operadores por estado activo
   */
  get activeOperators(): Operator[] {
    return this.operators.filter(operator => operator.status !== 'inactive');
  }
  
  /**
   * Filtrar proyectos por estado activo
   */
  get activeProjects(): Project[] {
    return this.projects.filter(project => project.status !== 'inactive');
  }
}