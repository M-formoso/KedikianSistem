// machine-hours.component.ts - CORRECCIÓN DEFINITIVA DEL FLUJO

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

// Interface para el estado persistente de la máquina
interface MachineWorkStatus {
  isActive: boolean;
  startTime: string;
  startTimestamp: string;
  usuarioId: number;
  project: string;
  machineId: string;
  machineType: string;
  notes: string;
}

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
  
  // ✅ CRITICAL: Estados del contador - simplified
  isTimerActive = false;
  startTime: Date | null = null;
  currentTime: Date = new Date();
  elapsedHours = 0;
  elapsedMinutes = 0;
  elapsedSeconds = 0;
  
  // ✅ CRITICAL: Flag para evitar restauración después de finalizar
  private isFinishing = false;
  
  // Estado de trabajo de máquina activo
  activeMachineWork: MachineWorkStatus | null = null;
  
  // Datos maestros desde el backend
  projects: Project[] = [];
  machineTypes: MachineType[] = [];
  machines: Machine[] = [];
  
  currentOperator: CurrentOperator | null = null;
  
  // Registros recientes
  recentRecords: MachineHours[] = [];
  
  // Para cancelar suscripciones
  private destroy$ = new Subject<void>();
  
  // Clave para localStorage
  private readonly MACHINE_WORK_KEY = 'activeMachineWork';
  
  constructor(
    private formBuilder: FormBuilder,
    private machineHoursService: MachineHoursService,
    private authService: AuthService
  ) {
    this.initializeForm();
  }
  
  ngOnInit(): void {
    this.loadCurrentOperator();
    this.checkForActiveMachineWork();
    this.loadMasterData();
    this.loadRecentRecords();
    this.startClockUpdate();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
   * Cargar operador actual
   */
  private loadCurrentOperator(): void {
    const user: Usuario | null = this.authService.getCurrentUser();
    
    if (user) {
      this.currentOperator = {
        id: Number(user.id) || 999,
        nombre: user.nombreUsuario || 'Usuario Test',
        name: user.nombreUsuario || 'Usuario Test',
        email: user.email || 'test@test.com',
        roles: Array.isArray(user.roles) ? user.roles.join(',') : (typeof user.roles === 'string' ? user.roles : 'operario')
      };
    } else {
      this.currentOperator = {
        id: 999,
        nombre: 'Operario Test',
        name: 'Operario Test',
        email: 'operario@test.com',
        roles: 'operario'
      };
    }
    
    console.log('✅ Operador cargado:', this.currentOperator);
  }

  /**
   * ✅ CRITICAL: Verificar trabajo activo - CON PROTECCIÓN
   */
  private checkForActiveMachineWork(): void {
    console.log('🔍 Verificando trabajo activo...');
    
    // ✅ CRÍTICO: Si estamos finalizando, NO restaurar
    if (this.isFinishing) {
      console.log('⚠️ Proceso de finalización en curso - saltando restauración');
      return;
    }
    
    const savedMachineWork = localStorage.getItem(this.MACHINE_WORK_KEY);
    if (savedMachineWork) {
      try {
        const parsed = JSON.parse(savedMachineWork);
        
        console.log('📋 Datos encontrados en localStorage:', parsed);
        
        // ✅ Restaurar estado
        this.activeMachineWork = parsed;
        this.startTime = new Date(parsed.startTimestamp);
        this.isTimerActive = true;
        
        // Restaurar formulario
        this.machineHoursForm.patchValue({
          project: parsed.project,
          machineId: parsed.machineId,
          notes: parsed.notes
        });
        
        // Deshabilitar campos
        this.machineHoursForm.get('project')?.disable();
        this.machineHoursForm.get('machineId')?.disable();
        
        console.log('✅ Trabajo activo restaurado');
        return;
        
      } catch (error) {
        console.error('❌ Error parsing localStorage:', error);
        localStorage.removeItem(this.MACHINE_WORK_KEY);
      }
    }
    
    console.log('ℹ️ No hay trabajo activo');
  }

  /**
   * Actualizar reloj en tiempo real
   */
  private startClockUpdate(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentTime = new Date();
        if (this.isTimerActive && this.startTime && !this.isFinishing) {
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
   * ✅ Iniciar nuevo trabajo
   */
  startTimer(): void {
    console.log('🚀 Iniciando nuevo trabajo...');
    
    if (!this.canStartTimer()) {
      return;
    }

    const formValues = this.machineHoursForm.value;
    
    // ✅ RESETEAR flags
    this.isFinishing = false;
    
    // ✅ Establecer estado
    this.startTime = new Date();
    this.isTimerActive = true;
    this.elapsedHours = 0;
    this.elapsedMinutes = 0;
    this.elapsedSeconds = 0;
    this.error = '';
    this.success = false;

    // ✅ Crear estado de trabajo
    this.activeMachineWork = {
      isActive: true,
      startTime: this.extractTime(this.startTime.toISOString()),
      startTimestamp: this.startTime.toISOString(),
      usuarioId: this.currentOperator!.id,
      project: formValues.project,
      machineId: formValues.machineId,
      machineType: 'excavadora',
      notes: formValues.notes || ''
    };

    // ✅ Guardar en localStorage
    localStorage.setItem(this.MACHINE_WORK_KEY, JSON.stringify(this.activeMachineWork));

    // ✅ Deshabilitar campos
    this.machineHoursForm.get('project')?.disable();
    this.machineHoursForm.get('machineId')?.disable();

    console.log('✅ Trabajo iniciado correctamente');
  }

  /**
   * ✅ CRITICAL: Finalizar trabajo - DEFINITIVO
   */
  stopTimer(): void {
    console.log('🛑 FINALIZANDO TRABAJO - INICIO DEL PROCESO');
    
    if (!this.isTimerActive || !this.startTime || !this.activeMachineWork) {
      this.error = 'No hay trabajo activo para finalizar';
      return;
    }

    // ✅ CRÍTICO: Marcar que estamos finalizando PRIMERO
    this.isFinishing = true;
    
    // ✅ CRÍTICO: DETENER TIMER INMEDIATAMENTE
    this.isTimerActive = false;
    
    // ✅ CRÍTICO: LIMPIAR LOCALSTORAGE INMEDIATAMENTE
    localStorage.removeItem(this.MACHINE_WORK_KEY);
    
    console.log('✅ Timer detenido y localStorage limpiado');
    
    // ✅ Guardar en backend
    this.saveToBackend();
  }

  /**
   * ✅ CRITICAL: Guardar en backend - SEPARADO Y SIMPLIFICADO
   */
  private saveToBackend(): void {
    console.log('💾 Guardando en backend...');
    
    if (!this.startTime || !this.currentOperator || !this.activeMachineWork) {
      console.error('❌ Datos faltantes para guardar');
      this.completeFinalization();
      return;
    }

    this.loading = true;
    
    const endTime = new Date();
    const startHour = this.getDecimalHours(this.startTime);
    const endHour = this.getDecimalHours(endTime);
    const totalHours = Math.round((endHour - startHour) * 100) / 100;
    
    const machineHoursData = {
      date: new Date().toISOString().split('T')[0],
      machineType: this.activeMachineWork.machineType,
      machineId: this.activeMachineWork.machineId,
      startHour: startHour,
      endHour: endHour,
      totalHours: totalHours,
      project: this.activeMachineWork.project,
      operator: this.currentOperator.id.toString(),
      notes: this.activeMachineWork.notes || ''
    };

    console.log('📤 Datos para backend:', machineHoursData);

    this.machineHoursService.createMachineHours(machineHoursData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('📥 Respuesta backend:', response);
          this.loading = false;
          
          if (response.success) {
            console.log('✅ Guardado exitoso en backend');
            this.success = true;
            this.loadRecentRecords();
            
            setTimeout(() => {
              this.success = false;
            }, 3000);
          } else {
            console.error('❌ Error en respuesta backend:', response);
            this.error = response.message || 'Error al guardar';
          }
          
          // ✅ SIEMPRE completar finalización
          this.completeFinalization();
        },
        error: (error) => {
          console.error('❌ Error en petición backend:', error);
          this.loading = false;
          this.error = 'Error al guardar el registro';
          
          // ✅ SIEMPRE completar finalización
          this.completeFinalization();
        }
      });
  }

  /**
   * ✅ CRITICAL: Completar finalización - LIMPIAR TODO
   */
  private completeFinalization(): void {
    console.log('🧹 Completando finalización - limpieza final');
    
    // ✅ Limpiar TODA la información de estado
    this.activeMachineWork = null;
    this.isTimerActive = false;
    this.startTime = null;
    this.elapsedHours = 0;
    this.elapsedMinutes = 0;
    this.elapsedSeconds = 0;
    this.isFinishing = false; // ✅ CRÍTICO: Resetear flag
    
    // ✅ Rehabilitar formulario
    this.machineHoursForm.get('project')?.enable();
    this.machineHoursForm.get('machineId')?.enable();
    
    // ✅ Resetear formulario
    this.machineHoursForm.reset({
      date: new Date().toISOString().split('T')[0],
      project: '',
      machineId: '',
      notes: ''
    });
    
    this.submitted = false;
    
    // ✅ CRÍTICO: Asegurar que localStorage esté limpio
    localStorage.removeItem(this.MACHINE_WORK_KEY);
    
    console.log('✅ Finalización completada - estado limpio y listo para nuevo trabajo');
  }

  /**
   * Reset manual con confirmación
   */
  resetTimer(): void {
    if (this.isTimerActive && this.activeMachineWork) {
      const confirm = window.confirm('¿Cancelar el trabajo actual? Se perderán los datos.');
      if (!confirm) return;
    }
    
    console.log('🔄 Reset manual');
    
    // ✅ Marcar como finalizando para evitar restauración
    this.isFinishing = true;
    
    // ✅ Limpiar completamente
    this.completeFinalization();
  }

  /**
   * Convertir Date a horas decimales
   */
  private getDecimalHours(date: Date): number {
    return date.getHours() + (date.getMinutes() / 60) + (date.getSeconds() / 3600);
  }

  /**
   * Extraer tiempo de timestamp ISO
   */
  private extractTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  setupMobileTable(): void {}
  
  get f() { 
    return this.machineHoursForm.controls; 
  }
  
  /**
   * Cargar datos maestros
   */
  loadMasterData(): void {
    this.loadingMasterData = true;
    
    forkJoin({
      projects: this.machineHoursService.getProjects(),
      machines: this.machineHoursService.getMachines()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (responses) => {
        if (responses.projects.success) {
          this.projects = responses.projects.data || [];
        }
        
        if (responses.machines.success) {
          this.machines = responses.machines.data || [];
        }
        
        this.loadingMasterData = false;
      },
      error: (error) => {
        this.error = `Error al cargar datos: ${error.message}`;
        this.loadingMasterData = false;
      }
    });
  }
  
  /**
   * Cargar registros recientes
   */
  loadRecentRecords(): void {
    this.machineHoursService.getRecentMachineHours(10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.recentRecords = response.data;
            console.log('✅ Registros recientes actualizados:', this.recentRecords.length);
          }
        },
        error: (error) => {
          console.error('❌ Error cargando registros recientes:', error);
        }
      });
  }
  
  refreshMasterData(): void {
    this.loadMasterData();
  }
  
  refreshRecentRecords(): void {
    this.loadRecentRecords();
  }
  
  onMachineChange(): void {}
  
  // ============ MÉTODOS DE UTILIDAD ============
  
  getProjectName(projectId: string): string {
    if (!projectId) return 'Sin proyecto';
    const project = this.projects.find(p => p.id.toString() === projectId.toString());
    return project ? project.nombre : `Proyecto ${projectId}`;
  }
  
  getMachineTypeName(machineTypeId: string): string {
    return machineTypeId || 'Tipo desconocido';
  }
  
  getMachineName(machineId: string): string {
    if (!machineId) return 'Sin máquina';
    const machine = this.machines.find(m => m.id.toString() === machineId.toString());
    return machine ? machine.nombre : `Máquina ${machineId}`;
  }
  
  hasFieldError(fieldName: string): boolean {
    const field = this.machineHoursForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }
  
  getFieldError(fieldName: string): string {
    const field = this.machineHoursForm.get(fieldName);
    if (field?.errors?.['required']) {
      return `${this.getFieldLabel(fieldName)} es requerido`;
    }
    return '';
  }
  
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'project': 'El proyecto',
      'machineId': 'La máquina',
      'notes': 'Las observaciones'
    };
    return labels[fieldName] || fieldName;
  }
  
  get isLoading(): boolean {
    return this.loading || this.loadingMasterData;
  }
  
  get activeMachines(): Machine[] {
    return this.machines.filter(machine => machine.estado === true);
  }
  
  get activeProjects(): Project[] {
    return this.projects.filter(project => project.estado === true);
  }
  
  get formattedElapsedTime(): string {
    const hours = this.elapsedHours.toString().padStart(2, '0');
    const minutes = this.elapsedMinutes.toString().padStart(2, '0');
    const seconds = this.elapsedSeconds.toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  get elapsedTimeDecimal(): number {
    return this.elapsedHours + (this.elapsedMinutes / 60) + (this.elapsedSeconds / 3600);
  }

  get formattedCurrentTime(): string {
    return this.currentTime.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  get formattedCurrentDate(): string {
    return this.currentTime.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get hasWorkInProgress(): boolean {
    return this.isTimerActive && this.startTime !== null && this.activeMachineWork !== null && !this.isFinishing;
  }

  get formattedStartTime(): string {
    if (!this.startTime) return '';
    return this.startTime.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * ✅ Verificar si se puede iniciar timer
   */
  canStartTimer(): boolean {
    if (this.isTimerActive || this.isFinishing) {
      this.error = 'Ya hay un trabajo en progreso o finalizando';
      return false;
    }
    
    if (this.isLoading) {
      this.error = 'Cargando datos...';
      return false;
    }
    
    if (!this.currentOperator) {
      this.error = 'No se pudo cargar información del operador';
      return false;
    }
    
    const project = this.machineHoursForm.get('project')?.value;
    const machineId = this.machineHoursForm.get('machineId')?.value;
    
    if (!project) {
      this.error = 'Debe seleccionar un proyecto';
      return false;
    }
    
    if (!machineId) {
      this.error = 'Debe seleccionar una máquina';
      return false;
    }
    
    this.error = '';
    return true;
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