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

// Interface para el estado del fichaje activo
interface ClockStatus {
  isActive: boolean;
  startTime: string;
  startTimestamp: Date;
  usuarioId: number;
  reporteId: number;
  notas?: string;
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
  
  // Estado de fichaje
  activeClockIn: ClockStatus | null = null;
  elapsedTimeInterval: any;
  
  // Usuario actual
  currentUser: Usuario | null = null;
  
  // Registros recientes
  recentWorkHours: WorkDay[] = [];
  
  // Propiedad para manejo del calendario
  private currentCalendarDate = new Date();
  
  // Para cancelar suscripciones
  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private workHoursService: WorkHoursService,
    private authService: AuthService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.debugCurrentUser(); // 🔍 Debug temporal
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

  // ✅ CORREGIDO: Cargar usuario actual con mejor validación
  private loadCurrentUser(): void {
    this.currentUser = this.authService.obtenerUsuarioActual();
    if (!this.currentUser) {
      this.error = 'No se pudo cargar la información del usuario. Inicie sesión nuevamente.';
      this.authService.cerrarSesion();
    } else {
      console.log('✅ Usuario actual cargado:', this.currentUser);
      console.log('✅ ID del usuario:', this.currentUser.id);
    }
  }

  // ✅ AÑADIDO: Método para debug del usuario actual
  debugCurrentUser(): void {
    console.group('🔍 DEBUG Usuario Actual');
    console.log('Usuario completo:', this.currentUser);
    console.log('ID:', this.currentUser?.id);
    console.log('Tipo de ID:', typeof this.currentUser?.id);
    console.log('Nombre:', this.currentUser?.nombreUsuario);
    console.log('Roles:', this.currentUser?.roles);
    console.groupEnd();
  }

  // Configuración para la tabla responsiva en móviles
  setupMobileTable(): void {
    // Implementación futura para tabla responsiva
  }

  /**
   * Actualizar reloj en tiempo real
   */
  private startClockUpdate(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.activeClockIn) {
          this.activeClockIn = { ...this.activeClockIn }; // Trigger change detection
        }
      });
  }

  // ✅ CORREGIDO: Comprobar fichaje activo con mejor manejo de IDs
  checkForActiveClockIn(): void {
    if (!this.currentUser || !this.currentUser.id) {
      console.warn('⚠️ No hay usuario actual o ID inválido');
      return;
    }

    // Primero verificar localStorage
    const savedClockIn = localStorage.getItem('activeWorkClockIn');
    if (savedClockIn) {
      try {
        const parsed = JSON.parse(savedClockIn);
        this.activeClockIn = {
          ...parsed,
          startTimestamp: new Date(parsed.startTimestamp)
        };
        console.log('✅ Fichaje activo encontrado en localStorage:', this.activeClockIn);
        return;
      } catch (error) {
        console.error('❌ Error parsing localStorage clockIn:', error);
        localStorage.removeItem('activeWorkClockIn');
      }
    }

    // Si no hay en localStorage, verificar en el backend
    const usuarioId = typeof this.currentUser.id === 'string' 
      ? parseInt(this.currentUser.id, 10) 
      : Number(this.currentUser.id);

    if (isNaN(usuarioId)) {
      console.error('❌ ID de usuario inválido para verificar fichaje activo');
      return;
    }

    this.workHoursService.getActiveWorkDay(usuarioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('🔍 Respuesta verificación fichaje activo:', response);
          
          if (response.success && response.data) {
            const reporte = response.data;
            this.activeClockIn = {
              isActive: true,
              startTime: this.extractTime(reporte.fecha_asignacion),
              startTimestamp: new Date(reporte.fecha_asignacion),
              usuarioId: reporte.usuario_id,
              reporteId: reporte.id!
            };
            
            // Guardar en localStorage para persistencia
            localStorage.setItem('activeWorkClockIn', JSON.stringify(this.activeClockIn));
            console.log('✅ Fichaje activo encontrado en backend:', this.activeClockIn);
          } else {
            console.log('ℹ️ No hay fichaje activo en el backend');
          }
        },
        error: (error) => {
          console.error('❌ Error verificando fichaje activo:', error);
        }
      });
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
   * ✅ CORREGIDO: Fichar entrada con validación mejorada
   */
  clockIn(): void {
    if (!this.currentUser || !this.currentUser.id) {
      this.error = 'Usuario no disponible o ID de usuario inválido';
      return;
    }

    this.loading = true;
    this.success = false;
    this.error = '';

    const formValues = this.clockInForm.value;

    console.log('🚀 Iniciando fichaje para usuario ID:', this.currentUser.id);

    // ✅ CORREGIDO: Convertir el ID a número si viene como string
    const usuarioId = typeof this.currentUser.id === 'string' 
      ? parseInt(this.currentUser.id, 10) 
      : Number(this.currentUser.id);

    if (isNaN(usuarioId)) {
      this.error = 'ID de usuario inválido';
      this.loading = false;
      return;
    }

    this.workHoursService.clockIn(usuarioId, formValues.notas)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          console.log('✅ Respuesta del servidor:', response);
          
          if (response.success && response.data) {
            const reporte = response.data;
            const now = new Date();
            
            // Crear estado de fichaje activo
            this.activeClockIn = {
              isActive: true,
              startTime: this.extractTime(reporte.fecha_asignacion),
              startTimestamp: new Date(reporte.fecha_asignacion),
              usuarioId: reporte.usuario_id,
              reporteId: reporte.id!,
              notas: formValues.notas
            };

            localStorage.setItem('activeWorkClockIn', JSON.stringify(this.activeClockIn));
            
            this.success = true;
            this.clockInForm.reset({ notas: '' });

            setTimeout(() => { this.success = false; }, 3000);
            console.log('✅ Fichaje de entrada registrado:', this.activeClockIn);
          } else {
            this.error = response.message || 'Error al registrar fichaje de entrada';
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('❌ Error completo:', error);
          
          // ✅ Manejo específico de errores de validación
          if (error.message && error.message.includes('horas_turno debe ser un número entero')) {
            this.error = 'Error en el formato de datos. Contacte al administrador.';
          } else {
            this.error = error.message || 'Error al procesar la solicitud';
          }
          
          console.error('❌ Error fichando entrada:', error);
        }
      });
  }

  /**
   * ✅ CORREGIDO: Fichar salida con mejor manejo de errores
   */
  clockOut(): void {
    if (!this.activeClockIn || !this.currentUser) {
      this.error = 'No hay fichaje activo';
      return;
    }

    this.loading = true;
    this.error = '';

    const formValues = this.clockOutForm.value;
    
    console.log('🚀 Finalizando fichaje. Reporte ID:', this.activeClockIn.reporteId);
    console.log('🚀 Tiempo de descanso:', formValues.tiempoDescanso);
    
    this.workHoursService.clockOut(
      this.activeClockIn.reporteId, 
      formValues.tiempoDescanso, 
      formValues.notas
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.loading = false;
        console.log('✅ Respuesta clockOut:', response);
        
        if (response.success) {
          // Limpiar el estado activo
          localStorage.removeItem('activeWorkClockIn');
          this.activeClockIn = null;

          // Resetear el formulario de salida
          this.clockOutForm.reset({
            tiempoDescanso: 60,
            notas: ''
          });

          this.success = true;
          this.loadRecentWorkHours(); // Recargar registros recientes

          setTimeout(() => { this.success = false; }, 3000);
          console.log('✅ Fichaje de salida registrado correctamente');
        } else {
          this.error = response.message || 'Error al finalizar fichaje';
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ Error clockOut completo:', error);
        
        // ✅ Manejo específico de errores
        if (error.message && error.message.includes('horas_turno debe ser un número entero')) {
          this.error = 'Error en el cálculo de horas. Contacte al administrador.';
        } else {
          this.error = error.message || 'Error al procesar la solicitud';
        }
        
        console.error('❌ Error fichando salida:', error);
      }
    });
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

  // Calcular tiempo transcurrido desde el fichaje de entrada
  getElapsedTime(): string {
    if (!this.activeClockIn) return '';

    const now = new Date();
    const start = this.activeClockIn.startTimestamp;
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    return `${hours}h ${mins}m`;
  }

  /**
   * Refrescar registros recientes
   */
  refreshRecentWorkHours(): void {
    this.loadRecentWorkHours();
  }

  // ============ MÉTODOS DE UTILIDAD PARA LA VISTA ============

  /**
   * Verificar si un campo del formulario tiene errores
   */
  hasFieldError(fieldName: string, formGroup: FormGroup = this.clockInForm): boolean {
    const field = formGroup.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted) && !field.disabled);
  }

  /**
   * Obtener mensaje de error para un campo específico
   */
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

  /**
   * Obtener etiqueta del campo para mensajes de error
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'tiempoDescanso': 'El tiempo de descanso',
      'notas': 'Las notas'
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
   * Formatear horas para mostrar
   */
  formatHours(hours: number): string {
    return `${hours.toFixed(1)}h`;
  }

  /**
   * Obtener clase CSS para el estado
   */
  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'activo': 'badge-success',
      'pendiente': 'badge-warning',
      'completado': 'badge-secondary',
      'cancelado': 'badge-danger'
    };
    return statusClasses[status] || 'badge-secondary';
  }

  /**
   * Calcular total de horas recientes
   */
  getTotalRecentHours(): number {
    return this.recentWorkHours.reduce((total, workHours) => total + workHours.totalHoras, 0);
  }

  /**
   * Verificar si puede fichar entrada
   */
  canClockIn(): boolean {
    return !this.activeClockIn && !this.isLoading && !!this.currentUser;
  }

  /**
   * Verificar si puede fichar salida
   */
  canClockOut(): boolean {
    return !!this.activeClockIn && !this.isLoading;
  }

  /**
   * TrackBy function para optimizar la renderización de la tabla
   */
  trackByWorkHours(index: number, workHours: WorkDay): string {
    return workHours.id?.toString() || index.toString();
  }

  /**
   * Editar registro de horas trabajadas
   */
  editWorkHours(workHours: WorkDay): void {
    console.log('Editando registro:', workHours);
    // TODO: Implementar lógica de edición
  }

  /**
   * Eliminar registro de horas trabajadas
   */
  deleteWorkHours(workHours: WorkDay): void {
    if (!workHours.id) return;
    
    if (confirm('¿Está seguro de que desea eliminar este registro?')) {
      this.loading = true;
      
      this.workHoursService.deleteWorkDay(workHours.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadRecentWorkHours(); // Recargar la lista
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

  // ============ MÉTODOS DE CONTROL DE LÍMITE DE 9 HORAS ============

  /**
   * Verificar si se acerca al límite de 9 horas
   */
  isNearingLimit(): boolean {
    if (!this.activeClockIn) return false;
    return this.workHoursService.isNearingLimit(this.activeClockIn.startTimestamp);
  }

  /**
   * Verificar si ha superado el límite de 9 horas
   */
  hasExceededLimit(): boolean {
    if (!this.activeClockIn) return false;
    return this.workHoursService.hasExceededLimit(this.activeClockIn.startTimestamp);
  }

  /**
   * Obtener tiempo restante hasta el límite
   */
  getRemainingTime(): string {
    if (!this.activeClockIn) return '';
    
    const elapsed = this.workHoursService.calculateElapsedTime(this.activeClockIn.startTimestamp);
    const totalHours = elapsed.hours + (elapsed.minutes / 60);
    
    const remainingHours = Math.max(0, 9 - totalHours);
    const hours = Math.floor(remainingHours);
    const minutes = Math.floor((remainingHours - hours) * 60);
    
    return remainingHours <= 0 ? 'Límite superado' : `${hours}h ${minutes}m restantes`;
  }

  /**
   * Obtener progreso de la jornada laboral
   */
  getWorkDayProgress(): number {
    if (!this.activeClockIn) return 0;
    
    const elapsed = this.workHoursService.calculateElapsedTime(this.activeClockIn.startTimestamp);
    const totalHours = elapsed.hours + (elapsed.minutes / 60);
    
    return Math.min(100, Math.round((totalHours / 9) * 100));
  }

  // ============ MÉTODOS DE CALENDARIO ============

  /**
   * Obtener mes y año actual del calendario
   */
  getCurrentMonthYear(): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    return `${months[this.currentCalendarDate.getMonth()]} ${this.currentCalendarDate.getFullYear()}`;
  }

  /**
   * Navegar al mes anterior
   */
  previousMonth(): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() - 1,
      1
    );
  }

  /**
   * Navegar al mes siguiente
   */
  nextMonth(): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() + 1,
      1
    );
  }

  getCalendarDays(): any[] {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    
    // Primer día del mes
    const firstDay = new Date(year, month, 1);
    // Último día del mes
    const lastDay = new Date(year, month + 1, 0);
    
    // Primer día de la semana del calendario (lunes = 1, domingo = 0)
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    // Días del mes anterior necesarios
    const daysFromPrevMonth = firstDayOfWeek;
    
    // Último día del mes anterior
    const lastDayPrevMonth = new Date(year, month, 0).getDate();
    
    const calendarDays: any[] = [];
    
    // Agregar días del mes anterior
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      calendarDays.push({
        day: lastDayPrevMonth - i,
        isCurrentMonth: false,
        isToday: false,
        date: new Date(year, month - 1, lastDayPrevMonth - i)
      });
    }
    
    // Agregar días del mes actual
    const today = new Date();
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currentDate = new Date(year, month, day);
      const isToday = today.getFullYear() === year && 
                     today.getMonth() === month && 
                     today.getDate() === day;
      
      calendarDays.push({
        day: day,
        isCurrentMonth: true,
        isToday: isToday,
        date: currentDate
      });
    }
    
    // Completar hasta tener 42 días (6 semanas x 7 días)
    const remainingDays = 42 - calendarDays.length;
    for (let day = 1; day <= remainingDays; day++) {
      calendarDays.push({
        day: day,
        isCurrentMonth: false,
        isToday: false,
        date: new Date(year, month + 1, day)
      });
    }
    
    return calendarDays;
  }

  // ============ MÉTODOS FALTANTES PARA EL TEMPLATE ============

  /**
   * Obtener fecha del último pago
   */
  getLastPaymentDate(): Date | null {
    if (this.recentWorkHours.length === 0) return null;
    
    // Si no tienes fechaPago, usar la fecha del último registro
    const lastWork = this.recentWorkHours
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
    
    return lastWork ? new Date(lastWork.fecha) : null;
  }

  /**
   * Obtener horas del mes actual
   */
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

  /**
   * Obtener monto pendiente de pago
   */
  getPendingAmount(): number {
    const lastPaymentDate = this.getLastPaymentDate();
    
    // Si no hay fecha de último pago, considerar todas las horas como pendientes
    if (!lastPaymentDate) {
      const totalHours = this.recentWorkHours
        .reduce((total, workDay) => total + workDay.totalHoras, 0);
      const hourlyRate = 6500;
      return totalHours * hourlyRate;
    }
    
    // Calcular horas trabajadas después de la última fecha de pago
    const pendingHours = this.recentWorkHours
      .filter(workDay => {
        const workDate = new Date(workDay.fecha);
        return workDate > lastPaymentDate;
      })
      .reduce((total, workDay) => total + workDay.totalHoras, 0);
    
    // Tarifa por hora
    const hourlyRate = 6500; // Pesos argentinos por hora
    
    return pendingHours * hourlyRate;
  }

  /**
   * TrackBy function para optimizar la renderización del calendario
   */
  trackByDay(index: number, day: any): string {
    return `${day.date.getTime()}-${day.isCurrentMonth}`;
  }

  /**
   * Obtener promedio de horas por día trabajado
   */
  getAverageHoursPerDay(): number {
    if (this.recentWorkHours.length === 0) return 0;
    
    const totalHours = this.recentWorkHours.reduce((total, workDay) => total + workDay.totalHoras, 0);
    const workingDays = this.recentWorkHours.length;
    
    return totalHours / workingDays;
  }
}