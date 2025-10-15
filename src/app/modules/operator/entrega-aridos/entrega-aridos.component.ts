// src/app/modules/operator/entrega-aridos/entrega-aridos.component.ts - COMPLETO CON FILTROS

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms'; // ✅ AGREGADO
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
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    FormsModule, // ✅ AGREGADO
    HttpClientModule
  ],
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

  // ✅ NUEVO: Propiedades para filtros
  filters = {
    fechaDesde: '',
    fechaHasta: '',
    proyecto: '',
    tipoArido: '',
    cantidadMin: '',
    cantidadMax: ''
  };

  filteredRecords: EntregaAridoOut[] = [];
  showFilters = false;

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
    
    this.loadCurrentOperator();
    this.loadMasterData();
    this.setupMobileTable();
    
    // ✅ NUEVO: Inicializar filtros
    this.initializeFilters();
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
    if (!this.currentOperator) {
      console.warn('⚠️ No hay operador cargado todavía, esperando...');
      return;
    }

    console.log('📡 Cargando entregas del usuario:', this.currentOperator.id);

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
            
            this.loadRecentRecords();
            
            // ✅ NUEVO: Limpiar filtros si están activos
            if (this.filteredRecords.length > 0) {
              this.clearFilters();
            }
            
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
              
              // ✅ NUEVO: Limpiar filtros si están activos
              if (this.filteredRecords.length > 0) {
                this.clearFilters();
              }
              
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

  // ============ ✅ NUEVOS MÉTODOS PARA FILTROS ============

  /**
   * ✅ Inicializar filtros con fechas del mes actual
   */
  private initializeFilters(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.filters = {
      fechaDesde: firstDay.toISOString().split('T')[0],
      fechaHasta: today.toISOString().split('T')[0],
      proyecto: '',
      tipoArido: '',
      cantidadMin: '',
      cantidadMax: ''
    };
  }

 /**
 * ✅ Aplicar filtros - VERSIÓN CORREGIDA
 */
applyFilters(): void {
  console.log('🔍 Aplicando filtros:', this.filters);
  console.log('📋 Registros totales antes de filtrar:', this.recentRecords.length);
  
  let filtered = [...this.recentRecords];
  
  // Filtro por fecha desde
  if (this.filters.fechaDesde && this.filters.fechaDesde.trim() !== '') {
    console.log('📅 Filtrando por fecha desde:', this.filters.fechaDesde);
    filtered = filtered.filter(record => {
      const recordDate = new Date(record.date);
      const filterDate = new Date(this.filters.fechaDesde);
      const match = recordDate >= filterDate;
      if (!match) {
        console.log('❌ Descartado por fecha desde:', record.date);
      }
      return match;
    });
    console.log('📊 Registros después de filtro fecha desde:', filtered.length);
  }
  
  // Filtro por fecha hasta
  if (this.filters.fechaHasta && this.filters.fechaHasta.trim() !== '') {
    console.log('📅 Filtrando por fecha hasta:', this.filters.fechaHasta);
    filtered = filtered.filter(record => {
      const recordDate = new Date(record.date);
      const filterDate = new Date(this.filters.fechaHasta);
      // Agregar 23:59:59 a la fecha hasta para incluir todo el día
      filterDate.setHours(23, 59, 59, 999);
      const match = recordDate <= filterDate;
      if (!match) {
        console.log('❌ Descartado por fecha hasta:', record.date);
      }
      return match;
    });
    console.log('📊 Registros después de filtro fecha hasta:', filtered.length);
  }
  
  // Filtro por proyecto
  if (this.filters.proyecto && this.filters.proyecto.trim() !== '') {
    console.log('🏗️ Filtrando por proyecto:', this.filters.proyecto);
    filtered = filtered.filter(record => {
      const match = record.project.toString() === this.filters.proyecto;
      if (!match) {
        console.log('❌ Descartado por proyecto:', record.project);
      }
      return match;
    });
    console.log('📊 Registros después de filtro proyecto:', filtered.length);
  }
  
  // Filtro por tipo de árido
  if (this.filters.tipoArido && this.filters.tipoArido.trim() !== '') {
    console.log('🪨 Filtrando por tipo de árido:', this.filters.tipoArido);
    filtered = filtered.filter(record => {
      const match = record.materialType === this.filters.tipoArido;
      if (!match) {
        console.log('❌ Descartado por tipo árido:', record.materialType);
      }
      return match;
    });
    console.log('📊 Registros después de filtro tipo árido:', filtered.length);
  }
  
  // Filtro por cantidad mínima
  if (this.filters.cantidadMin && this.filters.cantidadMin.trim() !== '') {
    const min = parseFloat(this.filters.cantidadMin);
    if (!isNaN(min)) {
      console.log('📊 Filtrando por cantidad mínima:', min);
      filtered = filtered.filter(record => {
        const match = record.quantity >= min;
        if (!match) {
          console.log('❌ Descartado por cantidad mínima:', record.quantity);
        }
        return match;
      });
      console.log('📊 Registros después de filtro cantidad mínima:', filtered.length);
    }
  }
  
  // Filtro por cantidad máxima
  if (this.filters.cantidadMax && this.filters.cantidadMax.trim() !== '') {
    const max = parseFloat(this.filters.cantidadMax);
    if (!isNaN(max)) {
      console.log('📊 Filtrando por cantidad máxima:', max);
      filtered = filtered.filter(record => {
        const match = record.quantity <= max;
        if (!match) {
          console.log('❌ Descartado por cantidad máxima:', record.quantity);
        }
        return match;
      });
      console.log('📊 Registros después de filtro cantidad máxima:', filtered.length);
    }
  }
  
  this.filteredRecords = filtered;
  console.log('✅ Registros filtrados finales:', this.filteredRecords.length);
  console.log('📋 Datos filtrados:', this.filteredRecords);
  
  // ✅ NUEVO: Mostrar mensaje si no hay resultados
  if (this.filteredRecords.length === 0 && this.hasFiltersApplied()) {
    console.warn('⚠️ No se encontraron registros con los filtros aplicados');
  }
}

/**
 * ✅ NUEVO: Verificar si hay filtros aplicados
 */
private hasFiltersApplied(): boolean {
  return !!(
    this.filters.fechaDesde ||
    this.filters.fechaHasta ||
    this.filters.proyecto ||
    this.filters.tipoArido ||
    this.filters.cantidadMin ||
    this.filters.cantidadMax
  );
}

  /**
 * ✅ Limpiar filtros - MEJORADO
 */
clearFilters(): void {
  console.log('🧹 Limpiando filtros...');
  
  this.initializeFilters();
  this.filteredRecords = [];
  
  console.log('✅ Filtros limpiados');
  console.log('📋 Mostrando registros originales:', this.recentRecords.length);
}

  /**
   * ✅ Alternar visibilidad de filtros
   */
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  /**
   * ✅ Obtener registros a mostrar (filtrados o todos)
   */
  get recordsToDisplay(): EntregaAridoOut[] {
    return this.filteredRecords.length > 0 ? this.filteredRecords : this.recentRecords;
  }

  /**
   * ✅ Calcular total de cantidad filtrada
   */
  getTotalQuantityFiltered(): number {
    return this.recordsToDisplay.reduce((total, record) => total + record.quantity, 0);
  }

  /**
   * ✅ Calcular promedio de cantidad filtrada
   */
  getAverageQuantityFiltered(): number {
    if (this.recordsToDisplay.length === 0) return 0;
    return this.getTotalQuantityFiltered() / this.recordsToDisplay.length;
  }

  /**
   * ✅ Verificar si hay filtros activos
   */
  get hasActiveFilters(): boolean {
    return this.filteredRecords.length > 0;
  }

  /**
   * ✅ Contar filtros aplicados
   */
  getActiveFiltersCount(): number {
    let count = 0;
    if (this.filters.fechaDesde) count++;
    if (this.filters.fechaHasta) count++;
    if (this.filters.proyecto) count++;
    if (this.filters.tipoArido) count++;
    if (this.filters.cantidadMin) count++;
    if (this.filters.cantidadMax) count++;
    return count;
  }
}