import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule,AbstractControl,ValidationErrors } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { 
  MachineHoursService,
  MachineHoursRequest,
  MachineHours,
  Project,
  MachineType,
  Machine,
  Operator
} from '../../../core/services/machine-hours.service';


@Component({
  selector: 'app-machine-hours',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './machine-hours.component.html',
  styleUrls: ['./machine-hours.component.css']
})
export class MachineHoursComponent implements OnInit, OnDestroy {
  // Formulario
  machineHoursForm!: FormGroup;
  
  // Estados del componente
  submitted = false;
  success = false;
  error = '';
  loading = false;
  loadingMasterData = false;
  
  // Datos maestros desde el backend
  projects: Project[] = [];
  machineTypes: MachineType[] = [];
  machines: Machine[] = [];
  operators: Operator[] = [];
  
  // Registros recientes
  recentRecords: MachineHours[] = [];
  
  // Para cancelar suscripciones
  private destroy$ = new Subject<void>();
  
  constructor(
    private formBuilder: FormBuilder,
    private machineHoursService: MachineHoursService
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

  private hourSequenceValidator(control: AbstractControl): ValidationErrors | null {
    const formGroup = control as FormGroup;
    const startHour = formGroup.get('startHour')?.value;
    const endHour = formGroup.get('endHour')?.value;
    
    if (startHour && endHour && parseFloat(endHour) <= parseFloat(startHour)) {
      return { hourSequence: true };
    }
    
    return null;
  }
  
  private initializeForm(): void {
    this.machineHoursForm = this.formBuilder.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      project: ['', Validators.required],
      machineType: ['', Validators.required],
      machineId: ['', Validators.required],
      operator: ['', Validators.required],
      startHour: ['', [Validators.required, Validators.min(0)]],
      endHour: ['', [Validators.required, Validators.min(0)]],
      fuelUsed: [0, [Validators.min(0)]],
      notes: ['']
    });
    
    // Agregar validación personalizada para horas
    this.machineHoursForm.addValidators(this.hourSequenceValidator.bind(this));
  }
  
  // Configuración para la tabla responsiva en móviles
  setupMobileTable(): void {
    // Implementar lógica para tabla responsiva si es necesario
  }
  
  // Getter para acceder más fácilmente a los campos del formulario
  get f() { 
    return this.machineHoursForm.controls; 
  }
  
  /**
   * Cargar todos los datos maestros necesarios para el formulario
   */
  loadMasterData(): void {
    this.loadingMasterData = true;
    this.error = '';
    
    // Cargar todos los datos maestros en paralelo
    forkJoin({
      projects: this.machineHoursService.getProjects(),
      machineTypes: this.machineHoursService.getMachineTypes(),
      machines: this.machineHoursService.getMachines(),
      operators: this.machineHoursService.getOperators()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (responses) => {
        // Verificar que todas las respuestas sean exitosas
        if (responses.projects.success) {
          this.projects = responses.projects.data || [];
        }
        
        if (responses.machineTypes.success) {
          this.machineTypes = responses.machineTypes.data || [];
        }
        
        if (responses.machines.success) {
          this.machines = responses.machines.data || [];
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
   * Cargar registros recientes de horas de máquina
   */
  loadRecentRecords(): void {
    this.machineHoursService.getRecentMachineHours(10)
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
    
    if (this.machineHoursForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    
    const formValues = this.machineHoursForm.value;
    const machineHoursData: MachineHoursRequest = {
      date: formValues.date,
      machineType: formValues.machineType,
      machineId: formValues.machineId,
      startHour: parseFloat(formValues.startHour),
      endHour: parseFloat(formValues.endHour),
      project: formValues.project,
      operator: formValues.operator,
      fuelUsed: parseFloat(formValues.fuelUsed) || 0,
      notes: formValues.notes || ''
    };

    this.machineHoursService.createMachineHours(machineHoursData)
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
            this.error = response.message || 'Error al crear el registro de horas';
          }
        },
        error: (error) => {
          this.loading = false;
          this.error = error.message || 'Error al procesar la solicitud';
          console.error('Error creando registro de horas:', error);
        }
      });
  }

  /**
   * Resetear formulario
   */
  resetForm(): void {
    this.submitted = false;
    this.machineHoursForm.reset({
      date: new Date().toISOString().split('T')[0],
      project: '',
      machineType: '',
      machineId: '',
      operator: '',
      startHour: '',
      endHour: '',
      fuelUsed: 0,
      notes: ''
    });
  }
  
  /**
   * Marcar todos los campos del formulario como tocados para mostrar errores
   */
  private markFormGroupTouched(): void {
    Object.keys(this.machineHoursForm.controls).forEach(key => {
      const control = this.machineHoursForm.get(key);
      control?.markAsTouched();
    });
  }
  
  /**
   * Validador personalizado para secuencia de horas
   */
  private hourSequenceValidator(group: FormGroup): {[key: string]: any} | null {
    const startHour = group.get('startHour')?.value;
    const endHour = group.get('endHour')?.value;
    
    if (startHour && endHour && parseFloat(endHour) <= parseFloat(startHour)) {
      return { 'hourSequence': true };
    }
    
    return null;
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
   * Manejar cambio de tipo de máquina
   */
  onMachineTypeChange(): void {
    const machineTypeId = this.machineHoursForm.get('machineType')?.value;
    
    if (machineTypeId) {
      // Cargar máquinas por tipo
      this.machineHoursService.getMachinesByType(machineTypeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.machines = response.data || [];
            }
          },
          error: (error) => {
            console.error('Error cargando máquinas por tipo:', error);
          }
        });
      
      // Cargar operadores por tipo de máquina
      this.machineHoursService.getOperatorsByMachineType(machineTypeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.operators = response.data || [];
            }
          },
          error: (error) => {
            console.error('Error cargando operadores por tipo:', error);
          }
        });
    }
    
    // Limpiar selecciones dependientes
    this.machineHoursForm.patchValue({
      machineId: '',
      operator: ''
    });
  }
  
  /**
   * Validar disponibilidad de máquina
   */
  validateMachineAvailability(): void {
    const machineId = this.machineHoursForm.get('machineId')?.value;
    const date = this.machineHoursForm.get('date')?.value;
    const startHour = this.machineHoursForm.get('startHour')?.value;
    const endHour = this.machineHoursForm.get('endHour')?.value;
    
    if (machineId && date && startHour && endHour) {
      this.machineHoursService.validateMachineAvailability(
        machineId, 
        date, 
        parseFloat(startHour), 
        parseFloat(endHour)
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.machineHoursForm.get('machineId')?.setErrors({ 'unavailable': true });
          }
        },
        error: (error) => {
          console.error('Error validando disponibilidad de máquina:', error);
        }
      });
    }
  }
  
  /**
   * Validar disponibilidad de operador
   */
  validateOperatorAvailability(): void {
    const operatorId = this.machineHoursForm.get('operator')?.value;
    const date = this.machineHoursForm.get('date')?.value;
    const startHour = this.machineHoursForm.get('startHour')?.value;
    const endHour = this.machineHoursForm.get('endHour')?.value;
    
    if (operatorId && date && startHour && endHour) {
      this.machineHoursService.validateOperatorAvailability(
        operatorId, 
        date, 
        parseFloat(startHour), 
        parseFloat(endHour)
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.machineHoursForm.get('operator')?.setErrors({ 'unavailable': true });
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
   * Obtener nombre del tipo de máquina por ID
   */
  getMachineTypeName(machineTypeId: string): string {
    const machineType = this.machineTypes.find(mt => mt.id === machineTypeId);
    return machineType ? machineType.name : 'Tipo desconocido';
  }
  
  /**
   * Obtener nombre de la máquina por ID
   */
  getMachineName(machineId: string): string {
    const machine = this.machines.find(m => m.id === machineId);
    return machine ? machine.name : 'Máquina desconocida';
  }
  
  /**
   * Obtener nombre del operador por ID
   */
  getOperatorName(operatorId: string): string {
    const operator = this.operators.find(o => o.id === operatorId);
    return operator ? operator.name : 'Operador desconocido';
  }
  
  /**
   * Calcular horas totales automáticamente
   */
  calculateTotalHours(): number {
    const startHour = this.machineHoursForm.get('startHour')?.value;
    const endHour = this.machineHoursForm.get('endHour')?.value;
    
    if (startHour && endHour) {
      return this.machineHoursService.calculateTotalHours(
        parseFloat(startHour), 
        parseFloat(endHour)
      );
    }
    
    return 0;
  }
  
  /**
   * Verificar si un campo del formulario tiene errores
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.machineHoursForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }
  
  /**
   * Obtener mensaje de error para un campo específico
   */
  getFieldError(fieldName: string): string {
    const field = this.machineHoursForm.get(fieldName);
    
    if (field?.errors) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} es requerido`;
      }
      if (field.errors['min']) {
        return `${this.getFieldLabel(fieldName)} debe ser mayor o igual a ${field.errors['min'].min}`;
      }
      if (field.errors['unavailable']) {
        return `${this.getFieldLabel(fieldName)} no está disponible para el horario seleccionado`;
      }
    }
    
    // Error de validación de secuencia de horas
    if (this.machineHoursForm.errors?.['hourSequence'] && 
        (fieldName === 'endHour' || fieldName === 'startHour')) {
      return 'La hora de fin debe ser mayor a la hora de inicio';
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
      'machineType': 'El tipo de máquina',
      'machineId': 'La máquina',
      'operator': 'El operador',
      'startHour': 'La hora de inicio',
      'endHour': 'La hora de fin',
      'fuelUsed': 'El combustible usado'
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
   * Manejar cambio de máquina
   */
  onMachineChange(): void {
    this.validateMachineAvailability();
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
    this.validateMachineAvailability();
    this.validateOperatorAvailability();
  }
  
  /**
   * Manejar cambio de horas
   */
  onHourChange(): void {
    // Revalidar disponibilidad cuando cambian las horas
    this.validateMachineAvailability();
    this.validateOperatorAvailability();
  }
  
  /**
   * Filtrar máquinas por estado activo
   */
  get activeMachines(): Machine[] {
    return this.machines.filter(machine => machine.status !== 'inactive');
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
  
  /**
   * Formatear horas para mostrar
   */
  formatHours(hours: number): string {
    return this.machineHoursService.formatHours(hours);
  }
  
  /**
   * Calcular eficiencia de combustible
   */
  getFuelEfficiency(totalHours: number, fuelUsed: number): number {
    return this.machineHoursService.calculateFuelEfficiency(totalHours, fuelUsed);
  }
}