import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { 
  EntregaAridosService, 
  EntregaAridoCreate,
  EntregaAridoOut,
  Project,
  MaterialType,
  Vehicle,
  Operator 
} from '../../../core/services/entrega-aridos.service';
import { AuthService } from '../../../core/services/auth.service';

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
  recentRecords: EntregaAridoOut[] = [];

  formattedCurrentDate: string = '';
  
  // Operador actual (obtenido de la sesión)
  currentOperator: Operator | null = null;
  
  currentDate = new Date();

  // Para cancelar suscripciones
  private destroy$ = new Subject<void>();
  
  constructor(
    private formBuilder: FormBuilder, 
    private entregaAridosService: EntregaAridosService,
    private authService: AuthService
  ) {
    this.initializeForm();
    this.setFormattedCurrentDate();
  }
  
  ngOnInit(): void {
    this.loadCurrentOperator();
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
      // La fecha se establece automáticamente como hoy y es readonly
      date: [{ value: new Date().toISOString().split('T')[0], disabled: true }],
      project: ['', Validators.required],
      materialType: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(0.1)]],
      // La unidad se establece por defecto como m³ y es readonly
      unit: [{ value: 'm³', disabled: true }],
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
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      // Crear objeto Operator basado en el usuario actual
      this.currentOperator = {
        id: Number(currentUser.id) || 999,
        nombre: currentUser.nombre,
        name: currentUser.nombre,
        email: currentUser.email,
        roles: Array.isArray(currentUser.roles) ? currentUser.roles.join(',') : currentUser.roles || 'operario',
        estado: true, // Por defecto activo
        status: 'active'
      };
      
      // Establecer el operador en el formulario
      this.aridosDeliveryForm.patchValue({
        operator: this.currentOperator.id
      });
      
      console.log('✅ Operador actual cargado:', this.currentOperator);
    } else {
      // Fallback a operador mock
      this.currentOperator = {
        id: 999,
        nombre: 'Operario Test',
        name: 'Operario Test',
        email: 'operario@test.com',
        roles: 'operario',
        estado: true,
        status: 'active'
      };
      
      this.aridosDeliveryForm.patchValue({
        operator: this.currentOperator.id
      });
      
      console.warn('⚠️ Usuario no encontrado, usando operador mock');
    }
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
        console.log('✅ Datos maestros cargados correctamente');
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
            console.log('✅ Registros recientes cargados:', this.recentRecords.length);
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

    if (!this.currentOperator) {
      this.error = 'No se pudo cargar la información del operador';
      return;
    }

    this.loading = true;
    
    const formValues = this.aridosDeliveryForm.value;
    
    // Crear objeto de entrega según las interfaces del backend
    const deliveryData: EntregaAridoCreate = {
      proyecto_id: parseInt(formValues.project),
      usuario_id: this.currentOperator.id,
      tipo_arido: formValues.materialType,
      cantidad: parseFloat(formValues.quantity),
      fecha_entrega: new Date().toISOString() // Fecha actual en formato ISO
    };

    console.log('📤 Enviando entrega de áridos:', deliveryData);

    this.entregaAridosService.createDelivery(deliveryData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.success = true;
            this.loadRecentRecords(); // Recargar la lista
            this.resetForm();
            
            console.log('✅ Entrega registrada exitosamente');
            
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
      // La unidad siempre es m³
      unit: 'm³',
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
  getProjectName(projectId: string | number): string {
    const project = this.projects.find(p => p.id.toString() === projectId.toString());
    return project ? project.nombre : 'Proyecto desconocido';
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
  getOperatorName(operatorId: string | number): string {
    // Si es el operador actual, usar su información
    if (this.currentOperator && operatorId.toString() === this.currentOperator.id.toString()) {
      return this.currentOperator.nombre;
    }
    // Si no, buscar en la lista (para registros históricos)
    const operator = this.operators.find(o => o.id.toString() === operatorId.toString());
    return operator ? operator.nombre : 'Operador desconocido';
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
    return this.projects.filter(project => project.estado === true);
  }
  
  /**
   * Obtener nombre del operador actual
   */
  get currentOperatorName(): string {
    return this.currentOperator?.nombre || 'No definido';
  }

  /**
   * TrackBy function for better performance in ngFor
   */
  trackByRecordId(index: number, record: EntregaAridoOut): string {
    return record.id?.toString() || index.toString();
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

  /**
   * Editar registro (placeholder)
   */
  editRecord(record: EntregaAridoOut): void {
    console.log('Editando registro:', record);
    // TODO: Implementar lógica de edición
  }

  /**
   * Eliminar registro
   */
  deleteRecord(record: EntregaAridoOut): void {
    if (record.id && confirm('¿Está seguro de que desea eliminar este registro?')) {
      this.loading = true;
      this.entregaAridosService.deleteDelivery(record.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.success = true;
              this.loadRecentRecords(); // Recargar la lista
              setTimeout(() => {
                this.success = false;
              }, 3000);
            } else {
              this.error = response.message || 'Error al eliminar el registro';
            }
            this.loading = false;
          },
          error: (error) => {
            this.error = error.message || 'Error al eliminar el registro';
            this.loading = false;
            console.error('Error eliminando registro:', error);
          }
        });
    }
  }

  /**
   * Obtener total de cantidad entregada hoy
   */
  getTotalQuantityToday(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.recentRecords
      .filter(record => record.date && record.date.split('T')[0] === today)
      .reduce((total, record) => total + record.quantity, 0);
  }

  /**
   * Obtener cantidad de proyectos activos
   */
  getActiveProjectsCount(): number {
    return this.activeProjects.length;
  }

  /**
   * Obtener cantidad de materiales únicos entregados
   */
  getUniqueMaterialsCount(): number {
    const uniqueMaterials = new Set(this.recentRecords.map(record => record.materialType));
    return uniqueMaterials.size;
  }

  /**
   * Obtener entregas del día actual
   */
  getTodayDeliveries(): EntregaAridoOut[] {
    const today = new Date().toISOString().split('T')[0];
    return this.recentRecords.filter(record => 
      record.date && record.date.split('T')[0] === today
    );
  }

  /**
   * Verificar si hay entregas hoy
   */
  hasTodayDeliveries(): boolean {
    return this.getTodayDeliveries().length > 0;
  }
}