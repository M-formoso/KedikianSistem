// machine-hours.component.ts - CORRECCIÓN COMPLETA

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
  Machine
} from '../../../core/services/machine-hours.service';
import { AuthService, Usuario } from '../../../core/services/auth.service';

// ✅ INTERFACE CORREGIDA - Usar la interface local, no la del servicio
interface CurrentOperator {
  id: number;
  nombre: string;
  name: string;
  email: string;
  roles: string;
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
  
  // ✅ CORREGIDO - Usar interface local
  currentOperator: CurrentOperator | null = null;
  
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
    this.loadCurrentOperator();
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
      date: [{ value: today, disabled: true }],
      project: ['', [Validators.required]],
      machineId: ['', [Validators.required]],
      notes: ['']
    });
  }

  /**
   * ✅ MÉTODO CORREGIDO - Cargar operador actual
   */
  private loadCurrentOperator(): void {
    console.log('🔍 Cargando operador actual...');
    
    const user: Usuario | null = this.authService.getCurrentUser();
    console.log('👤 Usuario desde AuthService:', user);
    
    if (user) {
      // ✅ CORREGIDO - Mapear correctamente las propiedades
      this.currentOperator = {
        id: Number(user.id) || 999,
        nombre: user.nombreUsuario || 'Usuario Test',
        name: user.nombreUsuario || 'Usuario Test',
        email: user.email || 'test@test.com', // Assuming 'email' is the correct property for email
        roles: Array.isArray(user.roles) ? user.roles.join(',') : (typeof user.roles === 'string' ? user.roles : 'operario')
      };
      
      console.log('✅ Operador cargado correctamente:', this.currentOperator);
    } else {
      console.warn('⚠️ No se encontró usuario, usando operador mock');
      
      // ✅ FALLBACK - Operador por defecto
      this.currentOperator = {
        id: 999,
        nombre: 'Operario Test',
        name: 'Operario Test',
        email: 'operario@test.com',
        roles: 'operario'
      };
      
      console.log('🔄 Operador mock creado:', this.currentOperator);
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
   * ✅ MÉTODO CORREGIDO - Iniciar contador de tiempo
   */
  startTimer(): void {
    console.log('🚀 Intentando iniciar timer...');
    console.log('📋 Estado del formulario:', this.machineHoursForm.value);
    console.log('📋 Formulario válido:', this.machineHoursForm.valid);
    console.log('👤 Operador actual:', this.currentOperator);
    
    if (!this.canStartTimer()) {
      console.error('❌ No se puede iniciar el timer');
      return;
    }

    this.startTime = new Date();
    this.isTimerActive = true;
    this.elapsedHours = 0;
    this.elapsedMinutes = 0;
    this.elapsedSeconds = 0;
    this.error = '';
    this.success = false;

    console.log('✅ Timer iniciado correctamente en:', this.startTime);
  }

  /**
   * Detener contador de tiempo
   */
  stopTimer(): void {
    if (!this.isTimerActive || !this.startTime) {
      this.error = 'No hay trabajo activo para finalizar';
      return;
    }

    this.isTimerActive = false;
    this.saveTimerRecord();
  }

  /**
   * ✅ MÉTODO CORREGIDO - Verificar si se puede iniciar el timer
   */
  canStartTimer(): boolean {
    console.log('🔍 Verificando condiciones para iniciar timer...');
    
    // 1. Verificar que no haya timer activo
    if (this.isTimerActive) {
      console.log('❌ Timer ya está activo');
      this.error = 'Ya hay un trabajo en progreso';
      return false;
    }
    
    // 2. Verificar que no esté cargando
    if (this.isLoading) {
      console.log('❌ Está cargando datos');
      this.error = 'Esperando a que carguen los datos';
      return false;
    }
    
    // 3. Verificar operador actual
    if (!this.currentOperator) {
      console.log('❌ No hay operador actual');
      this.error = 'No se pudo cargar la información del operador. Recarga la página.';
      return false;
    }
    
    // 4. Verificar campos requeridos del formulario
    const project = this.machineHoursForm.get('project')?.value;
    const machineId = this.machineHoursForm.get('machineId')?.value;
    
    console.log('📋 Proyecto seleccionado:', project);
    console.log('📋 Máquina seleccionada:', machineId);
    
    if (!project) {
      this.error = 'Debe seleccionar un proyecto antes de iniciar';
      console.log('❌ Falta proyecto');
      return false;
    }
    
    if (!machineId) {
      this.error = 'Debe seleccionar una máquina antes de iniciar';
      console.log('❌ Falta máquina');
      return false;
    }
    
    // 5. Verificar que hay proyectos y máquinas disponibles
    if (this.activeProjects.length === 0) {
      this.error = 'No hay proyectos disponibles. Contacte al administrador.';
      console.log('❌ No hay proyectos activos');
      return false;
    }
    
    if (this.activeMachines.length === 0) {
      this.error = 'No hay máquinas disponibles. Contacte al administrador.';
      console.log('❌ No hay máquinas activas');
      return false;
    }
    
    console.log('✅ Todas las validaciones pasaron');
    this.error = ''; // Limpiar cualquier error previo
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
    
    // ✅ CORREGIDO - Estructura de datos para el backend
    const machineHoursData = {
      date: new Date().toISOString().split('T')[0],
      machineType: 'excavadora', // Por defecto
      machineId: formValues.machineId,
      startHour: startHour,
      endHour: endHour,
      totalHours: Math.round((endHour - startHour) * 100) / 100,
      project: formValues.project,
      operator: this.currentOperator.id.toString(),
      notes: formValues.notes || ''
    };

    console.log('💾 Guardando registro:', machineHoursData);

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
            
            console.log('✅ Registro guardado exitosamente');
          } else {
            this.error = response.message || 'Error al guardar el registro de horas';
            console.error('❌ Error en respuesta:', response);
          }
        },
        error: (error) => {
          this.loading = false;
          this.error = error.message || 'Error al procesar la solicitud';
          console.error('❌ Error guardando registro:', error);
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
    
    // Mantener el proyecto seleccionado al resetear
    const currentProject = this.machineHoursForm.get('project')?.value;
    
    this.machineHoursForm.reset({
      date: new Date().toISOString().split('T')[0],
      project: currentProject, // Mantener proyecto
      machineId: '',
      notes: ''
    });
    
    this.submitted = false;
    this.error = '';
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
    console.log('📊 Cargando datos maestros...');
    this.loadingMasterData = true;
    this.error = '';
    
    forkJoin({
      projects: this.machineHoursService.getProjects(),
      machines: this.machineHoursService.getMachines()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (responses) => {
        console.log('📊 Respuestas de datos maestros:', responses);
        
        if (responses.projects.success) {
          this.projects = responses.projects.data || [];
          console.log('✅ Proyectos cargados:', this.projects.length);
        } else {
          console.error('❌ Error cargando proyectos:', responses.projects);
        }
        
        if (responses.machines.success) {
          this.machines = responses.machines.data || [];
          console.log('✅ Máquinas cargadas:', this.machines.length);
        } else {
          console.error('❌ Error cargando máquinas:', responses.machines);
        }
        
        this.loadingMasterData = false;
        
        // Verificar si hay datos suficientes
        if (this.activeProjects.length === 0) {
          this.error = 'No hay proyectos activos disponibles';
        } else if (this.activeMachines.length === 0) {
          this.error = 'No hay máquinas activas disponibles';
        }
      },
      error: (error) => {
        this.error = `Error al cargar datos: ${error.message}`;
        this.loadingMasterData = false;
        console.error('❌ Error cargando datos maestros:', error);
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
            console.log('✅ Registros recientes cargados:', this.recentRecords.length);
          }
        },
        error: (error) => {
          console.error('❌ Error cargando registros recientes:', error);
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
    if (!projectId) return 'Sin proyecto';
    const project = this.projects.find(p => p.id.toString() === projectId.toString());
    return project ? project.nombre : `Proyecto ${projectId}`;
  }
  
  /**
   * Obtener nombre del tipo de máquina por ID
   */
  getMachineTypeName(machineTypeId: string): string {
    return machineTypeId || 'Tipo desconocido';
  }
  
  /**
   * Obtener nombre de la máquina por ID
   */
  getMachineName(machineId: string): string {
    if (!machineId) return 'Sin máquina';
    const machine = this.machines.find(m => m.id.toString() === machineId.toString());
    return machine ? machine.nombre : `Máquina ${machineId}`;
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
    const today = new Date().toISOString().split('T')[0];
    return this.recentRecords
      .filter(record => record.date === today)
      .reduce((total, record) => total + (record.totalHours || 0), 0);
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