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
  aridosDeliveryForm!: FormGroup;
  
  submitted = false;
  success = false;
  error = '';
  loading = false;
  loadingMasterData = false;
  
  projects: Project[] = [];
  materialTypes: MaterialType[] = [];
  vehicles: Vehicle[] = [];
  operators: Operator[] = [];
  
  recentRecords: EntregaAridoOut[] = [];
  formattedCurrentDate: string = '';
  currentOperator: Operator | null = null;
  currentDate = new Date();

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
    console.log('🚀 Iniciando componente EntregaAridos');
    
    // ✅ ORDEN CRÍTICO: Primero cargar operador, luego todo lo demás
    this.loadCurrentOperator();
    this.loadMasterData();
    
    // ✅ NO llamar loadRecentRecords aquí, se llama después de cargar operador
    
    this.setupMobileTable();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private initializeForm(): void {
    this.aridosDeliveryForm = this.formBuilder.group({
      date: [{ value: new Date().toISOString().split('T')[0], disabled: true }],
      project: ['', Validators.required],
      materialType: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(0.1)]],
      unit: [{ value: 'm³', disabled: true }],
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
   * ✅ CRÍTICO: Cargar operador Y LUEGO cargar registros
   */
  loadCurrentOperator(): void {
    console.log('👤 Cargando operador actual...');
    
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
      
      // ✅ AHORA SÍ cargar registros, después de tener el operador
      this.loadRecentRecords();
      
    } else {
      console.error('❌ No se encontró usuario');
      this.error = 'No se pudo cargar la información del usuario';
      this.currentOperator = null;
    }
  }
  
  loadMasterData(): void {
    this.loadingMasterData = true;
    this.error = '';
    
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
        console.error('❌ Error cargando datos maestros:', error);
      }
    });
  }
  
  /**
   * ✅ CRÍTICO: Solo cargar si hay operador
   */
  loadRecentRecords(): void {
    // ✅ Validación CRÍTICA
    if (!this.currentOperator) {
      console.warn('⚠️ No hay operador cargado todavía, esperando...');
      return;
    }

    console.log('📡 Cargando entregas del usuario:', this.currentOperator.id);

    // ✅ SIEMPRE pasar el usuarioId
    this.entregaAridosService.getRecentDeliveries(10, this.currentOperator.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('📥 Respuesta de entregas recientes:', response);
          
          if (response.success && response.data) {
            this.recentRecords = response.data;
            console.log('✅ Registros del usuario cargados:', this.recentRecords.length);
          } else {
            this.recentRecords = [];
            console.log('ℹ️ No hay registros para este usuario');
          }
        },
        error: (error) => {
          console.error('❌ Error cargando registros recientes:', error);
          this.recentRecords = [];
        }
      });
  }
  
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
            
            // ✅ Recargar registros después de crear
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
          console.error('❌ Error creando entrega:', error);
        }
      });
  }

  resetForm(): void {
    this.submitted = false;
    this.aridosDeliveryForm.reset({
      date: new Date().toISOString().split('T')[0],
      project: '',
      materialType: '',
      quantity: '',
      unit: 'm³',
      operator: this.currentOperator?.id || '',
      notes: ''
    });
    
    this.aridosDeliveryForm.get('date')?.disable();
    this.aridosDeliveryForm.get('unit')?.disable();
    this.aridosDeliveryForm.get('operator')?.disable();
  }
  
  private markFormGroupTouched(): void {
    Object.keys(this.aridosDeliveryForm.controls).forEach(key => {
      const control = this.aridosDeliveryForm.get(key);
      if (control && !control.disabled) {
        control.markAsTouched();
      }
    });
  }
  
  refreshMasterData(): void {
    this.loadMasterData();
  }
  
  /**
   * ✅ CRÍTICO: Validar operador antes de refrescar
   */
  refreshRecentRecords(): void {
    if (!this.currentOperator) {
      console.warn('⚠️ No se puede refrescar sin operador cargado');
      this.error = 'Operador no disponible';
      return;
    }
    
    console.log('🔄 Refrescando registros del usuario:', this.currentOperator.id);
    this.loadRecentRecords();
  }
  
  // ============ MÉTODOS DE UTILIDAD PARA LA VISTA ============
  
  getProjectName(projectId: string | number): string {
    const project = this.projects.find(p => p.id.toString() === projectId.toString());
    return project ? project.nombre : 'Proyecto desconocido';
  }
  
  getMaterialName(materialId: string): string {
    const material = this.materialTypes.find(m => m.id === materialId);
    return material ? material.name : 'Material desconocido';
  }
  
  getVehicleName(vehicleId: string): string {
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    return vehicle ? vehicle.name : 'N/A';
  }
  
  getOperatorName(operatorId: string | number): string {
    if (this.currentOperator && operatorId.toString() === this.currentOperator.id.toString()) {
      return this.currentOperator.nombre;
    }
    const operator = this.operators.find(o => o.id.toString() === operatorId.toString());
    return operator ? operator.nombre : 'Operador desconocido';
  }
  
  hasFieldError(fieldName: string): boolean {
    const field = this.aridosDeliveryForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted) && !field.disabled);
  }
  
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
  
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'project': 'El proyecto',
      'materialType': 'El tipo de material',
      'quantity': 'La cantidad'
    };
    
    return labels[fieldName] || fieldName;
  }
  
  get isLoading(): boolean {
    return this.loading || this.loadingMasterData;
  }
  
  get activeProjects(): Project[] {
    return this.projects.filter(project => project.estado === true);
  }
  
  get currentOperatorName(): string {
    return this.currentOperator?.nombre || 'No definido';
  }

  trackByRecordId(index: number, record: EntregaAridoOut): string {
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

  editRecord(record: EntregaAridoOut): void {
    console.log('Editando registro:', record);
    // TODO: Implementar lógica de edición
  }

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

  getTotalQuantityToday(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.recentRecords
      .filter(record => record.date && record.date.split('T')[0] === today)
      .reduce((total, record) => total + record.quantity, 0);
  }

  getActiveProjectsCount(): number {
    return this.activeProjects.length;
  }

  getUniqueMaterialsCount(): number {
    const uniqueMaterials = new Set(this.recentRecords.map(record => record.materialType));
    return uniqueMaterials.size;
  }

  getTodayDeliveries(): EntregaAridoOut[] {
    const today = new Date().toISOString().split('T')[0];
    return this.recentRecords.filter(record => 
      record.date && record.date.split('T')[0] === today
    );
  }

  hasTodayDeliveries(): boolean {
    return this.getTodayDeliveries().length > 0;
  }
}