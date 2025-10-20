// work-hours.component.ts - VERSIÓN COMPLETA CORREGIDA CON SINCRONIZACIÓN

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
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { TableFiltersComponent, FilterConfig } from '../../../shared/components/table-filters/table-filters.component';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  estado: boolean;
  roles: string[];
}

interface LocalJornadaState {
  isActive: boolean;
  startTime: string;
  startTimestamp: Date;
  usuarioId: number;
  jornadaId: number;
  notas?: string;
  
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
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, TableFiltersComponent],
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
  autoFinalizationTimer: any = null;
  hasShownOvertimeDialog = false;
  
  // Cálculos de tiempo en tiempo real
  regularHours = 0;
  overtimeHours = 0;
  totalHours = 0;
  
  // Usuario actual
  currentUser: Usuario | null = null;
  
  // Registros recientes
  recentWorkHours: any[] = [];
  filteredWorkHours: any[] = [];
  activeFilters: any = {};
  
  // ✅ NUEVO: Control de sincronización
  private syncInterval: any = null;
  private readonly SYNC_INTERVAL_MS = 30000; // 30 segundos
  lastSyncTime: Date | null = null;
  isLoadingActiveJornada = false;
  
  // Filtros de tabla
  filterConfigs: FilterConfig[] = [
    {
      key: 'fecha',
      label: 'Fecha',
      type: 'dateRange'
    },
    {
      key: 'estado',
      label: 'Estado',
      type: 'select',
      options: [
        { value: 'Activa', label: 'Activa' },
        { value: 'Pausada', label: 'Pausada' },
        { value: 'Completada', label: 'Completada' },
        { value: 'Cancelada', label: 'Cancelada' }
      ]
    },
    {
      key: 'horasMin',
      label: 'Horas mínimas',
      type: 'text',
      placeholder: 'ej: 5'
    },
    {
      key: 'horasMax',
      label: 'Horas máximas',
      type: 'text',
      placeholder: 'ej: 10'
    },
    {
      key: 'tieneExtras',
      label: 'Horas Extras',
      type: 'select',
      options: [
        { value: 'si', label: 'Con horas extras' },
        { value: 'no', label: 'Sin horas extras' }
      ]
    }
  ];
  
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
  private readonly MAX_TOTAL_HOURS = 13;
  private readonly JORNADA_STORAGE_KEY = 'activeJornadaLaboral';
  private readonly AUTO_FINISH_TIMEOUT = 10 * 60 * 1000; // 10 minutos
  
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
    
    if (!environment.production) {
      setTimeout(() => this.debugBackendStatus(), 1000);
    }
    
    // ✅ CRÍTICO: Sincronizar estado inmediatamente
    this.syncActiveJornadaState();
    
    // ✅ CRÍTICO: Configurar sincronización periódica
    this.startPeriodicSync();
    
    this.loadRecentJornadas();
    this.loadMonthlyStats();
    this.setupMobileTable();
    this.startClockUpdate();
  }

  ngOnDestroy(): void {
    // Limpiar timers
    if (this.autoFinalizationTimer) {
      clearTimeout(this.autoFinalizationTimer);
    }
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
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

  // ============ MÉTODOS DE SINCRONIZACIÓN ============

  /**
   * ✅ NUEVO: Sincronizar estado de jornada activa con el backend
   */
  syncActiveJornadaState(): void {
    if (!this.currentUser?.id || this.isLoadingActiveJornada) return;

    const usuarioId = this.getUsuarioIdAsNumber();
    if (!usuarioId) return;

    this.isLoadingActiveJornada = true;
    console.log('🔄 Sincronizando estado de jornada activa...');

    this.jornadaLaboralService.obtenerJornadaActiva(usuarioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoadingActiveJornada = false;
          this.lastSyncTime = new Date();
          
          console.log('📥 Respuesta de sincronización:', response);
          
          if (response.success && response.data) {
            console.log('✅ Jornada activa encontrada - Restaurando estado');
            this.processActiveJornada(response.data);
            
            // ✅ Verificar si necesita mostrar diálogo de horas extras
            if (this.activeClockIn?.regularHoursCompleted && 
                !this.activeClockIn?.isOvertimeMode && 
                !this.hasShownOvertimeDialog) {
              console.log('💬 Mostrando diálogo de horas extras (después de sincronización)');
              this.scheduleOvertimeDecision();
            }
          } else {
            console.log('ℹ️ No hay jornada activa - Limpiando estado');
            if (this.activeClockIn) {
              this.clearJornadaState();
            }
          }
        },
        error: (error) => {
          this.isLoadingActiveJornada = false;
          console.error('❌ Error sincronizando jornada:', error);
          
          if (this.activeClockIn) {
            console.log('⚠️ Error de sincronización - Manteniendo estado local');
          }
        }
      });
  }

  /**
   * ✅ NUEVO: Iniciar sincronización periódica
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.activeClockIn && !this.isSyncing) {
        console.log('⏰ Sincronización periódica automática');
        this.syncActiveJornadaState();
      }
    }, this.SYNC_INTERVAL_MS);

    console.log('✅ Sincronización periódica configurada (cada 30s)');
  }

  /**
   * ✅ NUEVO: Obtener texto de última sincronización
   */
  getLastSyncText(): string {
    if (!this.lastSyncTime) return 'Nunca';
    
    const now = new Date();
    const diffMs = now.getTime() - this.lastSyncTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) return `Hace ${diffSeconds}s`;
    
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `Hace ${diffMinutes}m`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    return `Hace ${diffHours}h`;
  }

  // ============ MÉTODOS DE GESTIÓN DE USUARIO ============

  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.error = 'No se pudo cargar la información del usuario. Inicie sesión nuevamente.';
      this.authService.cerrarSesion();
    } else {
      console.log('✅ Usuario actual cargado:', this.currentUser);
    }
  }

  // ============ MÉTODOS DE PROCESAMIENTO DE JORNADA ============

  /**
   * ✅ MEJORADO: Procesar jornada activa con mejor manejo de estado
   */
  private processActiveJornada(jornada: JornadaLaboralResponse): void {
    console.log('🔄 Procesando jornada activa:', jornada);
    
    this.currentJornada = jornada;
    
    const isReallyActive = jornada.estado === 'activa' || 
                          (jornada.estado === 'pausada' && !jornada.hora_fin);
    
    if (!isReallyActive) {
      console.log('⚠️ Jornada no está activa, limpiando estado');
      this.clearJornadaState();
      return;
    }
    
    this.activeClockIn = {
      isActive: jornada.estado === 'activa',
      startTime: this.formatearHora(jornada.hora_inicio),
      startTimestamp: new Date(jornada.hora_inicio),
      usuarioId: jornada.usuario_id,
      jornadaId: jornada.id,
      notas: jornada.notas_inicio,
      
      isOvertimeMode: jornada.overtime_confirmado || false,
      overtimeStartTimestamp: jornada.overtime_iniciado ? new Date(jornada.overtime_iniciado) : undefined,
      regularHoursCompleted: jornada.limite_regular_alcanzado || false,
      autoStoppedAt9Hours: jornada.pausa_automatica || false
    };

    this.saveJornadaToStorage();
    this.updateCalculatedHours();
    
    if (this.activeClockIn.regularHoursCompleted && 
        !this.activeClockIn.isOvertimeMode && 
        !this.hasShownOvertimeDialog) {
      console.log('💬 Programando decisión de horas extras');
      this.scheduleOvertimeDecision();
    }
    
    console.log('✅ Estado de jornada activa procesado y guardado:', {
      isActive: this.activeClockIn.isActive,
      estado: jornada.estado,
      regularHoursCompleted: this.activeClockIn.regularHoursCompleted,
      isOvertimeMode: this.activeClockIn.isOvertimeMode,
      jornadaId: this.activeClockIn.jornadaId
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

    if (this.totalHours <= this.MAX_REGULAR_HOURS) {
      this.regularHours = this.totalHours;
      this.overtimeHours = 0;
    } else {
      this.regularHours = this.MAX_REGULAR_HOURS;
      this.overtimeHours = this.totalHours - this.MAX_REGULAR_HOURS;
    }
  }

  /**
   * ✅ CRÍTICO: Verificar límites de tiempo
   */
  private checkTimeConstraints(): void {
    if (!this.activeClockIn || !this.activeClockIn.isActive) return;

    // Alcanzó 9 horas
    if (this.regularHours >= this.MAX_REGULAR_HOURS && 
        !this.activeClockIn.regularHoursCompleted && 
        !this.activeClockIn.isOvertimeMode && 
        !this.hasShownOvertimeDialog) {
      
      console.log('⏰ Límite de 9 horas alcanzado - Pausando para decisión');
      
      this.activeClockIn.regularHoursCompleted = true;
      this.activeClockIn.autoStoppedAt9Hours = true;
      this.activeClockIn.isActive = false;
      
      this.saveJornadaToStorage();
      this.scheduleOvertimeDecision();
      
      return;
    }

    // Supera las horas extras máximas
    if (this.activeClockIn.isOvertimeMode && this.overtimeHours >= this.MAX_OVERTIME_HOURS) {
      console.log('🚨 Límite máximo de horas extras alcanzado');
      this.autoFinishJornada('Se alcanzó el límite máximo de 13 horas');
      return;
    }

    // Supera 13 horas totales
    if (this.totalHours >= this.MAX_TOTAL_HOURS) {
      console.log('🚨 Límite absoluto de 13 horas alcanzado');
      this.autoFinishJornada('Se alcanzó el límite absoluto de 13 horas de trabajo');
      return;
    }
  }

  // ============ MÉTODOS DE FICHAJE ============

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
          console.error('❌ Error fichando entrada:', error);
          
          if (error.message?.includes('409') || error.message?.includes('jornada activa')) {
            console.log('🧹 Detectado conflicto - verificando estado real');
            this.syncActiveJornadaState();
          }
          
          this.error = error.message || 'Error al procesar la solicitud';
        }
      });
  }

  /**
   * ✅ Fichar salida
   */
  clockOut(): void {
    if (!this.activeClockIn) {
      this.error = 'No hay jornada activa para finalizar';
      return;
    }
  
    this.loading = true;
    this.error = '';
    this.showOvertimeDialog = false;
  
    if (this.autoFinalizationTimer) {
      clearTimeout(this.autoFinalizationTimer);
      this.autoFinalizationTimer = null;
    }
  
    if (this.clockOutForm.invalid) {
      this.clockOutForm.patchValue({
        tiempoDescanso: 60,
        notas: 'Fichaje de salida'
      });
    }
  
    const formValues = this.clockOutForm.value;
    
    console.log('🛑 Finalizando jornada ID:', this.activeClockIn.jornadaId);
  
    this.jornadaLaboralService.finalizarJornada(
      this.activeClockIn.jornadaId,
      formValues.tiempoDescanso || 60,
      formValues.notas || 'Fichaje de salida',
      undefined,
      false
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.loading = false;
        
        if (response.success) {
          console.log('✅ Jornada finalizada correctamente');
          
          this.clearJornadaState();
          this.success = true;
          this.loadRecentJornadas();
          this.loadMonthlyStats();
          
          setTimeout(() => { this.success = false; }, 5000);
        } else {
          this.error = response.message || 'Error al finalizar jornada';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.message || 'Error al procesar la solicitud';
      }
    });
  }

  // ============ MÉTODOS DE HORAS EXTRAS ============

  /**
   * ✅ Programar decisión de horas extras
   */
  private scheduleOvertimeDecision(): void {
    if (this.autoFinalizationTimer) {
      clearTimeout(this.autoFinalizationTimer);
    }

    console.log('⏰ Programando decisión de horas extras en 10 minutos');
    
    this.autoFinalizationTimer = setTimeout(() => {
      if (this.activeClockIn && this.activeClockIn.regularHoursCompleted && !this.activeClockIn.isOvertimeMode) {
        console.log('🛑 Tiempo agotado - Finalizando jornada automáticamente');
        this.autoFinishAtRegularHours();
      }
    }, this.AUTO_FINISH_TIMEOUT);
    
    this.showOvertimeConfirmation();
  }

  /**
   * ✅ Mostrar confirmación de horas extras
   */
  private showOvertimeConfirmation(): void {
    if (this.hasShownOvertimeDialog) return;
    
    this.hasShownOvertimeDialog = true;
    this.showOvertimeDialog = true;
    this.success = false;
    this.error = '';
    
    console.log('💬 Mostrando diálogo de confirmación de horas extras');
  }

  /**
   * ✅ Confirmar horas extras
   */
  confirmOvertime(): void {
    if (!this.activeClockIn) return;

    this.showOvertimeDialog = false;
    this.loading = true;

    if (this.autoFinalizationTimer) {
      clearTimeout(this.autoFinalizationTimer);
      this.autoFinalizationTimer = null;
    }

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
          
          if (this.activeClockIn) {
            this.activeClockIn.isActive = true;
            this.activeClockIn.isOvertimeMode = true;
            this.activeClockIn.overtimeStartTimestamp = new Date();
          }
          
          this.processActiveJornada(response.data);
          this.success = true;
          setTimeout(() => { this.success = false; }, 3000);
        } else {
          this.error = response.message || 'Error al confirmar horas extras';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.message || 'Error al confirmar horas extras';
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

    if (this.autoFinalizationTimer) {
      clearTimeout(this.autoFinalizationTimer);
      this.autoFinalizationTimer = null;
    }

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
          console.log('✅ Horas extras rechazadas');
          
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
      }
    });
  }

  /**
   * ✅ Finalización automática en 9 horas
   */
  private autoFinishAtRegularHours(): void {
    if (!this.activeClockIn) return;

    console.log('🛑 Finalizando automáticamente en 9 horas regulares');
    
    this.loading = true;
    this.showOvertimeDialog = false;

    this.jornadaLaboralService.rechazarHorasExtras(
      this.activeClockIn.jornadaId,
      60,
      'Jornada finalizada automáticamente al agotar tiempo de decisión sobre horas extras'
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
        } else {
          this.error = response.message || 'Error al finalizar jornada automáticamente';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.message || 'Error al finalizar jornada automáticamente';
      }
    });
  }

  /**
   * ✅ Finalización automática por límite absoluto
   */
  private autoFinishJornada(motivo: string): void {
    console.log('🛑 Finalizando jornada automáticamente:', motivo);
    
    if (!this.activeClockIn) return;

    this.loading = true;
    this.error = '';
    this.showOvertimeDialog = false;

    if (this.autoFinalizationTimer) {
      clearTimeout(this.autoFinalizationTimer);
      this.autoFinalizationTimer = null;
    }

    this.jornadaLaboralService.finalizarJornada(
      this.activeClockIn.jornadaId,
      60,
      motivo,
      undefined,
      true
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
        } else {
          this.error = response.message || 'Error al finalizar jornada automáticamente';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.message || 'Error al finalizar jornada automáticamente';
      }
    });
  }

  /**
   * ✅ Finalización forzosa manual
   */
  forceFinishWork(): void {
    if (!this.activeClockIn) return;

    const confirmed = confirm(
      '¿Está seguro de que desea finalizar forzosamente la jornada?\n\n' +
      'Esta acción debe usarse solo en casos de emergencia.'
    );

    if (!confirmed) return;

    this.autoFinishJornada('Finalización forzosa solicitada por el usuario');
  }

  /**
   * ✅ Limpieza forzosa
   */
  forceCleanup(): void {
    console.log('🧹 Ejecutando limpieza forzosa');
    
    if (this.autoFinalizationTimer) {
      clearTimeout(this.autoFinalizationTimer);
      this.autoFinalizationTimer = null;
    }
    
    localStorage.removeItem(this.JORNADA_STORAGE_KEY);
    this.clearJornadaState();
    
    this.error = 'Jornada finalizada (se detectaron inconsistencias y se limpiaron automáticamente)';
    
    this.loadRecentJornadas();
    this.loadMonthlyStats();
    
    setTimeout(() => {
      this.error = '';
      this.success = true;
      setTimeout(() => { this.success = false; }, 3000);
    }, 2000);
  }

  /**
   * ✅ Botón manual para horas extras
   */
  requestOvertimeManually(): void {
    if (this.activeClockIn && this.activeClockIn.regularHoursCompleted && !this.hasShownOvertimeDialog) {
      this.showOvertimeConfirmation();
    } else {
      this.error = 'No es posible solicitar horas extras en este momento';
      setTimeout(() => { this.error = ''; }, 3000);
    }
  }

  // ============ MÉTODOS DE ALMACENAMIENTO ============

  /**
   * ✅ Limpiar estado de jornada
   */
  private clearJornadaState(): void {
    console.log('🧹 Limpiando estado de jornada');
    
    if (this.autoFinalizationTimer) {
      clearTimeout(this.autoFinalizationTimer);
      this.autoFinalizationTimer = null;
    }
    
    localStorage.removeItem(this.JORNADA_STORAGE_KEY);
    
    this.activeClockIn = null;
    this.currentJornada = null;
    this.regularHours = 0;
    this.overtimeHours = 0;
    this.totalHours = 0;
    this.showOvertimeDialog = false;
    this.hasShownOvertimeDialog = false;
    
    this.resetForms();
    this.isSyncing = false;
  }

  /**
   * ✅ Guardar estado en localStorage
   */
  private saveJornadaToStorage(): void {
    if (this.activeClockIn) {
      const dataToSave = {
        ...this.activeClockIn,
        startTimestamp: this.activeClockIn.startTimestamp.toISOString(),overtimeStartTimestamp: this.activeClockIn.overtimeStartTimestamp?.toISOString(),
        lastSyncTimestamp: new Date().toISOString(),
        hasShownOvertimeDialog: this.hasShownOvertimeDialog
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
      
      isOvertimeMode: saved.isOvertimeMode || false,
      overtimeStartTimestamp: saved.overtimeStartTimestamp ? new Date(saved.overtimeStartTimestamp) : undefined,
      regularHoursCompleted: saved.regularHoursCompleted || false,
      autoStoppedAt9Hours: saved.autoStoppedAt9Hours || false
    };

    this.hasShownOvertimeDialog = saved.hasShownOvertimeDialog || false;
    console.log('✅ Estado restaurado desde localStorage');
  }

  // ============ MÉTODOS DE CARGA DE DATOS ============

  /**
   * ✅ Cargar jornadas recientes
   */
  private loadRecentJornadas(): void {
    if (!this.currentUser?.id) return;
  
    const usuarioId = this.getUsuarioIdAsNumber();
    if (!usuarioId) return;
  
    console.log('📋 Cargando jornadas recientes...');
  
    this.jornadaLaboralService.obtenerJornadasUsuario(usuarioId, 10, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.recentWorkHours = response.data.map(jornada => 
              this.transformJornadaForDisplay(jornada)
            );
            
            this.filteredWorkHours = [...this.recentWorkHours];
            if (Object.keys(this.activeFilters).length > 0) {
              this.applyFilters();
            }
            
            console.log('✅ Jornadas recientes cargadas:', this.recentWorkHours.length);
          } else {
            this.recentWorkHours = [];
            this.filteredWorkHours = [];
          }
        },
        error: (error) => {
          console.error('❌ Error cargando jornadas recientes:', error);
          this.recentWorkHours = [];
          this.filteredWorkHours = [];
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
  
    const mes = this.currentCalendarDate.getMonth() + 1;
    const anio = this.currentCalendarDate.getFullYear();
  
    console.log(`📊 Cargando estadísticas: mes=${mes}, año=${anio}`);
  
    this.jornadaLaboralService.obtenerEstadisticasMes(usuarioId, mes, anio)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.monthlyStats = response.data;
            console.log('✅ Estadísticas del mes cargadas');
          } else {
            this.monthlyStats = null;
          }
        },
        error: (error) => {
          console.error('❌ Error cargando estadísticas:', error);
          this.monthlyStats = null;
        }
      });
  }

  /**
   * ✅ Transformar jornada para mostrar
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
   * ✅ Mapear estado
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
   * ✅ Formatear hora
   */
  private formatearHora(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  setupMobileTable(): void {
    // Implementación futura
  }

  // ============ MÉTODOS PARA EL TEMPLATE ============

  /**
   * ✅ Verificar errores de campo
   */
  hasFieldError(fieldName: string, form: FormGroup): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  /**
   * ✅ Obtener mensaje de error
   */
  getFieldError(fieldName: string, form: FormGroup): string {
    const field = form.get(fieldName);
    
    if (field?.errors) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} es requerido`;
      }
      if (field.errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} no puede exceder ${field.errors['maxlength'].requiredLength} caracteres`;
      }
      if (field.errors['min']) {
        return `${this.getFieldLabel(fieldName)} debe ser mayor a ${field.errors['min'].min}`;
      }
      if (field.errors['max']) {
        return `${this.getFieldLabel(fieldName)} no puede ser mayor a ${field.errors['max'].max}`;
      }
    }
    
    return '';
  }

  /**
   * ✅ Obtener etiqueta del campo
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'notas': 'Las notas',
      'tiempoDescanso': 'El tiempo de descanso'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * ✅ Verificar si se puede fichar entrada
   */
  canClockIn(): boolean {
    return !this.activeClockIn && !this.loading && !this.loadingMasterData && !!this.currentUser;
  }

  /**
   * ✅ Verificar si se puede fichar salida
   */
  canClockOut(): boolean {
    return !!this.activeClockIn && !this.loading && this.clockOutForm.valid;
  }

  /**
   * ✅ Verificar si se puede finalizar forzosamente
   */
  canForceFinish(): boolean {
    return !!this.activeClockIn && this.activeClockIn.isActive && !this.loading;
  }

  /**
   * ✅ Obtener estado de trabajo actual
   */
  getCurrentWorkStatus(): string {
    if (!this.activeClockIn) return '';
    
    if (this.activeClockIn.autoStoppedAt9Hours && !this.activeClockIn.isActive) {
      return '⏸️ Jornada Pausada - Límite de 9h Alcanzado';
    }
    
    if (this.activeClockIn.isOvertimeMode) {
      return '🕐 Horas Extras Activas';
    }
    
    if (this.activeClockIn.isActive) {
      return '⏱️ Jornada Laboral Activa';
    }
    
    return '⏸️ Jornada Pausada';
  }

  /**
   * ✅ Obtener clase CSS para el estado
   */
  getWorkStatusClass(): string {
    if (!this.activeClockIn) return '';
    
    if (this.activeClockIn.autoStoppedAt9Hours && !this.activeClockIn.isActive) {
      return 'status-paused';
    }
    
    if (this.activeClockIn.isOvertimeMode) {
      return 'status-overtime';
    }
    
    if (this.activeClockIn.isActive) {
      if (this.isNearingLimit()) {
        return 'status-warning';
      }
      if (this.hasExceededLimit()) {
        return 'status-danger';
      }
      return 'status-active';
    }
    
    return 'status-paused';
  }

  /**
   * ✅ Verificar si está en modo horas extras
   */
  get isInOvertimeMode(): boolean {
    return this.activeClockIn?.isOvertimeMode || false;
  }

  /**
   * ✅ Verificar si está cerca del límite
   */
  isNearingLimit(): boolean {
    if (!this.activeClockIn) return false;
    
    if (this.isInOvertimeMode) {
      return this.overtimeHours >= 3;
    }
    
    return this.regularHours >= this.WARNING_HOURS;
  }

  /**
   * ✅ Verificar si ha excedido el límite
   */
  hasExceededLimit(): boolean {
    if (!this.activeClockIn) return false;
    
    if (this.isInOvertimeMode) {
      return this.overtimeHours >= this.MAX_OVERTIME_HOURS;
    }
    
    return this.regularHours >= this.MAX_REGULAR_HOURS;
  }

  /**
   * ✅ Calcular tiempo transcurrido
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
      return `${regularHoursStr} (${overtimeHoursStr} extras)`;
    }

    return `${hours}h ${minutes}m`;
  }

  /**
   * ✅ Mostrar tiempo restante
   */
  getRemainingTime(): string {
    if (!this.activeClockIn) return '';

    if (this.isInOvertimeMode) {
      const remainingOvertime = this.MAX_OVERTIME_HOURS - this.overtimeHours;
      if (remainingOvertime <= 0) return 'Límite alcanzado';
      
      const hours = Math.floor(remainingOvertime);
      const minutes = Math.floor((remainingOvertime - hours) * 60);
      return `${hours}h ${minutes}m extras restantes`;
    }

    const remainingRegular = this.MAX_REGULAR_HOURS - this.regularHours;
    if (remainingRegular <= 0) return 'Jornada regular completada';
    
    const hours = Math.floor(remainingRegular);
    const minutes = Math.floor((remainingRegular - hours) * 60);
    return `${hours}h ${minutes}m restantes`;
  }

  /**
   * ✅ Mostrar progreso de la jornada
   */
  getWorkDayProgress(): number {
    if (!this.activeClockIn) return 0;

    if (this.isInOvertimeMode) {
      return Math.min(100, (this.overtimeHours / this.MAX_OVERTIME_HOURS) * 100);
    }

    return Math.min(100, (this.regularHours / this.MAX_REGULAR_HOURS) * 100);
  }

  /**
   * ✅ Mostrar horas extras
   */
  getOvertimeDisplay(): string {
    const hours = Math.floor(this.overtimeHours);
    const minutes = Math.floor((this.overtimeHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * ✅ Mostrar total trabajado
   */
  getTotalWorkedDisplay(): string {
    const hours = Math.floor(this.totalHours);
    const minutes = Math.floor((this.totalHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * ✅ Mostrar horas regulares
   */
  getRegularHoursDisplay(): string {
    const hours = Math.floor(this.regularHours);
    const minutes = Math.floor((this.regularHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * ✅ Refrescar registros
   */
  refreshRecentWorkHours(): void {
    this.loadRecentJornadas();
  }

  /**
   * ✅ Formatear horas
   */
  formatHours(hours: number): string {
    if (!hours || hours === 0) return '0h';
    
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    
    if (m === 0) {
      return `${h}h`;
    }
    
    return `${h}h ${m}m`;
  }

  /**
   * ✅ Obtener clase CSS para el estado
   */
  getStatusClass(estado: string): string {
    const statusMap: { [key: string]: string } = {
      'Activa': 'badge-warning',
      'Pausada': 'badge-secondary',
      'Completada': 'badge-success',
      'Cancelada': 'badge-danger'
    };
    return statusMap[estado] || 'badge-secondary';
  }

  /**
   * ✅ TrackBy para optimizar rendimiento
   */
  trackByWorkHours(index: number, workHour: any): any {
    return workHour.id || index;
  }

  /**
   * ✅ TrackBy para calendario
   */
  trackByDay(index: number, day: CalendarDay): string {
    return `${day.date.getTime()}-${day.dayNumber}`;
  }

  /**
   * ✅ Obtener total de horas recientes
   */
  getTotalRecentHours(): number {
    return this.recentWorkHours.reduce((total, workHour) => total + (workHour.totalHoras || 0), 0);
  }

  /**
   * ✅ Obtener promedio de horas por día
   */
  getAverageHoursPerDay(): number {
    if (this.recentWorkHours.length === 0) return 0;
    return this.getTotalRecentHours() / this.recentWorkHours.length;
  }

  // ============ MÉTODOS PARA EL CALENDARIO ============

  /**
   * ✅ Obtener mes y año actual
   */
  getCurrentMonthYear(): string {
    return this.currentCalendarDate.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * ✅ Ir al mes anterior
   */
  previousMonth(): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() - 1,
      1
    );
    this.loadMonthlyStats();
  }

  /**
   * ✅ Ir al mes siguiente
   */
  nextMonth(): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() + 1,
      1
    );
    this.loadMonthlyStats();
  }

  /**
   * ✅ Generar días del calendario
   */
  getCalendarDays(): CalendarDay[] {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    const today = new Date();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const days: CalendarDay[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayData = this.findWorkHoursForDate(currentDate);
      
      days.push({
        dayNumber: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: this.isSameDay(currentDate, today),
        isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
        date: new Date(currentDate),
        hasWorkHours: dayData.hasWorkHours,
        workHours: dayData.workHours,
        isPaymentDay: this.isPaymentDay(currentDate)
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }

  /**
   * ✅ Verificar si es el mismo día
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  /**
   * ✅ Buscar horas trabajadas para una fecha
   */
  private findWorkHoursForDate(date: Date): { hasWorkHours: boolean; workHours?: number } {
    const dateString = date.toISOString().split('T')[0];
    
    if (this.monthlyStats?.jornadas) {
      const jornada = this.monthlyStats.jornadas.find(j => j.fecha === dateString);
      if (jornada) {
        return {
          hasWorkHours: true,
          workHours: jornada.total_horas
        };
      }
    }
    
    const workHour = this.recentWorkHours.find(wh => wh.fecha === dateString);
    if (workHour) {
      return {
        hasWorkHours: true,
        workHours: workHour.totalHoras
      };
    }
    
    return { hasWorkHours: false };
  }

  /**
   * ✅ Verificar si es día de pago
   */
  private isPaymentDay(date: Date): boolean {
    return date.getDate() === 30;
  }

  /**
   * ✅ Obtener fecha del último pago
   */
  getLastPaymentDate(): Date {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 30);
  }

  /**
   * ✅ Obtener horas del mes actual
   */
  getCurrentMonthHours(): number {
    if (this.monthlyStats) {
      return this.monthlyStats.total_horas;
    }
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return this.recentWorkHours
      .filter(wh => {
        const workDate = new Date(wh.fecha);
        return workDate.getMonth() === currentMonth && workDate.getFullYear() === currentYear;
      })
      .reduce((total, wh) => total + (wh.totalHoras || 0), 0);
  }

  /**
   * ✅ Obtener monto pendiente estimado
   */
  getPendingAmount(): number {
    const hoursWorked = this.getCurrentMonthHours();
    const hourlyRate = 5000;
    return hoursWorked * hourlyRate;
  }

  // ============ MÉTODOS DE FILTROS ============

  /**
   * ✅ Manejar cambios de filtros
   */
  onFiltersChanged(filters: any): void {
    console.log('📋 Filtros aplicados:', filters);
    this.activeFilters = filters;
    this.applyFilters();
  }

  /**
   * ✅ Aplicar filtros
   */
  private applyFilters(): void {
    let filtered = [...this.recentWorkHours];

    if (this.activeFilters.fechaDesde) {
      filtered = filtered.filter(jornada => 
        jornada.fecha >= this.activeFilters.fechaDesde
      );
    }

    if (this.activeFilters.fechaHasta) {
      filtered = filtered.filter(jornada => 
        jornada.fecha <= this.activeFilters.fechaHasta
      );
    }

    if (this.activeFilters.estado) {
      filtered = filtered.filter(jornada => 
        jornada.estado === this.activeFilters.estado
      );
    }

    if (this.activeFilters.horasMin) {
      const min = parseFloat(this.activeFilters.horasMin);
      if (!isNaN(min)) {
        filtered = filtered.filter(jornada => 
          jornada.totalHoras >= min
        );
      }
    }

    if (this.activeFilters.horasMax) {
      const max = parseFloat(this.activeFilters.horasMax);
      if (!isNaN(max)) {
        filtered = filtered.filter(jornada => 
          jornada.totalHoras <= max
        );
      }
    }

    if (this.activeFilters.tieneExtras) {
      if (this.activeFilters.tieneExtras === 'si') {
        filtered = filtered.filter(jornada => 
          jornada.horasExtras && jornada.horasExtras > 0
        );
      } else if (this.activeFilters.tieneExtras === 'no') {
        filtered = filtered.filter(jornada => 
          !jornada.horasExtras || jornada.horasExtras === 0
        );
      }
    }

    this.filteredWorkHours = filtered;
  }

  // ============ MÉTODO DE DEBUG ============

  debugBackendStatus(): void {
    if (!this.currentUser?.id) {
      console.error('❌ No hay usuario actual');
      return;
    }
  
    const usuarioId = this.getUsuarioIdAsNumber();
    if (!usuarioId) return;
  
    console.log('🔍 === DIAGNÓSTICO DE BACKEND ===');
    console.log('Usuario ID:', usuarioId);
    console.log('API URL:', `${environment.apiUrl}/jornadas-laborales`);
    
    this.jornadaLaboralService.obtenerJornadaActiva(usuarioId)
      .subscribe({
        next: (response) => {
          console.log('✅ Jornada activa - OK', response);
        },
        error: (error) => {
          console.error('❌ Jornada activa - ERROR', error);
        }
      });
    
    this.jornadaLaboralService.obtenerJornadasUsuario(usuarioId, 5, 0)
      .subscribe({
        next: (response) => {
          console.log('✅ Jornadas usuario - OK', response);
        },
        error: (error) => {
          console.error('❌ Jornadas usuario - ERROR', error);
        }
      });
    
    const mes = new Date().getMonth() + 1;
    const anio = new Date().getFullYear();
    
    this.jornadaLaboralService.obtenerEstadisticasMes(usuarioId, mes, anio)
      .subscribe({
        next: (response) => {
          console.log('✅ Estadísticas - OK', response);
        },
        error: (error) => {
          console.error('❌ Estadísticas - ERROR', error);
        }
      });
  }

  /**
   * ✅ Limpiar errores persistentes
   */
  clearPersistentErrors(): void {
    console.log('🧹 Limpiando errores persistentes...');
    
    localStorage.removeItem(this.JORNADA_STORAGE_KEY);
    this.clearJornadaState();
    
    this.recentWorkHours = [];
    this.monthlyStats = null;
    
    this.error = '';
    this.success = false;
    this.loading = false;
    
    setTimeout(() => {
      this.syncActiveJornadaState();
      this.loadRecentJornadas();
      this.loadMonthlyStats();
    }, 500);
  }
}