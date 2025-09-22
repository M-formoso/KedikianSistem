// work-hours.component.ts - COMPLETAMENTE CORREGIDO CON TODOS LOS MÉTODOS

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
   * ✅ CRÍTICO: Verificar jornada activa - LÓGICA CORREGIDA CON LIMPIEZA
   */
  private checkForActiveJornada(): void {
    if (!this.currentUser?.id || this.isSyncing) return;

    const usuarioId = this.getUsuarioIdAsNumber();
    if (!usuarioId) return;

    this.isSyncing = true;
    console.log('🔍 Verificando jornada activa para usuario:', usuarioId);

    // ✅ PASO 1: Limpiar jornadas fantasma primero
    this.jornadaLaboralService.limpiarJornadasFantasma(usuarioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Jornadas fantasma limpiadas');
          
          // ✅ PASO 2: Verificar jornada activa después de la limpieza
          this.jornadaLaboralService.obtenerJornadaActiva(usuarioId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response) => {
                console.log('📥 Respuesta del backend después de limpieza:', response);
                
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
        },
        error: (error) => {
          console.error('❌ Error limpiando jornadas fantasma:', error);
          // Continuar con la verificación normal
          this.jornadaLaboralService.obtenerJornadaActiva(usuarioId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response) => {
                if (response.success && response.data) {
                  this.processActiveJornada(response.data);
                } else {
                  this.clearJornadaState();
                }
                this.isSyncing = false;
              },
              error: (error) => {
                this.isSyncing = false;
                this.checkLocalStorageFallback();
              }
            });
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
   * ✅ CORREGIDO: Procesar jornada activa - SIN mostrar diálogo automáticamente
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

    // ✅ CRÍTICO: NO mostrar diálogo automáticamente para evitar bucles
    // Solo mostrar si está realmente pausada esperando confirmación
    if (jornada.estado === 'pausada' && 
        jornada.limite_regular_alcanzado && 
        !jornada.overtime_confirmado && 
        !this.showOvertimeDialog) {
      console.log('ℹ️ Jornada pausada detectada, pero NO mostrando diálogo automáticamente');
      // Comentado temporalmente: this.showOvertimeConfirmation();
    }

    this.saveJornadaToStorage();
    this.updateCalculatedHours();
    
    console.log('✅ Jornada activa procesada:', {
      isActive: this.activeClockIn.isActive,
      estado: jornada.estado,
      horaFin: jornada.hora_fin,
      showDialog: this.showOvertimeDialog
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
   * ✅ CORREGIDO: Verificar límites de tiempo - Sin mostrar diálogo automáticamente
   */
  private checkTimeConstraints(): void {
    if (!this.activeClockIn || !this.activeClockIn.isActive) return;

    // Si alcanzó las 9 horas y no está en modo overtime
    if (this.regularHours >= this.MAX_REGULAR_HOURS && 
        !this.activeClockIn.regularHoursCompleted && 
        !this.showOvertimeDialog) {
      
      console.log('⏰ Límite de 9 horas alcanzado');
      this.activeClockIn.regularHoursCompleted = true;
      this.activeClockIn.autoStoppedAt9Hours = true;
      this.activeClockIn.isActive = false;
      
      // ✅ NO mostrar diálogo automáticamente
      // this.showOvertimeConfirmation(); // Comentado
      
      this.saveJornadaToStorage();
      
      // Solo actualizar estado en backend sin mostrar diálogo
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

    // Si supera las horas extras máximas
    if (this.overtimeHours >= this.MAX_OVERTIME_HOURS) {
      this.autoFinishJornada('Se alcanzó el límite máximo de horas extras (4h)');
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
   * ✅ CORREGIDO: Fichar salida - Con mejor manejo de errores
   */
  clockOut(): void {
    if (!this.activeClockIn || !this.currentJornada) {
      this.error = 'No hay jornada activa';
      return;
    }

    this.loading = true;
    this.error = '';
    this.showOvertimeDialog = false;

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
    console.log('📋 Valores del formulario:', formValues);

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
        console.error('❌ Error finalizando jornada:', error);
        
        // ✅ NUEVO: En caso de error, intentar limpiar estado de todas formas
        if (error.message && error.message.includes('422')) {
          console.log('⚠️ Error 422 detectado, intentando limpieza forzosa');
          this.forceCleanup();
        } else {
          this.error = error.message || 'Error al procesar la solicitud';
        }
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
   * ✅ Finalización forzosa
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
    if (this.activeClockIn && this.activeClockIn.regularHoursCompleted) {
      this.showOvertimeDialog = true;
    } else {
      this.error = 'No es posible solicitar horas extras en este momento';
      setTimeout(() => { this.error = ''; }, 3000);
    }
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
   * ✅ CORREGIDO: Limpiar estado de jornada - MÁS COMPLETO
   */
  private clearJornadaState(): void {
    console.log('🧹 Limpiando estado de jornada completamente');
    
    // ✅ Limpiar localStorage PRIMERO
    localStorage.removeItem(this.JORNADA_STORAGE_KEY);
    
    // ✅ Limpiar TODOS los estados del componente
    this.activeClockIn = null;
    this.currentJornada = null;
    this.regularHours = 0;
    this.overtimeHours = 0;
    this.totalHours = 0;
    this.showOvertimeDialog = false;
    
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

  // ============ MÉTODOS PARA EL TEMPLATE - AGREGADOS/CORREGIDOS ============

  /**
   * ✅ NUEVO: Verificar si un campo del formulario tiene errores
   */
  hasFieldError(fieldName: string, form: FormGroup): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  /**
   * ✅ NUEVO: Obtener mensaje de error para un campo específico
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
   * ✅ NUEVO: Obtener etiqueta del campo para mensajes de error
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'notas': 'Las notas',
      'tiempoDescanso': 'El tiempo de descanso'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * ✅ NUEVO: Verificar si se puede fichar entrada
   */
  canClockIn(): boolean {
    return !this.activeClockIn && !this.loading && !this.loadingMasterData && !!this.currentUser;
  }

  /**
   * ✅ NUEVO: Verificar si se puede fichar salida
   */
  canClockOut(): boolean {
    return !!this.activeClockIn && !this.loading && this.clockOutForm.valid;
  }

  /**
   * ✅ NUEVO: Verificar si se puede finalizar forzosamente
   */
  canForceFinish(): boolean {
    return !!this.activeClockIn && this.activeClockIn.isActive && !this.loading;
  }

  /**
   * ✅ NUEVO: Obtener estado de trabajo actual para mostrar
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
   * ✅ NUEVO: Obtener clase CSS para el estado de trabajo
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
   * ✅ NUEVO: Verificar si está en modo horas extras
   */
  get isInOvertimeMode(): boolean {
    return this.activeClockIn?.isOvertimeMode || false;
  }

  /**
   * ✅ NUEVO: Verificar si está cerca del límite
   */
  isNearingLimit(): boolean {
    if (!this.activeClockIn) return false;
    
    if (this.isInOvertimeMode) {
      return this.overtimeHours >= 3; // Advertencia a partir de 3h extras
    }
    
    return this.regularHours >= this.WARNING_HOURS;
  }

  /**
   * ✅ NUEVO: Verificar si ha excedido el límite
   */
  hasExceededLimit(): boolean {
    if (!this.activeClockIn) return false;
    
    if (this.isInOvertimeMode) {
      return this.overtimeHours >= this.MAX_OVERTIME_HOURS;
    }
    
    return this.regularHours >= this.MAX_REGULAR_HOURS;
  }

  /**
   * ✅ NUEVO: Calcular tiempo transcurrido para mostrar
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
   * ✅ NUEVO: Mostrar tiempo restante
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
   * ✅ NUEVO: Mostrar progreso de la jornada
   */
  getWorkDayProgress(): number {
    if (!this.activeClockIn) return 0;

    if (this.isInOvertimeMode) {
      return Math.min(100, (this.overtimeHours / this.MAX_OVERTIME_HOURS) * 100);
    }

    return Math.min(100, (this.regularHours / this.MAX_REGULAR_HOURS) * 100);
  }

  /**
   * ✅ NUEVO: Mostrar horas extras
   */
  getOvertimeDisplay(): string {
    const hours = Math.floor(this.overtimeHours);
    const minutes = Math.floor((this.overtimeHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * ✅ NUEVO: Mostrar total trabajado
   */
  getTotalWorkedDisplay(): string {
    const hours = Math.floor(this.totalHours);
    const minutes = Math.floor((this.totalHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * ✅ NUEVO: Mostrar horas regulares
   */
  getRegularHoursDisplay(): string {
    const hours = Math.floor(this.regularHours);
    const minutes = Math.floor((this.regularHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * ✅ NUEVO: Refrescar registros recientes
   */
  refreshRecentWorkHours(): void {
    this.loadRecentJornadas();
  }

  /**
   * ✅ NUEVO: Formatear horas para mostrar
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
   * ✅ NUEVO: Obtener clase CSS para el estado
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
   * ✅ NUEVO: TrackBy para optimizar rendimiento
   */
  trackByWorkHours(index: number, workHour: any): any {
    return workHour.id || index;
  }

  /**
   * ✅ NUEVO: TrackBy para calendario
   */
  trackByDay(index: number, day: CalendarDay): string {
    return `${day.date.getTime()}-${day.dayNumber}`;
  }

  /**
   * ✅ NUEVO: Obtener total de horas recientes
   */
  getTotalRecentHours(): number {
    return this.recentWorkHours.reduce((total, workHour) => total + (workHour.totalHoras || 0), 0);
  }

  /**
   * ✅ NUEVO: Obtener promedio de horas por día
   */
  getAverageHoursPerDay(): number {
    if (this.recentWorkHours.length === 0) return 0;
    return this.getTotalRecentHours() / this.recentWorkHours.length;
  }

  // ============ MÉTODOS PARA EL CALENDARIO ============

  /**
   * ✅ NUEVO: Obtener mes y año actual
   */
  getCurrentMonthYear(): string {
    return this.currentCalendarDate.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * ✅ NUEVO: Ir al mes anterior
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
   * ✅ NUEVO: Ir al mes siguiente
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
   * ✅ NUEVO: Generar días del calendario
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
   * ✅ NUEVO: Verificar si es el mismo día
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  /**
   * ✅ NUEVO: Buscar horas trabajadas para una fecha
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
   * ✅ NUEVO: Verificar si es día de pago (ejemplo: día 30 de cada mes)
   */
  private isPaymentDay(date: Date): boolean {
    return date.getDate() === 30; // Ejemplo: día 30 es día de pago
  }

  /**
   * ✅ NUEVO: Obtener fecha del último pago
   */
  getLastPaymentDate(): Date {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 30);
  }

  /**
   * ✅ NUEVO: Obtener horas del mes actual
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
   * ✅ NUEVO: Obtener monto pendiente estimado
   */
  getPendingAmount(): number {
    const hoursWorked = this.getCurrentMonthHours();
    const hourlyRate = 5000; // Ejemplo: $5000 por hora
    return hoursWorked * hourlyRate;
  }
}