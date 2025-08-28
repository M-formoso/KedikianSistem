import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil, forkJoin, interval } from 'rxjs';
import { 
  MachineHoursService,
  MachineHours,
  Project,
  MachineType,
  Machine,
  Operator
} from '../../../core/services/machine-hours.service';
import { AuthService } from '../../../core/services/auth.service';
// Interface para los datos del formulario
interface MachineHoursRequest {
  date: string;
  machineType: string;
  machineId: string;
  startHour: number;
  endHour: number;
  project: string;
  operator: string;
  notes?: string;
}

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
  
  // Estados del contador de tiempo
  isTimerActive = false;
  startTime: Date | null = null;
  currentTime: Date = new Date();
  elapsedHours = 0;
  elapsedMinutes = 0;
  elapsedSeconds = 0;
  
  // Datos maestros desde el backend
  projects: Project[] = [];
  machineTypes: MachineType[] = [];
  machines: Machine[] = [];
  
  // Operador actual (tomado de la sesión)
  currentOperator: Operator | null = null;
  
  // Registros recientes
  recentRecords: MachineHours[] = [];
  
  // Para cancelar suscripciones
  private destroy$ = new Subject<void>();
  private timerSubscription$ = new Subject<void>();
  
  constructor(
    private formBuilder: FormBuilder,
    private machineHoursService: MachineHoursService,
    private authService: AuthService
  ) {
    this.initializeForm();
  }
  
  ngOnInit(): void {
    //this.loadCurrentOperator();
    this.loadMasterData();
    this.loadRecentRecords();
    this.setupMobileTable();
    this.startClockUpdate();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.timerSubscription$.next();
    this.timerSubscription$.complete();
  }

  /**
   * Inicializar el formulario reactivo
   */
  private initializeForm(): void {
    const today = new Date().toISOString().split('T')[0];
    
    this.machineHoursForm = this.formBuilder.group({
      date: [{ value: today, disabled: true }], // Fecha fija, no editable
      project: ['', [Validators.required]],
      machineType: ['', [Validators.required]],
      machineId: ['', [Validators.required]],
      notes: ['']
    });
  }

  /**
   * Cargar operador actual de la sesión
   */

  /**
  private loadCurrentOperator(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentOperator = {
        id: user.id || 999,
        nombre: user.nombre,
        email: user.email,
        roles: user.roles
      };
    } else {
      // Fallback a operador mock
      this.currentOperator = {
        id: 999,
        nombre: 'Operario Test',
        email: 'operario@test.com',
        roles: 'operario'
      };
    }
  }

  /**
   * Actualizar reloj en tiempo real
   */
  private startClockUpdate(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentTime = new Date();
        if (this.isTimerActive && this.startTime) {
          this.updateElapsedTime();
        }
      });
  }

  /**
   * Actualizar tiempo transcurrido
   */
  private updateElapsedTime(): void {
    if (!this.startTime) return;
    
    const now = new Date();
    const elapsed = now.getTime() - this.startTime.getTime();
    
    this.elapsedSeconds = Math.floor((elapsed / 1000) % 60);
    this.elapsedMinutes = Math.floor((elapsed / (1000 * 60)) % 60);
    this.elapsedHours = Math.floor(elapsed / (1000 * 60 * 60));
  }

  /**
   * Iniciar contador de tiempo
   */
  startTimer(): void {
    if (!this.canStartTimer()) {
      return;
    }

    this.startTime = new Date();
    this.isTimerActive = true;
    this.elapsedHours = 0;
    this.elapsedMinutes = 0;
    this.elapsedSeconds = 0;
    this.error = '';
    this.success = false;

    // Validar disponibilidad de máquina al iniciar
    this.validateMachineAvailabilityForStart();
  }

  /**
   * Detener contador de tiempo
   */
  stopTimer(): void {
    if (!this.isTimerActive || !this.startTime) {
      return;
    }

    this.isTimerActive = false;
    
    // Guardar automáticamente el registro
    this.saveTimerRecord();
  }

  /**
   * Verificar si se puede iniciar el timer
   */
  canStartTimer(): boolean {
    const requiredFields = ['project', 'machineType', 'machineId'];
    
    for (const field of requiredFields) {
      if (!this.machineHoursForm.get(field)?.value) {
        this.error = `Debe seleccionar ${this.getFieldLabel(field).toLowerCase()} antes de iniciar`;
        return false;
      }
    }

    if (!this.currentOperator) {
      this.error = 'No se pudo cargar la información del operador';
      return false;
    }

    return true;
  }

  /**
   * Guardar registro cuando se detiene el timer
   */
  private saveTimerRecord(): void {
    if (!this.startTime || !this.currentOperator) {
      this.error = 'Error: datos incompletos para guardar el registro';
      return;
    }

    this.loading = true;
    
    const endTime = new Date();
    const startHour = this.getDecimalHours(this.startTime);
    const endHour = this.getDecimalHours(endTime);
    
    const formValues = this.machineHoursForm.value;
    const machineHoursData: MachineHoursRequest = {
      date: new Date().toISOString().split('T')[0],
      machineType: formValues.machineType,
      machineId: formValues.machineId,
      startHour: startHour,
      endHour: endHour,
      project: formValues.project,
      operator: this.currentOperator.id.toString(),
      notes: formValues.notes || ''
    };

    this.machineHoursService.createMachineHours(machineHoursData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.success = true;
            this.loadRecentRecords();
            this.resetTimer();
            
            setTimeout(() => {
              this.success = false;
            }, 5000);
          } else {
            this.error = 'Error al guardar el registro de horas';
          }
        },
        error: (error) => {
          this.loading = false;
          this.error = error.message || 'Error al procesar la solicitud';
          console.error('Error guardando registro de horas:', error);
        }
      });
  }

  /**
   * Convertir Date a horas decimales (desde medianoche)
   */
  private getDecimalHours(date: Date): number {
    return date.getHours() + (date.getMinutes() / 60) + (date.getSeconds() / 3600);
  }

  /**
   * Resetear timer y formulario
   */
  resetTimer(): void {
    this.startTime = null;
    this.isTimerActive = false;
    this.elapsedHours = 0;
    this.elapsedMinutes = 0;
    this.elapsedSeconds = 0;
    
    const currentProject = this.machineHoursForm.get('project')?.value;
    
    this.machineHoursForm.reset({
      date: new Date().toISOString().split('T')[0],
      project: currentProject,
      machineType: '',
      machineId: '',
      notes: ''
    });
    
    this.submitted = false;
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
    
    forkJoin({
      projects: this.machineHoursService.getProjects(),
      machineTypes: this.machineHoursService.getMachineTypes(),
      machines: this.machineHoursService.getMachines()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (responses) => {
        if (responses.projects.success) {
          this.projects = responses.projects.data || [];
        }
        
        if (responses.machineTypes.success) {
          this.machineTypes = responses.machineTypes.data || [];
        }
        
        if (responses.machines.success) {
          this.machines = responses.machines.data || [];
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
        }
      });
  }
  
  /**
   * Manejar cambio de tipo de máquina
   */
  onMachineTypeChange(): void {
    const machineTypeId = this.machineHoursForm.get('machineType')?.value;
    
    if (machineTypeId) {
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
    }
    
    this.machineHoursForm.patchValue({
      machineId: ''
    });

    if (this.isTimerActive) {
      this.stopTimer();
    }
  }
  
  /**
   * Validar disponibilidad de máquina para iniciar trabajo
   */
  validateMachineAvailabilityForStart(): void {
    const machineId = this.machineHoursForm.get('machineId')?.value;
    const date = new Date().toISOString().split('T')[0];
    const currentHour = this.getDecimalHours(new Date());
    
    if (machineId && this.currentOperator) {
      this.machineHoursService.validateMachineAvailability(
        machineId, 
        date, 
        currentHour, 
        currentHour + 0.1
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.error = 'La máquina no está disponible en este momento';
            this.stopTimer();
          }
        },
        error: (error) => {
          console.error('Error validando disponibilidad de máquina:', error);
          this.error = 'Error al validar disponibilidad de máquina';
          this.stopTimer();
        }
      });
    }
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
   * Manejar cambio de máquina
   */
  onMachineChange(): void {
    if (this.isTimerActive) {
      this.stopTimer();
    }
  }
  
  // ============ MÉTODOS DE UTILIDAD PARA LA VISTA ============
  
  /**
   * Obtener nombre del proyecto por ID
   */
  getProjectName(projectId: string): string {
    const project = this.projects.find(p => p.id.toString() === projectId);
    return project ? project.nombre : 'Proyecto desconocido';
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
    const machine = this.machines.find(m => m.id.toString() === machineId);
    return machine ? machine.nombre : 'Máquina desconocida';
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
    }
    
    return '';
  }
  
  /**
   * Obtener etiqueta del campo para mensajes de error
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'project': 'El proyecto',
      'machineType': 'El tipo de máquina',
      'machineId': 'La máquina',
      'notes': 'Las observaciones'
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
   * Filtrar máquinas por estado activo
   */
  get activeMachines(): Machine[] {
    return this.machines.filter(machine => machine.estado === true);
  }
  
  /**
   * Filtrar proyectos por estado activo
   */
  get activeProjects(): Project[] {
    return this.projects.filter(project => project.estado === true);
  }
  
  /**
   * Formatear tiempo transcurrido para mostrar
   */
  get formattedElapsedTime(): string {
    const hours = this.elapsedHours.toString().padStart(2, '0');
    const minutes = this.elapsedMinutes.toString().padStart(2, '0');
    const seconds = this.elapsedSeconds.toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Formatear tiempo transcurrido en formato decimal
   */
  get elapsedTimeDecimal(): number {
    return this.elapsedHours + (this.elapsedMinutes / 60) + (this.elapsedSeconds / 3600);
  }

  /**
   * Obtener hora actual formateada
   */
  get formattedCurrentTime(): string {
    return this.currentTime.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  /**
   * Obtener fecha actual formateada
   */
  get formattedCurrentDate(): string {
    return this.currentTime.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Verificar si hay trabajo en progreso
   */
  get hasWorkInProgress(): boolean {
    return this.isTimerActive && this.startTime !== null;
  }

  /**
   * Obtener hora de inicio formateada
   */
  get formattedStartTime(): string {
    if (!this.startTime) return '';
    return this.startTime.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  trackByRecordId(index: number, record: MachineHours): string {
    return record.id?.toString() || index.toString();
  }
  
  getTotalHoursToday(): number {
    return this.recentRecords
      .filter(record => record.date === new Date().toISOString().split('T')[0])
      .reduce((total, record) => total + record.totalHours, 0);
  }
  
  getUniqueMachinesToday(): number {
    const today = new Date().toISOString().split('T')[0];
    const machines = new Set(
      this.recentRecords
        .filter(record => record.date === today)
        .map(record => record.machineId)
    );
    return machines.size;
  }
}