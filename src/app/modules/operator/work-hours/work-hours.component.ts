// work-hours.component.ts - CORREGIDO COMPLETAMENTE

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
// ✅ DESPUÉS - Importar Usuario desde una interfaz separada o definirla localmente
import { AuthService } from '../../../core/services/auth.service';
import { TableFiltersComponent, FilterConfig } from '../../../shared/components/table-filters/table-filters.component';


// Y agrega la interfaz Usuario localmente en el componente:
interface Usuario {
  id: number;
  nombre: string;
  email: string;
  estado: boolean;
  roles: string[];
}
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
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule,TableFiltersComponent],
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
  
  // ✅ Control de horas extras MEJORADO
  showOvertimeDialog = false;
  autoFinalizationTimer: any = null;
  hasShownOvertimeDialog = false; // Para evitar múltiples diálogos
  
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
  
  // ✅ Constantes de configuración MEJORADAS
  private readonly MAX_REGULAR_HOURS = 9;
  private readonly WARNING_HOURS = 8;
  private readonly MAX_OVERTIME_HOURS = 4;
  private readonly MAX_TOTAL_HOURS = 13; // 9 regulares + 4 extras
  private readonly JORNADA_STORAGE_KEY = 'activeJornadaLaboral';
  private readonly AUTO_FINISH_TIMEOUT = 10 * 60 * 1000; // 10 minutos para decidir sobre horas extras
  
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
    
    // ✅ Ejecutar diagnóstico solo en desarrollo
    if (!environment.production) {
      setTimeout(() => this.debugBackendStatus(), 1000);
    }
    
    this.checkForActiveJornada();
    this.loadRecentJornadas();
    this.loadMonthlyStats();
    this.setupMobileTable();
    this.startClockUpdate();
  }

  ngOnDestroy(): void {
    // Limpiar timer de finalización automática
    if (this.autoFinalizationTimer) {
      clearTimeout(this.autoFinalizationTimer);
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

  /**
   * ✅ Cargar usuario actual
   */
  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.error = 'No se pudo cargar la información del usuario. Inicie sesión nuevamente.';
      this.authService.cerrarSesion();
    } else {
      console.log('✅ Usuario actual cargado:', this.currentUser);
    }
  }

  /**
   * ✅ CRÍTICO: Verificar jornada activa - LÓGICA CORREGIDA CON LIMPIEZA
   */
  private checkForActiveJornada(): void {
    if (!this.currentUser?.id || this.isSyncing) return;
  
    const usuarioId = this.getUsuarioIdAsNumber();
    if (!usuarioId) return;
  
    this.isSyncing = true;
    console.log('🔍 Verificando jornada activa para usuario:', usuarioId);
  
    this.jornadaLaboralService.obtenerJornadaActiva(usuarioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('📥 Respuesta del backend:', response);
          
          if (response.success && response.data) {
            console.log('✅ Jornada activa encontrada en backend');
            this.processActiveJornada(response.data);
          } else {
            console.log('ℹ️ No hay jornada activa en el backend');
            this.clearJornadaState();
          }
          
          this.isSyncing = false;
        },
        error: (error) => {
          console.error('❌ Error verificando jornada activa:', error);
          this.isSyncing = false;
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
   * ✅ CRÍTICO: Procesar jornada activa - MEJORADO
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

    this.saveJornadaToStorage();
    this.updateCalculatedHours();
    
    // ✅ NUEVO: Verificar si necesita mostrar diálogo inmediatamente
    if (this.activeClockIn.regularHoursCompleted && !this.activeClockIn.isOvertimeMode && !this.hasShownOvertimeDialog) {
      this.scheduleOvertimeDecision();
    }
    
    console.log('✅ Jornada activa procesada:', {
      isActive: this.activeClockIn.isActive,
      estado: jornada.estado,
      regularHoursCompleted: this.activeClockIn.regularHoursCompleted,
      isOvertimeMode: this.activeClockIn.isOvertimeMode
    });
  }

  /**
   * ✅ NUEVO: Programar decisión de horas extras
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
    
    // Mostrar diálogo inmediatamente
    this.showOvertimeConfirmation();
  }

  /**
   * ✅ Actualizar reloj en tiempo real MEJORADO
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
   * ✅ CRÍTICO: Verificar límites de tiempo - LÓGICA CORREGIDA
   */
  private checkTimeConstraints(): void {
    if (!this.activeClockIn || !this.activeClockIn.isActive) return;

    // ✅ CASO 1: Alcanzó 9 horas y no está en modo overtime y no ha mostrado diálogo
    if (this.regularHours >= this.MAX_REGULAR_HOURS && 
        !this.activeClockIn.regularHoursCompleted && 
        !this.activeClockIn.isOvertimeMode && 
        !this.hasShownOvertimeDialog) {
      
      console.log('⏰ Límite de 9 horas alcanzado - Pausando para decisión');
      
      this.activeClockIn.regularHoursCompleted = true;
      this.activeClockIn.autoStoppedAt9Hours = true;
      this.activeClockIn.isActive = false; // ✅ Pausar temporalmente
      
      this.saveJornadaToStorage();
      this.scheduleOvertimeDecision();
      
      return;
    }

    // ✅ CASO 2: Supera las horas extras máximas
    if (this.activeClockIn.isOvertimeMode && this.overtimeHours >= this.MAX_OVERTIME_HOURS) {
      console.log('🚨 Límite máximo de horas extras alcanzado - Finalizando automáticamente');
      this.autoFinishJornada('Se alcanzó el límite máximo de 13 horas (9 regulares + 4 extras)');
      return;
    }

    // ✅ CASO 3: Supera 13 horas totales por cualquier motivo
    if (this.totalHours >= this.MAX_TOTAL_HOURS) {
      console.log('🚨 Límite absoluto de 13 horas alcanzado - Finalizando automáticamente');
      this.autoFinishJornada('Se alcanzó el límite absoluto de 13 horas de trabajo');
      return;
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
    console.log('📝 Notas:', formValues.notas);
  
    this.jornadaLaboralService.ficharEntrada(usuarioId, formValues.notas)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          
          if (response.success && response.data) {
            console.log('✅ Entrada fichada correctamente:', response.data);
            this.processActiveJornada(response.data);
            this.success = true;
            this.resetForms();
            
            setTimeout(() => { this.success = false; }, 3000);
          } else {
            console.error('❌ Respuesta sin datos:', response);
            this.error = response.message || 'Error al registrar entrada';
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('❌ Error fichando entrada:', error);
          
          // ✅ NUEVO: Limpiar estado en caso de error persistente
          if (error.message?.includes('409') || error.message?.includes('jornada activa')) {
            console.log('🧹 Detectado conflicto - verificando estado real');
            this.checkForActiveJornada();
          }
          
          this.error = error.message || 'Error al procesar la solicitud';
        }
      });
  }

  /**
   * ✅ CRÍTICO: Fichar salida - MEJORADO
   */
  clockOut(): void {
    if (!this.activeClockIn) {
      this.error = 'No hay jornada activa para finalizar';
      return;
    }
  
    this.loading = true;
    this.error = '';
    this.showOvertimeDialog = false;
  
    // Limpiar timer de finalización automática
    if (this.autoFinalizationTimer) {
      clearTimeout(this.autoFinalizationTimer);
      this.autoFinalizationTimer = null;
    }
  
    // ✅ Validar y completar formulario si está incompleto
    if (this.clockOutForm.invalid) {
      console.log('⚠️ Formulario inválido, completando con valores por defecto');
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
      undefined, // ubicación
      false // no forzado
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
        console.error('❌ Error finalizando jornada:', error);
      }
    });
  }

  /**
   * ✅ NUEVO: Mostrar confirmación de horas extras
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

    // Limpiar timer
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
          console.log('✅ Horas extras confirmadas - Reactivando timer');
          
          // ✅ Reactivar el timer en modo horas extras
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
        console.error('❌ Error confirmando horas extras:', error);
      }
    });
  }

  /**
   * ✅ Rechazar horas extras (finalizar en 9 horas)
   */
  declineOvertime(): void {
    if (!this.activeClockIn) return;

    this.showOvertimeDialog = false;
    this.loading = true;

    // Limpiar timer
    if (this.autoFinalizationTimer) {
      clearTimeout(this.autoFinalizationTimer);
      this.autoFinalizationTimer = null;
    }

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
          console.log('✅ Horas extras rechazadas y jornada finalizada en 9h');
          
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
   * ✅ NUEVO: Finalización automática en 9 horas regulares
   */
  private autoFinishAtRegularHours(): void {
    if (!this.activeClockIn) return;

    console.log('🛑 Finalizando automáticamente en 9 horas regulares (tiempo agotado)');
    
    this.loading = true;
    this.showOvertimeDialog = false;

    this.jornadaLaboralService.rechazarHorasExtras(
      this.activeClockIn.jornadaId,
      60, // tiempo de descanso por defecto
      'Jornada finalizada automáticamente al agotar tiempo de decisión sobre horas extras'
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.loading = false;
        
        if (response.success) {
          console.log('✅ Jornada finalizada automáticamente en 9h');
          
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
   * ✅ Finalización automática por límite absoluto
   */
  private autoFinishJornada(motivo: string): void {
    console.log('🛑 Finalizando jornada automáticamente:', motivo);
    
    if (!this.activeClockIn) return;

    this.loading = true;
    this.error = '';
    this.showOvertimeDialog = false;

    // Limpiar timer
    if (this.autoFinalizationTimer) {
      clearTimeout(this.autoFinalizationTimer);
      this.autoFinalizationTimer = null;
    }

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
          console.log('✅ Jornada finalizada automáticamente por límite');
          
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
   * ✅ NUEVO: Limpieza forzosa en caso de errores persistentes
   */
  forceCleanup(): void {
    console.log('🧹 Ejecutando limpieza forzosa');
    
    // Limpiar timer
    if (this.autoFinalizationTimer) {
      clearTimeout(this.autoFinalizationTimer);
      this.autoFinalizationTimer = null;
    }
    
    // Limpiar localStorage
    localStorage.removeItem(this.JORNADA_STORAGE_KEY);
    
    // Limpiar estado del componente
    this.clearJornadaState();
    
    // Mostrar mensaje informativo
    this.error = 'Jornada finalizada (se detectaron inconsistencias y se limpiaron automáticamente)';
    
    // Recargar datos
    this.loadRecentJornadas();
    this.loadMonthlyStats();
    
    setTimeout(() => {
      this.error = '';
      this.success = true;
      setTimeout(() => { this.success = false; }, 3000);
    }, 2000);
  }

  /**
   * ✅ NUEVO: Botón manual para mostrar diálogo de horas extras
   */
  requestOvertimeManually(): void {
    if (this.activeClockIn && this.activeClockIn.regularHoursCompleted && !this.hasShownOvertimeDialog) {
      this.showOvertimeConfirmation();
    } else {
      this.error = 'No es posible solicitar horas extras en este momento';
      setTimeout(() => { this.error = ''; }, 3000);
    }
  }

  /**
   * ✅ CORREGIDO: Limpiar estado de jornada - MÁS COMPLETO
   */
  private clearJornadaState(): void {
    console.log('🧹 Limpiando estado de jornada completamente');
    
    // ✅ Limpiar timer PRIMERO
    if (this.autoFinalizationTimer) {
      clearTimeout(this.autoFinalizationTimer);
      this.autoFinalizationTimer = null;
    }
    
    // ✅ Limpiar localStorage
    localStorage.removeItem(this.JORNADA_STORAGE_KEY);
    
    // ✅ Limpiar TODOS los estados del componente
    this.activeClockIn = null;
    this.currentJornada = null;
    this.regularHours = 0;
    this.overtimeHours = 0;
    this.totalHours = 0;
    this.showOvertimeDialog = false;
    this.hasShownOvertimeDialog = false; // ✅ CRÍTICO: Resetear flag
    
    // ✅ Resetear formularios completamente
    this.resetForms();
    
    // ✅ Limpiar cualquier timer o intervalo
    this.isSyncing = false;
    
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
      
      // Estados de horas extras
      isOvertimeMode: saved.isOvertimeMode || false,
      overtimeStartTimestamp: saved.overtimeStartTimestamp ? new Date(saved.overtimeStartTimestamp) : undefined,
      regularHoursCompleted: saved.regularHoursCompleted || false,
      autoStoppedAt9Hours: saved.autoStoppedAt9Hours || false
    };

    // Restaurar flag de diálogo mostrado
    this.hasShownOvertimeDialog = saved.hasShownOvertimeDialog || false;

    console.log('✅ Estado de jornada restaurado desde localStorage');
  }

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
            
            // ✅ AGREGAR ESTAS LÍNEAS
            this.filteredWorkHours = [...this.recentWorkHours];
            if (Object.keys(this.activeFilters).length > 0) {
              this.applyFilters();
            }
            
            console.log('✅ Jornadas recientes cargadas:', this.recentWorkHours.length);
          } else {
            console.warn('⚠️ No hay jornadas recientes');
            this.recentWorkHours = [];
            this.filteredWorkHours = []; // ✅ AGREGAR
          }
        },
        error: (error) => {
          console.error('❌ Error cargando jornadas recientes:', error);
          this.recentWorkHours = [];
          this.filteredWorkHours = []; // ✅ AGREGAR
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
  
    // ✅ Obtener mes y año actual del calendario
    const mes = this.currentCalendarDate.getMonth() + 1; // getMonth() devuelve 0-11
    const anio = this.currentCalendarDate.getFullYear();
  
    console.log(`📊 Cargando estadísticas: mes=${mes}, año=${anio}`);
  
    this.jornadaLaboralService.obtenerEstadisticasMes(usuarioId, mes, anio)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.monthlyStats = response.data;
            console.log('✅ Estadísticas del mes cargadas:', this.monthlyStats);
          } else {
            console.warn('⚠️ No hay estadísticas disponibles');
            this.monthlyStats = null;
          }
        },
        error: (error) => {
          console.error('❌ Error cargando estadísticas del mes:', error);
          // No mostrar error al usuario, simplemente no cargar estadísticas
          this.monthlyStats = null;
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
   * ✅ Verificar si un campo del formulario tiene errores
   */
  hasFieldError(fieldName: string, form: FormGroup): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  /**
   * ✅ Obtener mensaje de error para un campo específico
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
   * ✅ Obtener etiqueta del campo para mensajes de error
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
   * ✅ Obtener estado de trabajo actual para mostrar
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
   * ✅ Obtener clase CSS para el estado de trabajo
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
      return this.overtimeHours >= 3; // Advertencia a partir de 3h extras
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
   * ✅ Refrescar registros recientes
   */
  refreshRecentWorkHours(): void {
    this.loadRecentJornadas();
  }

  /**
   * ✅ Formatear horas para mostrar
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
    
    // Primer día del mes
    const firstDay = new Date(year, month, 1);
    // Último día del mes
    const lastDay = new Date(year, month + 1, 0);
    
    // Días a mostrar (incluyendo días del mes anterior y siguiente)
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
    
    // Buscar en estadísticas mensuales si están disponibles
    if (this.monthlyStats?.jornadas) {
      const jornada = this.monthlyStats.jornadas.find(j => j.fecha === dateString);
      if (jornada) {
        return {
          hasWorkHours: true,
          workHours: jornada.total_horas
        };
      }
    }
    
    // Buscar en registros recientes como fallback
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
   * ✅ Verificar si es día de pago (ejemplo: día 30 de cada mes)
   */
  private isPaymentDay(date: Date): boolean {
    return date.getDate() === 30; // Ejemplo: día 30 es día de pago
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
    
    // Fallback: calcular desde registros recientes
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
    const hourlyRate = 5000; // Ejemplo: $5000 por hora
    return hoursWorked * hourlyRate;
  }

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
    
    // Probar conexión con jornada activa
    this.jornadaLaboralService.obtenerJornadaActiva(usuarioId)
      .subscribe({
        next: (response) => {
          console.log('✅ Jornada activa - OK', response);
        },
        error: (error) => {
          console.error('❌ Jornada activa - ERROR', error);
        }
      });
    
    // Probar conexión con jornadas
    this.jornadaLaboralService.obtenerJornadasUsuario(usuarioId, 5, 0)
      .subscribe({
        next: (response) => {
          console.log('✅ Jornadas usuario - OK', response);
        },
        error: (error) => {
          console.error('❌ Jornadas usuario - ERROR', error);
        }
      });
    
    // Probar conexión con estadísticas
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


  // 5. AGREGAR método para limpiar errores persistentes
clearPersistentErrors(): void {
  console.log('🧹 Limpiando errores persistentes...');
  
  // Limpiar localStorage
  localStorage.removeItem(this.JORNADA_STORAGE_KEY);
  
  // Resetear estado
  this.clearJornadaState();
  
  // Limpiar arrays
  this.recentWorkHours = [];
  this.monthlyStats = null;
  
  // Limpiar mensajes
  this.error = '';
  this.success = false;
  this.loading = false;
  
  // Recargar datos desde cero
  setTimeout(() => {
    this.checkForActiveJornada();
    this.loadRecentJornadas();
    this.loadMonthlyStats();
  }, 500);
}

/**
   * ✅ Manejar cambios de filtros
   */
onFiltersChanged(filters: any): void {
  console.log('📋 Filtros aplicados:', filters);
  this.activeFilters = filters;
  this.applyFilters();
}

/**
 * ✅ Aplicar filtros a las jornadas
 */
private applyFilters(): void {
  let filtered = [...this.recentWorkHours];

  console.log(`🔍 Aplicando filtros a ${filtered.length} jornadas`);

  // Filtro por rango de fechas - DESDE
  if (this.activeFilters.fechaDesde) {
    filtered = filtered.filter(jornada => 
      jornada.fecha >= this.activeFilters.fechaDesde
    );
    console.log(`  - Filtro fechaDesde: ${filtered.length} jornadas`);
  }

  // Filtro por rango de fechas - HASTA
  if (this.activeFilters.fechaHasta) {
    filtered = filtered.filter(jornada => 
      jornada.fecha <= this.activeFilters.fechaHasta
    );
    console.log(`  - Filtro fechaHasta: ${filtered.length} jornadas`);
  }

  // Filtro por estado
  if (this.activeFilters.estado) {
    filtered = filtered.filter(jornada => 
      jornada.estado === this.activeFilters.estado
    );
    console.log(`  - Filtro estado: ${filtered.length} jornadas`);
  }

  // Filtro por horas mínimas
  if (this.activeFilters.horasMin) {
    const min = parseFloat(this.activeFilters.horasMin);
    if (!isNaN(min)) {
      filtered = filtered.filter(jornada => 
        jornada.totalHoras >= min
      );
      console.log(`  - Filtro horasMin (${min}): ${filtered.length} jornadas`);
    }
  }

  // Filtro por horas máximas
  if (this.activeFilters.horasMax) {
    const max = parseFloat(this.activeFilters.horasMax);
    if (!isNaN(max)) {
      filtered = filtered.filter(jornada => 
        jornada.totalHoras <= max
      );
      console.log(`  - Filtro horasMax (${max}): ${filtered.length} jornadas`);
    }
  }

  // Filtro por horas extras
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
    console.log(`  - Filtro tieneExtras: ${filtered.length} jornadas`);
  }

  this.filteredWorkHours = filtered;
  console.log(`✅ Jornadas filtradas: ${this.filteredWorkHours.length} de ${this.recentWorkHours.length}`);
}

// ... resto de métodos existentes ...
}

