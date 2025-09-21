// work-hours.component.ts - CONECTADO CON JORNADA LABORAL BACKEND

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil, interval } from 'rxjs';
import { 
  JornadaLaboralService,
  JornadaLaboralResponse,
  EstadisticasJornada
} from '../../../core/services/jornada-laboral.service';
import { AuthService, Usuario } from '../../../core/services/auth.service';

// ✅ Interface para el estado local del componente
interface LocalJornadaState {
  isActive: boolean;
  startTime: string;
  startTimestamp: Date;
  usuarioId: number;
  jornadaId: number;
  notas?: string;
  
  // Estados de horas extras
  isOvertimeMode: boolean;
  overtimeStartTimestamp?: Date;
  regularHoursCompleted: boolean;
  showOvertimeDialog: boolean;
  autoStoppedAt9Hours: boolean;
}

// ✅ Interface para los datos del calendario
interface CalendarDay {
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  date: Date;
  hasWorkHours: boolean;
  workHours?: number;
  isPaymentDay: boolean;
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
  
  // ✅ Estado de jornada laboral actual
  activeClockIn: LocalJornadaState | null = null;
  currentJornada: JornadaLaboralResponse | null = null;
  
  // ✅ Control de horas extras
  showOvertimeDialog = false;
  
  // Cálculos de tiempo en tiempo real
  regularHours = 0;
  overtimeHours = 0;
  totalHours = 0;
  
  // Usuario actual
  currentUser: Usuario | null = null;
  
  // Registros recientes (adaptados del backend)
  recentWorkHours: any[] = [];
  
  // Estadísticas del mes
  monthlyStats: EstadisticasJornada | null = null;
  
  // Propiedad para manejo del calendario
  private currentCalendarDate = new Date();
  
  // Para cancelar suscripciones
  private destroy$ = new Subject<void>();
  
  // ✅ Constantes de configuración
  private readonly MAX_REGULAR_HOURS = 9;
  private readonly WARNING_HOURS = 8;
  private readonly MAX_OVERTIME_HOURS = 4;
  private readonly JORNADA_STORAGE_KEY = 'activeJornadaLaboral';

  constructor(
    private formBuilder: FormBuilder,
    private jornadaLaboralService: JornadaLaboralService,
    private authService: AuthService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.checkForActiveJornada();
    this.loadRecentJornadas();
    this.loadMonthlyStats();
    this.setupMobileTable();
    this.startClockUpdate();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    // Formulario para fichar entrada
    this.clockInForm = this.formBuilder.group({
      notas: ['', Validators.maxLength(200)]
    });

    // Formulario para fichar salida
    this.clockOutForm = this.formBuilder.group({
      tiempoDescanso: [60, [Validators.required, Validators.min(0), Validators.max(120)]],
      notas: ['', Validators.maxLength(500)]
    });
  }

  /**
   * ✅ Cargar usuario actual
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

  /**
   * ✅ Verificar si hay una jornada activa
   */
  private checkForActiveJornada(): void {
    if (!this.currentUser?.id) return;

    const usuarioId = this.getUsuarioIdAsNumber();
    if (!usuarioId) return;

    // Verificar localStorage primero
    const savedJornada = localStorage.getItem(this.JORNADA_STORAGE_KEY);
    if (savedJornada) {
      try {
        const parsed = JSON.parse(savedJornada);
        this.restoreJornadaFromStorage(parsed);
        // Verificar estado actual en el backend
        this.syncWithBackend(parsed.jornadaId);
        return;
      } catch (error) {
        console.error('❌ Error parsing localStorage jornada:', error);
        localStorage.removeItem(this.JORNADA_STORAGE_KEY);
      }
    }

    // Si no hay en localStorage, verificar en el backend
    this.checkActiveJornadaInBackend(usuarioId);
  }

  /**
   * ✅ Verificar jornada activa en el backend
   */
  private checkActiveJornadaInBackend(usuarioId: number): void {
    this.jornadaLaboralService.obtenerJornadaActiva(usuarioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.processActiveJornada(response.data);
          } else {
            console.log('ℹ️ No hay jornada activa en el backend');
          }
        },
        error: (error) => {
          console.error('❌ Error verificando jornada activa:', error);
        }
      });
  }

  /**
   * ✅ Procesar jornada activa del backend
   */
  private processActiveJornada(jornada: JornadaLaboralResponse): void {
    this.currentJornada = jornada;
    
    this.activeClockIn = {
      isActive: jornada.estado === 'activa',
      startTime: this.formatearHora(jornada.hora_inicio),
      startTimestamp: new Date(jornada.hora_inicio),
      usuarioId: jornada.usuario_id,
      jornadaId: jornada.id,
      notas: jornada.notas_inicio,
      
      // Estados de horas extras
      isOvertimeMode: jornada.overtime_confirmado,
      overtimeStartTimestamp: jornada.overtime_iniciado ? new Date(jornada.overtime_iniciado) : undefined,
      regularHoursCompleted: jornada.limite_regular_alcanzado,
      showOvertimeDialog: false,
      autoStoppedAt9Hours: jornada.pausa_automatica
    };

    // Verificar si necesita mostrar diálogo de overtime
    if (this.jornadaLaboralService.necesitaDialogoOvertimeEstatico(jornada)) {
      setTimeout(() => {
        this.showOvertimeConfirmation();
      }, 1000);
    }

    this.saveJornadaToStorage();
    this.updateCalculatedHours();
    
    console.log('✅ Jornada activa procesada:', this.activeClockIn);
  }

  /**
   * ✅ Sincronizar con backend
   */
  private syncWithBackend(jornadaId: number): void {
    this.jornadaLaboralService.actualizarEstadoJornada(jornadaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.processActiveJornada(response.data);
          }
        },
        error: (error) => {
          console.error('❌ Error sincronizando con backend:', error);
        }
      });
  }

  /**
   * ✅ Actualizar reloj en tiempo real
   */
  private startClockUpdate(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.activeClockIn && this.activeClockIn.isActive) {
          this.updateCalculatedHours();
          this.checkTimeConstraints();
        }
      });
  }

  /**
   * ✅ Actualizar horas calculadas
   */
  private updateCalculatedHours(): void {
    if (!this.activeClockIn || !this.currentJornada) return;

    const tiempoTranscurrido = this.jornadaLaboralService.calcularTiempoTranscurrido(
      this.currentJornada.hora_inicio,
      this.currentJornada.hora_fin
    );

    this.totalHours = tiempoTranscurrido.totalMinutos / 60;

    // Calcular horas regulares y extras
    if (this.totalHours <= this.MAX_REGULAR_HOURS) {
      this.regularHours = this.totalHours;
      this.overtimeHours = 0;
    } else {
      this.regularHours = this.MAX_REGULAR_HOURS;
      this.overtimeHours = this.totalHours - this.MAX_REGULAR_HOURS;
    }
  }

  /**
   * ✅ Verificar límites de tiempo
   */
  private checkTimeConstraints(): void {
    if (!this.activeClockIn || !this.currentJornada) return;

    // Si alcanzó las 9 horas y no está en modo overtime
    if (this.regularHours >= this.MAX_REGULAR_HOURS && 
        !this.activeClockIn.regularHoursCompleted && 
        !this.showOvertimeDialog) {
      
      this.pauseTimerAndShowDialog();
    }

    // Si supera las horas extras máximas
    if (this.overtimeHours >= this.MAX_OVERTIME_HOURS) {
      this.autoFinishJornada('Se alcanzó el límite máximo de horas extras (4h)');
    }
  }

  /**
   * ✅ Pausar timer y mostrar diálogo
   */
  private pauseTimerAndShowDialog(): void {
    if (this.activeClockIn) {
      this.activeClockIn.regularHoursCompleted = true;
      this.activeClockIn.autoStoppedAt9Hours = true;
      this.activeClockIn.isActive = false;
      this.showOvertimeConfirmation();
      this.saveJornadaToStorage();
    }
  }

  /**
   * ✅ Fichar entrada
   */
  clockIn(): void {
    if (!this.currentUser?.id) {
      this.error = 'Usuario no disponible';
      return;
    }

    const usuarioId = this.getUsuarioIdAsNumber();
    if (!usuarioId) return;

    this.loading = true;
    this.error = '';
    this.success = false;

    const formValues = this.clockInForm.value;
    
    console.log('🚀 Fichando entrada para usuario:', usuarioId);

    this.jornadaLaboralService.ficharEntrada(usuarioId, formValues.notas)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          
          if (response.success && response.data) {
            this.processActiveJornada(response.data);
            this.success = true;
            this.resetForms();
            
            setTimeout(() => { this.success = false; }, 3000);
            console.log('✅ Entrada fichada correctamente');
          } else {
            this.error = response.message || 'Error al registrar entrada';
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
   * ✅ Fichar salida
   */
  clockOut(): void {
    this.finishJornada('Fichaje manual de salida');
  }

  /**
   * ✅ Finalizar jornada
   */
  private finishJornada(motivo: string, forzado: boolean = false): void {
    if (!this.activeClockIn || !this.currentJornada) {
      this.error = 'No hay jornada activa';
      return;
    }

    this.loading = true;
    this.error = '';
    this.showOvertimeDialog = false;

    // Validar formulario
    if (this.clockOutForm.invalid) {
      this.clockOutForm.patchValue({
        tiempoDescanso: 60,
        notas: motivo
      });
    }

    const formValues = this.clockOutForm.value;
    
    console.log('🚀 Finalizando jornada:', motivo);

    this.jornadaLaboralService.finalizarJornada(
      this.activeClockIn.jornadaId,
      formValues.tiempoDescanso || 60,
      `${formValues.notas || ''} - ${motivo}`,
      undefined, // ubicación
      forzado
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.loading = false;
        
        if (response.success) {
          this.clearJornadaState();
          this.success = true;
          this.loadRecentJornadas();
          this.loadMonthlyStats();
          
          setTimeout(() => { this.success = false; }, 5000);
          console.log('✅ Jornada finalizada correctamente');
        } else {
          this.error = response.message || 'Error al finalizar jornada';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.message || 'Error al procesar la solicitud';
        console.error('❌ Error finalizando jornada:', error);
        
        // En caso de error, limpiar estado después de un tiempo
        setTimeout(() => this.clearLocalStateOnError(), 3000);
      }
    });
  }

  /**
   * ✅ Confirmar horas extras
   */
  confirmOvertime(): void {
    if (!this.activeClockIn) return;

    this.showOvertimeDialog = false;
    this.loading = true;

    this.jornadaLaboralService.confirmarHorasExtras(
      this.activeClockIn.jornadaId,
      'Horas extras confirmadas por el usuario'
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.loading = false;
        
        if (response.success && response.data) {
          this.processActiveJornada(response.data);
          console.log('✅ Horas extras confirmadas');
        } else {
          this.error = response.message || 'Error al confirmar horas extras';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.message || 'Error al confirmar horas extras';
        console.error('❌ Error confirmando horas extras:', error);
      }
    });
  }

  /**
   * ✅ Rechazar horas extras
   */
  declineOvertime(): void {
    if (!this.activeClockIn) return;

    this.showOvertimeDialog = false;
    this.loading = true;

    // Completar formulario antes de finalizar
    this.clockOutForm.patchValue({
      tiempoDescanso: this.clockOutForm.get('tiempoDescanso')?.value || 60,
      notas: (this.clockOutForm.get('notas')?.value || '') + ' - Finalizado al completar 9 horas regulares'
    });

    this.jornadaLaboralService.rechazarHorasExtras(
      this.activeClockIn.jornadaId,
      this.clockOutForm.get('tiempoDescanso')?.value || 60,
      this.clockOutForm.get('notas')?.value || 'Trabajo finalizado al completar 9 horas regulares'
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.loading = false;
        
        if (response.success) {
          this.clearJornadaState();
          this.success = true;
          this.loadRecentJornadas();
          this.loadMonthlyStats();
          
          setTimeout(() => { this.success = false; }, 5000);
          console.log('✅ Horas extras rechazadas y jornada finalizada');
        } else {
          this.error = response.message || 'Error al rechazar horas extras';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.message || 'Error al rechazar horas extras';
        console.error('❌ Error rechazando horas extras:', error);
      }
    });
  }

  /**
   * ✅ Finalización automática
   */
  private autoFinishJornada(motivo: string): void {
    console.log('🛑 Finalizando jornada automáticamente:', motivo);
    this.finishJornada(motivo, true);
  }

  /**
   * ✅ Mostrar diálogo de confirmación de horas extras
   */
  private showOvertimeConfirmation(): void {
    this.showOvertimeDialog = true;
    this.success = false;
    this.error = '';
  }

  /**
   * ✅ Cargar jornadas recientes
   */
  private loadRecentJornadas(): void {
    if (!this.currentUser?.id) return;

    const usuarioId = this.getUsuarioIdAsNumber();
    if (!usuarioId) return;

    this.jornadaLaboralService.obtenerJornadasUsuario(usuarioId, 10, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Transformar datos del backend al formato esperado por el template
            this.recentWorkHours = response.data.map(jornada => 
              this.transformJornadaForDisplay(jornada)
            );
            console.log('✅ Jornadas recientes cargadas:', this.recentWorkHours.length);
          }
        },
        error: (error) => {
          console.error('❌ Error cargando jornadas recientes:', error);
          this.recentWorkHours = [];
        }
      });
  }

  /**
   * ✅ Cargar estadísticas del mes
   */
  private loadMonthlyStats(): void {
    if (!this.currentUser?.id) return;

    const usuarioId = this.getUsuarioIdAsNumber();
    if (!usuarioId) return;

    const now = new Date();
    const mes = now.getMonth() + 1;
    const anio = now.getFullYear();

    this.jornadaLaboralService.obtenerEstadisticasMes(usuarioId, mes, anio)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.monthlyStats = response.data;
            console.log('✅ Estadísticas del mes cargadas:', this.monthlyStats);
          }
        },
        error: (error) => {
          console.error('❌ Error cargando estadísticas del mes:', error);
        }
      });
  }

  /**
   * ✅ Transformar jornada para mostrar en el template
   */
  private transformJornadaForDisplay(jornada: JornadaLaboralResponse): any {
    return {
      id: jornada.id,
      fecha: jornada.fecha,
      horaInicio: this.formatearHora(jornada.hora_inicio),
      horaFin: jornada.hora_fin ? this.formatearHora(jornada.hora_fin) : null,
      tiempoDescanso: jornada.tiempo_descanso,
      totalHoras: jornada.total_horas,
      horasRegulares: jornada.horas_regulares,
      horasExtras: jornada.horas_extras,
      estado: this.mapEstado(jornada.estado),
      esFeriado: jornada.es_feriado,
      notasInicio: jornada.notas_inicio,
      notasFin: jornada.notas_fin
    };
  }

  /**
   * ✅ Mapear estado para mostrar en español
   */
  private mapEstado(estado: string): string {
    const estadoMap: { [key: string]: string } = {
      'activa': 'Activa',
      'pausada': 'Pausada',
      'completada': 'Completada',
      'cancelada': 'Cancelada'
    };
    return estadoMap[estado] || estado;
  }

  // ============ MÉTODOS DE GESTIÓN DE ESTADO ============

  /**
   * ✅ Guardar estado en localStorage
   */
  private saveJornadaToStorage(): void {
    if (this.activeClockIn) {
      localStorage.setItem(this.JORNADA_STORAGE_KEY, JSON.stringify({
        ...this.activeClockIn,
        startTimestamp: this.activeClockIn.startTimestamp.toISOString(),
        overtimeStartTimestamp: this.activeClockIn.overtimeStartTimestamp?.toISOString()
      }));
    }
  }

  /**
   * ✅ Restaurar estado desde localStorage
   */
  private restoreJornadaFromStorage(saved: any): void {
    this.activeClockIn = {
      isActive: saved.isActive !== false,
      startTime: saved.startTime,
      startTimestamp: new Date(saved.startTimestamp),
      usuarioId: saved.usuarioId,
      jornadaId: saved.jornadaId,
      notas: saved.notas,
      
      // Estados de horas extras
      isOvertimeMode: saved.isOvertimeMode || false,
      overtimeStartTimestamp: saved.overtimeStartTimestamp ? new Date(saved.overtimeStartTimestamp) : undefined,
      regularHoursCompleted: saved.regularHoursCompleted || false,
      showOvertimeDialog: false,
      autoStoppedAt9Hours: saved.autoStoppedAt9Hours || false
    };

    console.log('✅ Estado de jornada restaurado desde localStorage');
  }

  /**
   * ✅ Limpiar estado de jornada
   */
  private clearJornadaState(): void {
    localStorage.removeItem(this.JORNADA_STORAGE_KEY);
    this.activeClockIn = null;
    this.currentJornada = null;
    this.regularHours = 0;
    this.overtimeHours = 0;
    this.totalHours = 0;
    this.showOvertimeDialog = false;
    this.resetForms();
    
    console.log('🧹 Estado de jornada limpiado');
  }

  /**
   * ✅ Limpiar estado local en caso de error
   */
  private clearLocalStateOnError(): void {
    console.log('⚠️ Limpiando estado local debido a error');
    
    this.clearJornadaState();
    console.log('🧹 Estado local limpiado - listo para nueva jornada');
  }

  /**
   * ✅ Resetear formularios
   */
  private resetForms(): void {
    this.clockInForm.reset({ notas: '' });
    this.clockOutForm.reset({ tiempoDescanso: 60, notas: '' });
    this.submitted = false;
    
    this.clockInForm.markAsPristine();
    this.clockInForm.markAsUntouched();
    this.clockOutForm.markAsPristine();
    this.clockOutForm.markAsUntouched();
  }

  // ============ MÉTODOS DE UTILIDAD ============

  /**
   * ✅ Obtener ID de usuario como número
   */
  private getUsuarioIdAsNumber(): number | null {
    if (!this.currentUser?.id) return null;
    
    const usuarioId = typeof this.currentUser.id === 'string' 
      ? parseInt(this.currentUser.id, 10) 
      : Number(this.currentUser.id);

    if (isNaN(usuarioId)) {
      this.error = 'ID de usuario inválido';
      return null;
    }

    return usuarioId;
  }

  /**
   * ✅ Formatear hora para mostrar
   */
  private formatearHora(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  setupMobileTable(): void {
    // Implementación futura para tabla responsiva
  }

  // ============ MÉTODOS PARA EL TEMPLATE ============

  /**
   * ✅ Calcular tiempo transcurrido para mostrar
   */
  getElapsedTime(): string {
    if (!this.activeClockIn || !this.currentJornada) return '';

    const totalHours = this.regularHours + this.overtimeHours;
    const hours = Math.floor(totalHours);
    const minutes = Math.floor((totalHours - hours) * 60);

    if (this.isInOvertimeMode) {
      const regularHoursStr = Math.floor(this.regularHours) + 'h ' + 
        Math.floor((this.regularHours - Math.floor(this.regularHours)) * 60) + 'm';
      const overtimeHoursStr = Math.floor(this.overtimeHours) + 'h ' + 
        Math.floor((this.overtimeHours - Math.floor(this.overtimeHours)) * 60) + 'm';
      return `${regularHoursStr} + ${overtimeHoursStr} extra`;
    }

    return `${hours}h ${minutes}m`;
  }

  /**
   * ✅ Calcular tiempo restante
   */
  getRemainingTime(): string {
    if (!this.activeClockIn) return '';
    
    if (!this.isInOvertimeMode) {
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
   * ✅ Progreso de la jornada
   */
  getWorkDayProgress(): number {
    if (!this.activeClockIn) return 0;
    
    return this.jornadaLaboralService.calcularProgresoJornada(
      this.totalHours, 
      this.isInOvertimeMode
    );
  }

  /**
   * ✅ Verificar si se acerca al límite
   */
  isNearingLimit(): boolean {
    if (!this.activeClockIn) return false;
    
    return this.jornadaLaboralService.estaCercaDelLimite(
      this.totalHours, 
      this.isInOvertimeMode
    );
  }

  /**
   * ✅ Verificar si ha superado el límite
   */
  hasExceededLimit(): boolean {
    if (!this.activeClockIn) return false;
    
    return this.jornadaLaboralService.haExcedidoLimite(this.totalHours);
  }

  /**
   * ✅ Verificar si está en modo horas extras
   */
  get isInOvertimeMode(): boolean {
    return this.activeClockIn?.isOvertimeMode || false;
  }

  /**
   * ✅ Obtener estado actual del trabajo
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
   * ✅ Obtener clase CSS para el estado
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
   * ✅ Mostrar horas extras formateadas
   */
  getOvertimeDisplay(): string {
    const hours = Math.floor(this.overtimeHours);
    const minutes = Math.floor((this.overtimeHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * ✅ Mostrar horas regulares formateadas
   */
  getRegularHoursDisplay(): string {
    const hours = Math.floor(this.regularHours);
    const minutes = Math.floor((this.regularHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * ✅ Mostrar total de horas trabajadas
   */
  getTotalWorkedDisplay(): string {
    const total = this.regularHours + this.overtimeHours;
    const hours = Math.floor(total);
    const minutes = Math.floor((total - hours) * 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * ✅ Finalización forzosa
   */
  forceFinishWork(): void {
    if (confirm('¿Está seguro de que desea finalizar forzosamente el trabajo? Esta acción no se puede deshacer.')) {
      this.finishJornada('Finalización forzosa por el usuario', true);
    }
  }

  // ============ MÉTODOS DE VALIDACIÓN ============

  canClockIn(): boolean {
    return !this.activeClockIn && !this.loading && !!this.currentUser;
  }

  canClockOut(): boolean {
    return !!this.activeClockIn && !this.loading && !this.showOvertimeDialog;
  }

  canForceFinish(): boolean {
    return !!this.activeClockIn && !this.loading;
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
      if (field.errors['max']) {
        return `${this.getFieldLabel(fieldName)} debe ser menor a ${field.errors['max'].max}`;
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

  // ============ MÉTODOS DE GESTIÓN DE REGISTROS ============

  refreshRecentWorkHours(): void {
    this.loadRecentJornadas();
  }

  formatHours(hours: number): string {
    return `${hours.toFixed(1)}h`;
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'Activa': 'badge-success',
      'Pausada': 'badge-warning',
      'Completada': 'badge-secondary',
      'Cancelada': 'badge-danger'
    };
    return statusClasses[status] || 'badge-secondary';
  }

  getTotalRecentHours(): number {
    return this.recentWorkHours.reduce((total, workHours) => total + (workHours.totalHoras || 0), 0);
  }

  getAverageHoursPerDay(): number {
    if (this.recentWorkHours.length === 0) return 0;
    
    const totalHours = this.getTotalRecentHours();
    const workingDays = this.recentWorkHours.length;
    
    return totalHours / workingDays;
  }

  trackByWorkHours(index: number, workHours: any): string {
    return workHours.id?.toString() || index.toString();
  }

  editWorkHours(workHours: any): void {
    console.log('Editando jornada:', workHours);
    // TODO: Implementar lógica de edición si es necesario
  }

  deleteWorkHours(workHours: any): void {
    console.log('Eliminar jornada:', workHours);
    // TODO: Implementar eliminación si es necesario
    // Nota: Generalmente las jornadas laborales no se eliminan por auditoría
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
    this.loadMonthlyStats(); // Recargar estadísticas del nuevo mes
  }

  nextMonth(): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() + 1,
      1
    );
    this.loadMonthlyStats(); // Recargar estadísticas del nuevo mes
  }

  getCalendarDays(): CalendarDay[] {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const daysFromPrevMonth = firstDayOfWeek;
    const lastDayPrevMonth = new Date(year, month, 0).getDate();
    
    const calendarDays: CalendarDay[] = [];
    
    // Días del mes anterior
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      calendarDays.push({
        dayNumber: lastDayPrevMonth - i,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: false,
        date: new Date(year, month - 1, lastDayPrevMonth - i),
        hasWorkHours: false,
        isPaymentDay: false
      });
    }
    
    // Días del mes actual
    const today = new Date();
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currentDate = new Date(year, month, day);
      const isToday = today.getFullYear() === year && 
                     today.getMonth() === month && 
                     today.getDate() === day;
      
      // Buscar si hay trabajo para este día
      const workForDay = this.monthlyStats?.jornadas.find(jornada => {
        const jornadaDate = new Date(jornada.fecha);
        return jornadaDate.getDate() === day;
      });

      calendarDays.push({
        dayNumber: day,
        isCurrentMonth: true,
        isToday: isToday,
        isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
        date: currentDate,
        hasWorkHours: !!workForDay,
        workHours: workForDay?.total_horas,
        isPaymentDay: day === 15 || day === 30 // Ejemplo: días de pago
      });
    }
    
    // Completar hasta 42 días (6 semanas)
    const remainingDays = 42 - calendarDays.length;
    for (let day = 1; day <= remainingDays; day++) {
      calendarDays.push({
        dayNumber: day,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: false,
        date: new Date(year, month + 1, day),
        hasWorkHours: false,
        isPaymentDay: false
      });
    }
    
    return calendarDays;
  }

  getLastPaymentDate(): Date | null {
    // TODO: Implementar lógica de fechas de pago reales
    if (this.recentWorkHours.length === 0) return null;
    
    const lastWork = this.recentWorkHours
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
    
    return lastWork ? new Date(lastWork.fecha) : null;
  }

  getCurrentMonthHours(): number {
    return this.monthlyStats?.total_horas || 0;
  }

  getPendingAmount(): number {
    // TODO: Implementar cálculo real de monto pendiente
    const totalHours = this.getCurrentMonthHours();
    const hourlyRate = 6500; // Tarifa por hora base
    return totalHours * hourlyRate;
  }

  trackByDay(index: number, day: CalendarDay): string {
    return `${day.date.getTime()}-${day.isCurrentMonth}`;
  }
}