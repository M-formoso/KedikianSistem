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
  vehicles: Vehicle[] = []; // Mantenemos para compatibilidad pero no se usa
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
  
  /**
   * Inicializar formulario SIN campo de vehículo
   */
  private initializeForm(): void {
    this.aridosDeliveryForm = this.formBuilder.group({
      date: [{ value: new Date().toISOString().split('T')[0], disabled: true }],
      project: ['', Validators.required],
      materialType: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(0.1)]],
      unit: [{ value: 'm³', disabled: true }],
      // ❌ CAMPO vehicleId ELIMINADO
      operator: [{ value: '', disabled: true }],
      notes: ['']
    });
  }
  
  setupMobileTable(): void {
    // Implementar lógica para tabla responsiva si es necesario
  }
  
  get f() { 
    return this.aridosDeliveryForm.controls; 
  }
  
  /**
   * Cargar operador actual desde el servicio de autenticación
   */
  loadCurrentOperator(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.currentOperator = {
        id: Number(currentUser.id) || 999,
        nombre: currentUser.nombre,
        name: currentUser.nombre,
        email: currentUser.email,
        roles: Array.isArray(currentUser.roles) ? currentUser.roles.join(',') : currentUser.roles || 'operario',
        estado: true,
        status: 'active'
      };
      
      this.aridosDeliveryForm.patchValue({
        operator: this.currentOperator.id
      });
      
      console.log('✅ Operador actual cargado:', this.currentOperator);
    } else {
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
   * Cargar datos maestros (sin vehículos)
   */
  loadMasterData(): void {
    this.loadingMasterData = true;
    this.error = '';
    
    // Solo cargamos proyectos, materiales y operadores
    forkJoin({
      projects: this.entregaAridosService.getProjects(),
      materialTypes: this.entregaAridosService.getMaterialTypes(),
      operators: this.entregaAridosService.getOperators()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (responses) => {
        if (responses.projects.success) {
          this.projects = responses.projects.data || [];
        }
        
        if (responses.materialTypes.success) {
          this.materialTypes = responses.materialTypes.data || [];
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
    if (!this.currentOperator) {
      console.warn('⚠️ No hay operador cargado');
      return;
    }

    console.log('📡 Cargando entregas del usuario:', this.currentOperator.id);

    // ✅ CRÍTICO: Pasar usuarioId al servicio
    this.entregaAridosService.getRecentDeliveries(10, this.currentOperator.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.recentRecords = response.data;
            console.log('✅ Registros recientes del usuario cargados:', this.recentRecords.length);
          }
        },
        error: (error) => {
          console.error('Error cargando registros recientes:', error);
        }
      });
  }
  /**
   * Enviar formulario SIN vehículo
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
    
    // Crear objeto de entrega SIN vehicleId
    const deliveryData: EntregaAridoCreate = {
      proyecto_id: parseInt(formValues.project),
      usuario_id: this.currentOperator.id,
      tipo_arido: formValues.materialType,
      cantidad: parseFloat(formValues.quantity),
      fecha_entrega: new Date().toISOString()
    };

    console.log('📤 Enviando entrega de áridos:', deliveryData);

    this.entregaAridosService.createDelivery(deliveryData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.success = true;
            this.loadRecentRecords();
            this.resetForm();
            
            console.log('✅ Entrega registrada exitosamente');
            
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
   * Resetear formulario SIN vehículo
   */
  resetForm(): void {
    this.submitted = false;
    this.aridosDeliveryForm.reset({
      date: new Date().toISOString().split('T')[0],
      project: '',
      materialType: '',
      quantity: '',
      unit: 'm³',
      // ❌ vehicleId eliminado
      operator: this.currentOperator?.id || '',
      notes: ''
    });
    
    this.aridosDeliveryForm.get('date')?.disable();
    this.aridosDeliveryForm.get('unit')?.disable();
    this.aridosDeliveryForm.get('operator')?.disable();
  }
  
  /**
   * Marcar todos los campos como tocados
   */
  private markFormGroupTouched(): void {
    Object.keys(this.aridosDeliveryForm.controls).forEach(key => {
      const control = this.aridosDeliveryForm.get(key);
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
    console.log('🔄 Refrescando registros del usuario:', this.currentOperator?.id);
    this.loadRecentRecords();
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
   * Obtener nombre del vehículo por ID (mantenido para registros históricos)
   */
  getVehicleName(vehicleId: string): string {
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    return vehicle ? vehicle.name : 'N/A';
  }
  
  /**
   * Obtener nombre del operador por ID
   */
  getOperatorName(operatorId: string | number): string {
    if (this.currentOperator && operatorId.toString() === this.currentOperator.id.toString()) {
      return this.currentOperator.nombre;
    }
    const operator = this.operators.find(o => o.id.toString() === operatorId.toString());
    return operator ? operator.nombre : 'Operador desconocido';
  }
  
  /**
   * Verificar si un campo tiene errores
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.aridosDeliveryForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted) && !field.disabled);
  }
  
  /**
   * Obtener mensaje de error para un campo
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
    }
    
    return '';
  }
  
  /**
   * Obtener etiqueta del campo
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'project': 'El proyecto',
      'materialType': 'El tipo de material',
      'quantity': 'La cantidad'
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
   * Filtrar proyectos activos
   */
  get activeProjects(): Project[] {
    return this.projects.filter(project => project.estado === true);
  }
  
  /**
   * Nombre del operador actual
   */
  get currentOperatorName(): string {
    return this.currentOperator?.nombre || 'No definido';
  }

  /**
   * TrackBy para optimización
   */
  trackByRecordId(index: number, record: EntregaAridoOut): string {
    return record.id?.toString() || index.toString();
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

  /**
   * Editar registro
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
              this.loadRecentRecords();
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
   * Total de cantidad entregada hoy
   */
  getTotalQuantityToday(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.recentRecords
      .filter(record => record.date && record.date.split('T')[0] === today)
      .reduce((total, record) => total + record.quantity, 0);
  }

  /**
   * Cantidad de proyectos activos
   */
  getActiveProjectsCount(): number {
    return this.activeProjects.length;
  }

  /**
   * Cantidad de materiales únicos
   */
  getUniqueMaterialsCount(): number {
    const uniqueMaterials = new Set(this.recentRecords.map(record => record.materialType));
    return uniqueMaterials.size;
  }

  /**
   * Entregas del día actual
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