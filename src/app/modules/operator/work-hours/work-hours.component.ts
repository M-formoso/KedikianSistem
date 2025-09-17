// work-hours.component.ts - CORREGIDO CON LÓGICA DE HORAS EXTRAS

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil, interval } from 'rxjs';
import { 
  WorkHoursService,
  WorkDay,
  ReporteLaboral
} from '../../../core/services/work-hours.service';
import { AuthService, Usuario } from '../../../core/services/auth.service';

// ✅ MEJORADO: Interface para el estado del fichaje activo con horas extras
interface ClockStatus {
  isActive: boolean;
  startTime: string;
  startTimestamp: Date;
  usuarioId: number;
  reporteId: number;
  notas?: string;
  
  // ✅ NUEVO: Control de horas extras
  isOvertimeMode: boolean;
  overtimeStartTimestamp?: Date;
  regularHoursCompleted: boolean;
  showOvertimeDialog: boolean;
  autoStoppedAt9Hours: boolean;
}

@Component({
  selector: 'app-work-hours',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './work-hours.component.html',
  styleUrls: ['./work-hours.component.css'],
})
export class WorkHoursComponent implements OnInit, OnDestroy {
  // Formularios
  clockInForm!: FormGroup;
  clockOutForm!: FormGroup;
  
  // Estados del componente
  submitted = false;
  success = false;
  error = '';
  loading = false;
  loadingMasterData = false;
  
  // ✅ MEJORADO: Estado de fichaje con horas extras
  activeClockIn: ClockStatus | null = null;
  elapsedTimeInterval: any;
  
  // ✅ NUEVO: Control de horas extras
  showOvertimeDialog = false;
  isOvertimeActive = false;
  regularHours = 0;
  overtimeHours = 0;
  
  // Usuario actual
  currentUser: Usuario | null = null;
  
  // Registros recientes
  recentWorkHours: WorkDay[] = [];
  
  // Propiedad para manejo del calendario
  private currentCalendarDate = new Date();
  
  // Para cancelar suscripciones
  private destroy$ = new Subject<void>();
  
  // ✅ NUEVO: Constantes de configuración
  private readonly MAX_REGULAR_HOURS = 9;
  private readonly WARNING_HOURS = 8;
  private readonly MAX_OVERTIME_HOURS = 4; // Máximo 4 horas extras
  private readonly CLOCK_STORAGE_KEY = 'activeWorkClockIn';

  constructor(
    private formBuilder: FormBuilder,
    private workHoursService: WorkHoursService,
    private authService: AuthService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.checkForActiveClockIn();
    this.loadRecentWorkHours();
    this.setupMobileTable();
    this.startClockUpdate();
  }

  ngOnDestroy(): void {
    if (this.elapsedTimeInterval) {
      clearInterval(this.elapsedTimeInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    // Formulario para fichar entrada (simplificado)
    this.clockInForm = this.formBuilder.group({
      notas: ['']
    });

    // Formulario para fichar salida
    this.clockOutForm = this.formBuilder.group({
      tiempoDescanso: [60, [Validators.required, Validators.min(0)]],
      notas: ['', Validators.maxLength(500)]
    });
  }

  /**
   * ✅ CORREGIDO: Cargar usuario actual con mejor validación
   */
  private loadCurrentUser(): void {
    this.currentUser = this.authService.obtenerUsuarioActual();
    if (!this.currentUser) {
      this.error = 'No se pudo cargar la información del usuario. Inicie sesión nuevamente.';
      this.authService.cerrarSesion();
    } else {
      console.log('✅ Usuario actual cargado:', this.currentUser);
    }
  }

  // Configuración para la tabla responsiva en móviles
  setupMobileTable(): void {
    // Implementación futura para tabla responsiva
  }

  /**
   * ✅ MEJORADO: Actualizar reloj en tiempo real con control de límites
   */
  private startClockUpdate(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.activeClockIn && this.activeClockIn.isActive) {
          this.updateElapsedTime();
          this.checkTimeConstraints();
        }
      });
  }

  /**
   * ✅ NUEVO: Actualizar tiempo transcurrido y calcular horas regulares/extras
   */
  private updateElapsedTime(): void {
    if (!this.activeClockIn) return;

    const now = new Date();
    const startTime = this.activeClockIn.startTimestamp;
    const totalElapsedMs = now.getTime() - startTime.getTime();
    const totalElapsedHours = totalElapsedMs / (1000 * 60 * 60);

    // Calcular horas regulares y extras
    if (totalElapsedHours <= this.MAX_REGULAR_HOURS) {
      this.regularHours = totalElapsedHours;
      this.overtimeHours = 0;
      this.isOvertimeActive = false;
    } else {
      this.regularHours = this.MAX_REGULAR_HOURS;
      this.overtimeHours = totalElapsedHours - this.MAX_REGULAR_HOURS;
      this.isOvertimeActive = true;
    }

    // Actualizar estado para change detection
    this.activeClockIn = { ...this.activeClockIn };
  }

  /**
   * ✅ NUEVO: Verificar límites de tiempo y manejar paradas automáticas
   */
  private checkTimeConstraints(): void {
    if (!this.activeClockIn) return;

    const totalHours = this.regularHours + this.overtimeHours;

    // Si alcanzó las 9 horas y no está en modo overtime, mostrar diálogo
    if (this.regularHours >= this.MAX_REGULAR_HOURS && 
        !this.activeClockIn.regularHoursCompleted && 
        !this.showOvertimeDialog) {
      
      this.activeClockIn.regularHoursCompleted = true;
      this.activeClockIn.autoStoppedAt9Hours = true;
      this.pauseTimer();
      this.showOvertimeConfirmation();
      this.saveClockStatusToStorage();
    }

    // Si supera las horas extras máximas, finalizar automáticamente
    if (this.isOvertimeActive && this.overtimeHours >= this.MAX_OVERTIME_HOURS) {
      this.autoFinishWork('Se alcanzó el límite máximo de horas extras (4h)');
    }
  }

  /**
   * ✅ NUEVO: Pausar el timer (no finalizar, solo pausar)
   */
  private pauseTimer(): void {
    if (this.activeClockIn) {
      this.activeClockIn.isActive = false;
      console.log('⏸️ Timer pausado automáticamente a las 9 horas');
    }
  }

  /**
   * ✅ NUEVO: Reanudar el timer para horas extras
   */
  private resumeTimer(): void {
    if (this.activeClockIn) {
      this.activeClockIn.isActive = true;
      this.activeClockIn.isOvertimeMode = true;
      this.activeClockIn.overtimeStartTimestamp = new Date();
      console.log('▶️ Timer reanudado para horas extras');
    }
  }

  /**
   * ✅ NUEVO: Mostrar diálogo de confirmación de horas extras
   */
  private showOvertimeConfirmation(): void {
    this.showOvertimeDialog = true;
    this.success = false;
    this.error = '';
  }

  /**
   * ✅ NUEVO: Confirmar horas extras
   */
  confirmOvertime(): void {
    if (this.activeClockIn) {
      this.showOvertimeDialog = false;
      this.resumeTimer();
      this.saveClockStatusToStorage();
      console.log('✅ Horas extras confirmadas');
    }
  }

  /**
   * ✅ NUEVO: Rechazar horas extras y finalizar trabajo
   */
  declineOvertime(): void {
    this.showOvertimeDialog = false;
    
    // ✅ CRÍTICO: Completar el formulario antes de finalizar
    this.clockOutForm.patchValue({
      tiempoDescanso: this.clockOutForm.get('tiempoDescanso')?.value || 60,
      notas: (this.clockOutForm.get('notas')?.value || '') + ' - Finalizado al completar 9 horas regulares'
    });
    
    this.finishWork('Trabajo finalizado al completar 9 horas regulares');
  }

  /**
   * ✅ NUEVO: Finalizar trabajo automáticamente
   */
  private autoFinishWork(reason: string): void {
    if (this.activeClockIn) {
      console.log('🛑 Finalizando trabajo automáticamente:', reason);
      this.finishWork(reason);
    }
  }

  /**
   * ✅ MEJORADO: Comprobar fichaje activo con restauración completa
   */
  checkForActiveClockIn(): void {
    if (!this.currentUser || !this.currentUser.id) {
      console.warn('⚠️ No hay usuario actual o ID inválido');
      return;
    }

    // Verificar localStorage primero
    const savedClockIn = localStorage.getItem(this.CLOCK_STORAGE_KEY);
    if (savedClockIn) {
      try {
        const parsed = JSON.parse(savedClockIn);
        this.restoreClockInFromStorage(parsed);
        return;
      } catch (error) {
        console.error('❌ Error parsing localStorage clockIn:', error);
        localStorage.removeItem(this.CLOCK_STORAGE_KEY);
      }
    }

    // Si no hay en localStorage, verificar en el backend
    this.checkActiveWorkDayInBackend();
  }

  /**
   * ✅ NUEVO: Restaurar estado completo desde localStorage
   */
  private restoreClockInFromStorage(saved: any): void {
    this.activeClockIn = {
      isActive: saved.isActive !== false, // Por defecto true si no está definido
      startTime: saved.startTime,
      startTimestamp: new Date(saved.startTimestamp),
      usuarioId: saved.usuarioId,
      reporteId: saved.reporteId,
      notas: saved.notas,
      
      // Estados de horas extras
      isOvertimeMode: saved.isOvertimeMode || false,
      overtimeStartTimestamp: saved.overtimeStartTimestamp ? new Date(saved.overtimeStartTimestamp) : undefined,
      regularHoursCompleted: saved.regularHoursCompleted || false,
      showOvertimeDialog: false, // Nunca mostrar el diálogo al restaurar
      autoStoppedAt9Hours: saved.autoStoppedAt9Hours || false
    };

    console.log('✅ Estado de fichaje restaurado:', this.activeClockIn);

    // Si estaba pausado por las 9 horas, verificar si necesita mostrar diálogo
    if (this.activeClockIn.autoStoppedAt9Hours && !this.activeClockIn.isOvertimeMode) {
      // Solo mostrar si no había decidido sobre overtime
      setTimeout(() => {
        this.showOvertimeConfirmation();
      }, 1000);
    }
  }

  /**
   * ✅ MEJORADO: Verificar trabajo activo en backend
   */
  private checkActiveWorkDayInBackend(): void {
    const usuarioId = typeof this.currentUser!.id === 'string' 
      ? parseInt(this.currentUser!.id, 10) 
      : Number(this.currentUser!.id);

    if (isNaN(usuarioId)) {
      console.error('❌ ID de usuario inválido para verificar fichaje activo');
      return;
    }

    this.workHoursService.getActiveWorkDay(usuarioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const reporte = response.data;
            this.activeClockIn = {
              isActive: true,
              startTime: this.extractTime(reporte.fecha_asignacion),
              startTimestamp: new Date(reporte.fecha_asignacion),
              usuarioId: reporte.usuario_id,
              reporteId: reporte.id!,
              
              // Estados de horas extras (nuevos por defecto)
              isOvertimeMode: false,
              regularHoursCompleted: false,
              showOvertimeDialog: false,
              autoStoppedAt9Hours: false
            };
            
            this.saveClockStatusToStorage();
            console.log('✅ Fichaje activo encontrado en backend');
          }
        },
        error: (error) => {
          console.error('❌ Error verificando fichaje activo:', error);
        }
      });
  }

  /**
   * ✅ NUEVO: Guardar estado en localStorage
   */
  private saveClockStatusToStorage(): void {
    if (this.activeClockIn) {
      localStorage.setItem(this.CLOCK_STORAGE_KEY, JSON.stringify({
        ...this.activeClockIn,
        startTimestamp: this.activeClockIn.startTimestamp.toISOString(),
        overtimeStartTimestamp: this.activeClockIn.overtimeStartTimestamp?.toISOString()
      }));
    }
  }

  /**
   * ✅ NUEVO: Limpiar estado de localStorage
   */
  private clearClockStatusFromStorage(): void {
    localStorage.removeItem(this.CLOCK_STORAGE_KEY);
  }

  /**
   * Extraer tiempo de un timestamp ISO
   */
  private extractTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * ✅ MEJORADO: Fichar entrada
   */
  clockIn(): void {
    if (!this.currentUser || !this.currentUser.id) {
      this.error = 'Usuario no disponible o ID de usuario inválido';
      return;
    }

    // ✅ CRÍTICO: Limpiar errores previos y estado
    this.loading = true;
    this.success = false;
    this.error = '';
    this.showOvertimeDialog = false;
    
    // ✅ Resetear contadores
    this.regularHours = 0;
    this.overtimeHours = 0;
    this.isOvertimeActive = false;

    const formValues = this.clockInForm.value;
    const usuarioId = typeof this.currentUser.id === 'string' 
      ? parseInt(this.currentUser.id, 10) 
      : Number(this.currentUser.id);

    if (isNaN(usuarioId)) {
      this.error = 'ID de usuario inválido';
      this.loading = false;
      return;
    }

    console.log('🚀 Iniciando fichaje para usuario ID:', usuarioId);

    this.workHoursService.clockIn(usuarioId, formValues.notas)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          
          if (response.success && response.data) {
            const reporte = response.data;
            
            // ✅ CREAR estado inicial completo
            this.activeClockIn = {
              isActive: true,
              startTime: this.extractTime(reporte.fecha_asignacion),
              startTimestamp: new Date(reporte.fecha_asignacion),
              usuarioId: reporte.usuario_id,
              reporteId: reporte.id!,
              notas: formValues.notas,
              
              // Estados iniciales de horas extras
              isOvertimeMode: false,
              regularHoursCompleted: false,
              showOvertimeDialog: false,
              autoStoppedAt9Hours: false
            };

            this.saveClockStatusToStorage();
            this.success = true;
            
            // ✅ Solo resetear el formulario de entrada
            this.clockInForm.reset({ notas: '' });
            
            // ✅ Resetear también el formulario de salida para valores por defecto
            this.clockOutForm.reset({
              tiempoDescanso: 60,
              notas: ''
            });

            setTimeout(() => { this.success = false; }, 3000);
            console.log('✅ Fichaje de entrada registrado');
          } else {
            this.error = response.message || 'Error al registrar fichaje de entrada';
          }
        },
        error: (error) => {
          this.loading = false;
          this.error = error.message || 'Error al procesar la solicitud';
          console.error('❌ Error fichando entrada:', error);
        }
      });
  }

  /**
   * ✅ MEJORADO: Fichar salida (manual o automática)
   */
  clockOut(): void {
    this.finishWork('Fichaje manual de salida');
  }

  /**
   * ✅ NUEVO: Finalizar trabajo (unificado)
   */
  private finishWork(reason: string): void {
    if (!this.activeClockIn || !this.currentUser) {
      this.error = 'No hay fichaje activo';
      return;
    }

    this.loading = true;
    this.error = '';
    this.showOvertimeDialog = false; // Cerrar cualquier diálogo

    // ✅ CRÍTICO: Validar formulario antes de enviar
    if (this.clockOutForm.invalid) {
      // Si el formulario es inválido, establecer valores por defecto
      this.clockOutForm.patchValue({
        tiempoDescanso: 60,
        notas: reason
      });
    }

    const formValues = this.clockOutForm.value;
    
    console.log('🚀 Finalizando trabajo:', reason);
    console.log('📊 Horas regulares:', this.regularHours.toFixed(2));
    console.log('📊 Horas extras:', this.overtimeHours.toFixed(2));
    console.log('📋 Valores del formulario:', formValues);
    
    this.workHoursService.clockOut(
      this.activeClockIn.reporteId, 
      formValues.tiempoDescanso || 60, 
      `${formValues.notas || ''} - ${reason}`
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.loading = false;
        
        if (response.success) {
          // ✅ LIMPIAR COMPLETAMENTE el estado
          this.clearClockStatusFromStorage();
          this.activeClockIn = null;
          this.regularHours = 0;
          this.overtimeHours = 0;
          this.isOvertimeActive = false;
          this.showOvertimeDialog = false;

          // ✅ CRÍTICO: Resetear formularios completamente
          this.resetAllForms();

          this.success = true;
          this.loadRecentWorkHours();

          setTimeout(() => { 
            this.success = false; 
          }, 5000);
          
          console.log('✅ Trabajo finalizado correctamente');
        } else {
          this.error = response.message || 'Error al finalizar fichaje';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.message || 'Error al procesar la solicitud';
        console.error('❌ Error finalizando trabajo:', error);
        
        // ✅ CRÍTICO: En caso de error, también limpiar el estado local
        // para permitir nuevo fichaje
        this.clearLocalStateOnError();
      }
    });
  }

  /**
   * ✅ NUEVO: Limpiar estado local en caso de error
   */
  private clearLocalStateOnError(): void {
    console.log('⚠️ Limpiando estado local debido a error');
    
    setTimeout(() => {
      this.clearClockStatusFromStorage();
      this.activeClockIn = null;
      this.regularHours = 0;
      this.overtimeHours = 0;
      this.isOvertimeActive = false;
      this.showOvertimeDialog = false;
      this.resetAllForms();
      
      console.log('🧹 Estado local limpiado - listo para nuevo fichaje');
    }, 3000); // Esperar 3 segundos para que el usuario vea el error
  }

  /**
   * ✅ NUEVO: Resetear todos los formularios
   */
  private resetAllForms(): void {
    // Resetear formulario de entrada
    this.clockInForm.reset({
      notas: ''
    });
    
    // Resetear formulario de salida
    this.clockOutForm.reset({
      tiempoDescanso: 60,
      notas: ''
    });
    
    // Limpiar estado de validación
    this.submitted = false;
    
    // Marcar formularios como pristine
    this.clockInForm.markAsPristine();
    this.clockInForm.markAsUntouched();
    this.clockOutForm.markAsPristine();
    this.clockOutForm.markAsUntouched();
  }

  /**
   * Cargar registros recientes de horas trabajadas
   */
  loadRecentWorkHours(): void {
    this.workHoursService.getRecentWorkDays(10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.recentWorkHours = response.data;
            console.log('✅ Registros recientes cargados:', this.recentWorkHours.length);
          }
        },
        error: (error) => {
          console.error('❌ Error cargando registros recientes:', error);
          this.recentWorkHours = [];
        }
      });
  }

  // ============ MÉTODOS DE CÁLCULO DE TIEMPO ============

  /**
   * ✅ MEJORADO: Calcular tiempo transcurrido con separación regular/extras
   */
  getElapsedTime(): string {
    if (!this.activeClockIn) return '';

    const totalHours = this.regularHours + this.overtimeHours;
    const hours = Math.floor(totalHours);
    const minutes = Math.floor((totalHours - hours) * 60);

    if (this.isOvertimeActive) {
      const regularHoursStr = Math.floor(this.regularHours) + 'h ' + Math.floor((this.regularHours - Math.floor(this.regularHours)) * 60) + 'm';
      const overtimeHoursStr = Math.floor(this.overtimeHours) + 'h ' + Math.floor((this.overtimeHours - Math.floor(this.overtimeHours)) * 60) + 'm';
      return `${regularHoursStr} + ${overtimeHoursStr} extra`;
    }

    return `${hours}h ${minutes}m`;
  }

  /**
   * ✅ NUEVO: Obtener tiempo restante hasta el próximo límite
   */
  getRemainingTime(): string {
    if (!this.activeClockIn) return '';
    
    if (!this.isOvertimeActive) {
      const remaining = this.MAX_REGULAR_HOURS - this.regularHours;
      if (remaining <= 0) return 'Límite alcanzado';
      
      const hours = Math.floor(remaining);
      const minutes = Math.floor((remaining - hours) * 60);
      return `${hours}h ${minutes}m hasta las 9h`;
    } else {
      const remaining = this.MAX_OVERTIME_HOURS - this.overtimeHours;
      if (remaining <= 0) return 'Límite extras alcanzado';
      
      const hours = Math.floor(remaining);
      const minutes = Math.floor((remaining - hours) * 60);
      return `${hours}h ${minutes}m de extras restantes`;
    }
  }

  /**
   * ✅ MEJORADO: Progreso de la jornada con horas extras
   */
  getWorkDayProgress(): number {
    if (!this.activeClockIn) return 0;
    
    if (!this.isOvertimeActive) {
      return Math.min(100, Math.round((this.regularHours / this.MAX_REGULAR_HOURS) * 100));
    } else {
      // En overtime, mostrar progreso de horas extras
      return Math.min(100, Math.round((this.overtimeHours / this.MAX_OVERTIME_HOURS) * 100));
    }
  }

  /**
   * ✅ MEJORADO: Verificar si se acerca al límite
   */
  isNearingLimit(): boolean {
    if (!this.activeClockIn) return false;
    
    if (!this.isOvertimeActive) {
      return this.regularHours >= this.WARNING_HOURS;
    } else {
      return this.overtimeHours >= (this.MAX_OVERTIME_HOURS - 1); // Advertir 1 hora antes
    }
  }

  /**
   * ✅ MEJORADO: Verificar si ha superado el límite
   */
  hasExceededLimit(): boolean {
    if (!this.activeClockIn) return false;
    
    if (!this.isOvertimeActive) {
      return this.regularHours >= this.MAX_REGULAR_HOURS;
    } else {
      return this.overtimeHours >= this.MAX_OVERTIME_HOURS;
    }
  }

  // ============ MÉTODOS DE UTILIDAD PARA LA VISTA ============

  refreshRecentWorkHours(): void {
    this.loadRecentWorkHours();
  }

  hasFieldError(fieldName: string, formGroup: FormGroup = this.clockInForm): boolean {
    const field = formGroup.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted) && !field.disabled);
  }

  getFieldError(fieldName: string, formGroup: FormGroup = this.clockInForm): string {
    const field = formGroup.get(fieldName);
    
    if (field?.errors) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} es requerido`;
      }
      if (field.errors['min']) {
        return `${this.getFieldLabel(fieldName)} debe ser mayor a ${field.errors['min'].min}`;
      }
      if (field.errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} no puede exceder ${field.errors['maxlength'].requiredLength} caracteres`;
      }
    }
    
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'tiempoDescanso': 'El tiempo de descanso',
      'notas': 'Las notas'
    };
    return labels[fieldName] || fieldName;
  }

  get isLoading(): boolean {
    return this.loading || this.loadingMasterData;
  }

  formatHours(hours: number): string {
    return `${hours.toFixed(1)}h`;
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'activo': 'badge-success',
      'pendiente': 'badge-warning',
      'completado': 'badge-secondary',
      'cancelado': 'badge-danger'
    };
    return statusClasses[status] || 'badge-secondary';
  }

  getTotalRecentHours(): number {
    return this.recentWorkHours.reduce((total, workHours) => total + workHours.totalHoras, 0);
  }

  canClockIn(): boolean {
    return !this.activeClockIn && !this.isLoading && !!this.currentUser;
  }

  canClockOut(): boolean {
    return !!this.activeClockIn && !this.isLoading && !this.showOvertimeDialog;
  }

  trackByWorkHours(index: number, workHours: WorkDay): string {
    return workHours.id?.toString() || index.toString();
  }

  editWorkHours(workHours: WorkDay): void {
    console.log('Editando registro:', workHours);
    // TODO: Implementar lógica de edición
  }

  deleteWorkHours(workHours: WorkDay): void {
    if (!workHours.id) return;
    
    if (confirm('¿Está seguro de que desea eliminar este registro?')) {
      this.loading = true;
      
      this.workHoursService.deleteWorkDay(workHours.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadRecentWorkHours();
              this.success = true;
              setTimeout(() => { this.success = false; }, 3000);
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

  // ============ MÉTODOS DE CALENDARIO ============

  getCurrentMonthYear(): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    return `${months[this.currentCalendarDate.getMonth()]} ${this.currentCalendarDate.getFullYear()}`;
  }

  previousMonth(): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() - 1,
      1
    );
  }

  nextMonth(): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() + 1,
      1
    );
  }

  getCalendarDays(): any[] {
    // Implementación existente del calendario
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const daysFromPrevMonth = firstDayOfWeek;
    const lastDayPrevMonth = new Date(year, month, 0).getDate();
    
    const calendarDays: any[] = [];
    
    // Días del mes anterior
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      calendarDays.push({
        dayNumber: lastDayPrevMonth - i,
        isCurrentMonth: false,
        isToday: false,
        date: new Date(year, month - 1, lastDayPrevMonth - i)
      });
    }
    
    // Días del mes actual
    const today = new Date();
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currentDate = new Date(year, month, day);
      const isToday = today.getFullYear() === year && 
                     today.getMonth() === month && 
                     today.getDate() === day;
      
      calendarDays.push({
        dayNumber: day,
        isCurrentMonth: true,
        isToday: isToday,
        date: currentDate,
        hasWorkHours: false, // TODO: Implementar verificación
        isPaymentDay: day === 15 || day === 30, // Ejemplo
        isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6
      });
    }
    
    // Completar hasta 42 días
    const remainingDays = 42 - calendarDays.length;
    for (let day = 1; day <= remainingDays; day++) {
      calendarDays.push({
        dayNumber: day,
        isCurrentMonth: false,
        isToday: false,
        date: new Date(year, month + 1, day)
      });
    }
    
    return calendarDays;
  }

  getLastPaymentDate(): Date | null {
    if (this.recentWorkHours.length === 0) return null;
    
    const lastWork = this.recentWorkHours
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
    
    return lastWork ? new Date(lastWork.fecha) : null;
  }

  getCurrentMonthHours(): number {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return this.recentWorkHours
      .filter(workDay => {
        const workDate = new Date(workDay.fecha);
        return workDate.getMonth() === currentMonth && workDate.getFullYear() === currentYear;
      })
      .reduce((total, workDay) => total + workDay.totalHoras, 0);
  }

  getPendingAmount(): number {
    const lastPaymentDate = this.getLastPaymentDate();
    
    if (!lastPaymentDate) {
      const totalHours = this.recentWorkHours
        .reduce((total, workDay) => total + workDay.totalHoras, 0);
      const hourlyRate = 6500;
      return totalHours * hourlyRate;
    }
    
    const pendingHours = this.recentWorkHours
      .filter(workDay => {
        const workDate = new Date(workDay.fecha);
        return workDate > lastPaymentDate;
      })
      .reduce((total, workDay) => total + workDay.totalHoras, 0);
    
    const hourlyRate = 6500;
    return pendingHours * hourlyRate;
  }

  trackByDay(index: number, day: any): string {
    return `${day.date.getTime()}-${day.isCurrentMonth}`;
  }

  getAverageHoursPerDay(): number {
    if (this.recentWorkHours.length === 0) return 0;
    
    const totalHours = this.recentWorkHours.reduce((total, workDay) => total + workDay.totalHoras, 0);
    const workingDays = this.recentWorkHours.length;
    
    return totalHours / workingDays;
  }

  // ============ MÉTODOS NUEVOS PARA HORAS EXTRAS ============

  /**
   * ✅ NUEVO: Verificar si está en modo horas extras
   */
  get isInOvertimeMode(): boolean {
    return this.activeClockIn?.isOvertimeMode || false;
  }

  /**
   * ✅ NUEVO: Obtener texto del estado actual
   */
  getCurrentWorkStatus(): string {
    if (!this.activeClockIn) return 'Sin fichaje';
    
    if (!this.activeClockIn.isActive && this.activeClockIn.autoStoppedAt9Hours) {
      return 'Pausado - Límite 9h alcanzado';
    }
    
    if (this.isInOvertimeMode) {
      return 'Horas extras activas';
    }
    
    return 'Jornada regular activa';
  }

  /**
   * ✅ NUEVO: Obtener clase CSS para el estado
   */
  getWorkStatusClass(): string {
    if (!this.activeClockIn) return '';
    
    if (!this.activeClockIn.isActive) return 'status-paused';
    if (this.isInOvertimeMode) return 'status-overtime';
    if (this.hasExceededLimit()) return 'status-danger';
    if (this.isNearingLimit()) return 'status-warning';
    
    return 'status-active';
  }

  /**
   * ✅ NUEVO: Forzar finalización de trabajo (para emergencias)
   */
  forceFinishWork(): void {
    if (confirm('¿Está seguro de que desea finalizar forzosamente el trabajo? Esta acción no se puede deshacer.')) {
      this.finishWork('Finalización forzosa por el usuario');
    }
  }

  /**
   * ✅ NUEVO: Verificar si se puede mostrar el botón de finalizar forzoso
   */
  canForceFinish(): boolean {
    return !!this.activeClockIn && !this.loading;
  }

  // ============ MÉTODOS DE DISPLAY PARA EL TEMPLATE ============

  /**
   * ✅ NUEVO: Mostrar horas extras formateadas
   */
  getOvertimeDisplay(): string {
    const hours = Math.floor(this.overtimeHours);
    const minutes = Math.floor((this.overtimeHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * ✅ NUEVO: Mostrar horas regulares formateadas
   */
  getRegularHoursDisplay(): string {
    const hours = Math.floor(this.regularHours);
    const minutes = Math.floor((this.regularHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * ✅ NUEVO: Mostrar total de horas trabajadas
   */
  getTotalWorkedDisplay(): string {
    const total = this.regularHours + this.overtimeHours;
    const hours = Math.floor(total);
    const minutes = Math.floor((total - hours) * 60);
    return `${hours}h ${minutes}m`;
  }
}