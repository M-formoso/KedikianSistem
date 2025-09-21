// work-hours.component.ts - COMPLETAMENTE CORREGIDO

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

// ✅ Interface para el estado local simplificado
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
  autoStoppedAt9Hours: boolean;
}

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
  
  // Registros recientes
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
  
  // ✅ Flag para controlar la sincronización
  private isSyncing = false;

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
    this.clockInForm = this.formBuilder.group({
      notas: ['', Validators.maxLength(200)]
    });

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
   * ✅ CRÍTICO: Verificar jornada activa - LÓGICA CORREGIDA
   */
  private checkForActiveJornada(): void {
    if (!this.currentUser?.id || this.isSyncing) return;

    const usuarioId = this.getUsuarioIdAsNumber();
    if (!usuarioId) return;

    this.isSyncing = true;
    console.log('🔍 Verificando jornada activa para usuario:', usuarioId);

    // PASO 1: Verificar SIEMPRE en el backend primero
    this.jornadaLaboralService.obtenerJornadaActiva(usuarioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('📥 Respuesta del backend:', response);
          
          if (response.success && response.data) {
            // HAY JORNADA ACTIVA EN EL BACKEND
            console.log('✅ Jornada activa encontrada en backend');
            this.processActiveJornada(response.data);
          } else {
            // NO HAY JORNADA ACTIVA EN EL BACKEND
            console.log('ℹ️ No hay jornada activa en el backend');
            this.clearJornadaState(); // Limpiar cualquier estado local
          }
          
          this.isSyncing = false;
        },
        error: (error) => {
          console.error('❌ Error verificando jornada activa:', error);
          this.isSyncing = false;
          
          // En caso de error de conexión, verificar localStorage como fallback
          this.checkLocalStorageFallback();
        }
      });
  }

  /**
   * ✅ NUEVO: Fallback para verificar localStorage solo en caso de error de conexión
   */
  private checkLocalStorageFallback(): void {
    const savedJornada = localStorage.getItem(this.JORNADA_STORAGE_KEY);
    if (savedJornada) {
      try {
        const parsed = JSON.parse(savedJornada);
        console.log('⚠️ Restaurando desde localStorage (modo offline):', parsed);
        this.restoreJornadaFromStorage(parsed);
        
        // Intentar sincronizar cuando se recupere la conexión
        setTimeout(() => {
          if (!this.isSyncing) {
            this.checkForActiveJornada();
          }
        }, 5000);
        
      } catch (error) {
        console.error('❌ Error parsing localStorage:', error);
        localStorage.removeItem(this.JORNADA_STORAGE_KEY);
      }
    }
  }

  /**
   * ✅ CRÍTICO: Procesar jornada activa del backend
   */
  private processActiveJornada(jornada: JornadaLaboralResponse): void {
    console.log('🔄 Procesando jornada activa:', jornada);
    
    this.currentJornada = jornada;
    
    // ✅ CRÍTICO: Verificar el estado real de la jornada
    const isReallyActive = jornada.estado === 'activa' || 
                          (jornada.estado === 'pausada' && !jornada.hora_fin);
    
    this.activeClockIn = {
      isActive: isReallyActive,
      startTime: this.formatearHora(jornada.hora_inicio),
      startTimestamp: new Date(jornada.hora_inicio),
      usuarioId: jornada.usuario_id,
      jornadaId: jornada.id,
      notas: jornada.notas_inicio,
      
      // Estados de horas extras
      isOvertimeMode: jornada.overtime_confirmado || false,
      overtimeStartTimestamp: jornada.overtime_iniciado ? new Date(jornada.overtime_iniciado) : undefined,
      regularHoursCompleted: jornada.limite_regular_alcanzado || false,
      autoStoppedAt9Hours: jornada.pausa_automatica || false
    };

    // ✅ CRÍTICO: Solo mostrar diálogo si está pausada esperando confirmación
    if (this.jornadaLaboralService.necesitaDialogoOvertimeEstatico(jornada)) {
      setTimeout(() => {
        this.showOvertimeConfirmation();
      }, 1000);
    }

    this.saveJornadaToStorage();
    this.updateCalculatedHours();
    
    console.log('✅ Jornada activa procesada:', {
      isActive: this.activeClockIn.isActive,
      estado: jornada.estado,
      horaFin: jornada.hora_fin
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
    if (!this.activeClockIn) return;

    const now = new Date();
    const diffMs = now.getTime() - this.activeClockIn.startTimestamp.getTime();
    this.totalHours = diffMs / (1000 * 60 * 60);

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
    if (!this.activeClockIn || !this.activeClockIn.isActive) return;

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
    if (!this.activeClockIn) return;

    console.log('⏸️ Pausando timer - límite de 9h alcanzado');
    
    this.activeClockIn.regularHoursCompleted = true;
    this.activeClockIn.autoStoppedAt9Hours = true;
    this.activeClockIn.isActive = false;
    
    this.showOvertimeConfirmation();
    this.saveJornadaToStorage();

    // ✅ CRÍTICO: Notificar al backend sobre la pausa automática
    if (this.currentJornada) {
      this.jornadaLaboralService.actualizarEstadoJornada(this.currentJornada.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.currentJornada = response.data;
              console.log('✅ Estado actualizado en backend');
            }
          },
          error: (error) => {
            console.error('❌ Error actualizando estado:', error);
          }
        });
    }
  }

  /**
   * ✅ CRÍTICO: Fichar entrada - CORREGIDO
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
            console.log('✅ Entrada fichada correctamente');
            this.processActiveJornada(response.data);
            this.success = true;
            this.resetForms();
            
            setTimeout(() => { this.success = false; }, 3000);
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
   * ✅ CRÍTICO: Fichar salida - COMPLETAMENTE CORREGIDO
   */
  clockOut(): void {
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
        notas: 'Fichaje manual de salida'
      });
    }

    const formValues = this.clockOutForm.value;
    
    console.log('🛑 Finalizando jornada ID:', this.activeClockIn.jornadaId);

    this.jornadaLaboralService.finalizarJornada(
      this.activeClockIn.jornadaId,
      formValues.tiempoDescanso || 60,
      formValues.notas || 'Fichaje manual de salida',
      undefined, // ubicación
      false // no forzado
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.loading = false;
        
        if (response.success) {
          console.log('✅ Jornada finalizada correctamente');
          
          // ✅ CRÍTICO: Limpiar estado COMPLETAMENTE
          this.clearJornadaState();
          
          this.success = true;
          this.loadRecentJornadas();
          this.loadMonthlyStats();
          
          setTimeout(() => { this.success = false; }, 5000);
        } else {
          this.error = response.message || 'Error al finalizar jornada';
          console.error('❌ Error en respuesta del backend:', response);
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.message || 'Error al procesar la solicitud';
        console.error('❌ Error finalizando jornada:', error);
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
          console.log('✅ Horas extras confirmadas');
          
          // Reactivar el timer
          if (this.activeClockIn) {
            this.activeClockIn.isActive = true;
            this.activeClockIn.isOvertimeMode = true;
            this.activeClockIn.overtimeStartTimestamp = new Date();
          }
          
          this.processActiveJornada(response.data);
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
          console.log('✅ Horas extras rechazadas y jornada finalizada');
          
          // ✅ CRÍTICO: Limpiar estado COMPLETAMENTE
          this.clearJornadaState();
          
          this.success = true;
          this.loadRecentJornadas();
          this.loadMonthlyStats();
          
          setTimeout(() => { this.success = false; }, 5000);
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
    
    if (!this.activeClockIn) return;

    this.loading = true;
    this.error = '';

    this.jornadaLaboralService.finalizarJornada(
      this.activeClockIn.jornadaId,
      60, // tiempo de descanso por defecto
      motivo,
      undefined, // ubicación
      true // forzado
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.loading = false;
        
        if (response.success) {
          console.log('✅ Jornada finalizada automáticamente');
          
          // ✅ CRÍTICO: Limpiar estado COMPLETAMENTE
          this.clearJornadaState();
          
          this.success = true;
          this.loadRecentJornadas();
          this.loadMonthlyStats();
          
          setTimeout(() => { this.success = false; }, 5000);
        } else {
          this.error = response.message || 'Error al finalizar jornada automáticamente';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.message || 'Error al finalizar jornada automáticamente';
        console.error('❌ Error en finalización automática:', error);
      }
    });
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
   * ✅ CRÍTICO: Limpiar estado de jornada - COMPLETAMENTE CORREGIDO
   */
  private clearJornadaState(): void {
    console.log('🧹 Limpiando estado de jornada completamente');
    
    // Limpiar localStorage PRIMERO
    localStorage.removeItem(this.JORNADA_STORAGE_KEY);
    
    // Limpiar estado del componente
    this.activeClockIn = null;
    this.currentJornada = null;
    this.regularHours = 0;
    this.overtimeHours = 0;
    this.totalHours = 0;
    this.showOvertimeDialog = false;
    
    // Resetear formularios
    this.resetForms();
    
    console.log('✅ Estado de jornada limpiado completamente');
  }

  /**
   * ✅ Guardar estado en localStorage
   */
  private saveJornadaToStorage(): void {
    if (this.activeClockIn) {
      const dataToSave = {
        ...this.activeClockIn,
        startTimestamp: this.activeClockIn.startTimestamp.toISOString(),
        overtimeStartTimestamp: this.activeClockIn.overtimeStartTimestamp?.toISOString(),
        lastSyncTimestamp: new Date().toISOString() // Para control de sincronización
      };
      
      localStorage.setItem(this.JORNADA_STORAGE_KEY, JSON.stringify(dataToSave));
      console.log('💾 Estado guardado en localStorage');
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
      autoStoppedAt9Hours: saved.autoStoppedAt9Hours || false
    };

    console.log('✅ Estado de jornada restaurado desde localStorage');
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
    if (!this.activeClockIn) return '';

    const totalHours = this.regularHours + this.overtimeHours;
    const hours = Math.floor(totalHours);
    const minutes = Math.floor((totalHours - hours) * 60);

    if (this.isInOvertimeMode) {
      const regularHoursStr = Math.floor(this.regularHours) + 'h ' + 
        Math.floor((this.regularHours - Math.floor(this.regularHours)) * 60) + 'm';
      const overtimeHoursStr = Math.floor(this.overtimeHours) + 'h ' + 
        Math.floor((this.overtimeHours - Math.floor(this.overtimeHours)) * 60) + 'm';
      return