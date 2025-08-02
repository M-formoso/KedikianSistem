import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Interfaces locales adaptadas al backend
interface WorkHoursRecord {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin?: string;
  tiempoDescanso: number;
  totalHoras: number;
  usuarioId: string;
  notas: string;
  estado: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ClockStatus {
  isActive: boolean;
  startTime: string;
  startTimestamp: Date;
  usuarioId: string;
  reporteId?: string;
}

interface Usuario {
  id?: number;
  nombre: string;
  email: string;
  estado: boolean;
  roles: string;
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
  clockInSubmitted = false;
  
  // Estado de fichaje
  activeClockIn: ClockStatus | null = null;
  elapsedTimeInterval: any;
  
  // Datos maestros desde el backend
  usuarios: Usuario[] = [];
  currentUser: Usuario | null = null;
  
  // Registros recientes
  recentWorkHours: WorkHoursRecord[] = [];
  
  // Propiedad para manejo del calendario
  private currentCalendarDate = new Date();
  
  // Para cancelar suscripciones
  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadMasterData();
    this.loadRecentWorkHours();
    this.setupMobileTable();
    this.checkForActiveClockIn();
  }

  ngOnDestroy(): void {
    if (this.elapsedTimeInterval) {
      clearInterval(this.elapsedTimeInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    // Formulario para fichar entrada (sin proyecto)
    this.clockInForm = this.formBuilder.group({
      usuario: ['', Validators.required]
    });

    // Formulario para fichar salida
    this.clockOutForm = this.formBuilder.group({
      tiempoDescanso: [60, [Validators.required, Validators.min(0)]],
      notas: ['', Validators.maxLength(500)]
    });
  }

  // Configuración para la tabla responsiva en móviles
  setupMobileTable(): void {
    // Implementar lógica para tabla responsiva si es necesario
  }

  // Getter para acceder más fácilmente a los campos del formulario
  get f() {
    return this.clockInForm.controls;
  }

  get fOut() {
    return this.clockOutForm.controls;
  }

  /**
   * Cargar todos los datos maestros necesarios para el formulario
   */
  loadMasterData(): void {
    this.loadingMasterData = true;
    this.error = '';

    // Cargar usuarios desde el backend
    this.http.get<Usuario[]>(`${environment.apiUrl}/usuarios`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (usuarios: Usuario[]) => {
          this.usuarios = usuarios.filter(u => u.estado === true);
          
          // Establecer usuario actual (primer operario activo)
          this.currentUser = this.usuarios.find(u => u.roles === 'operario') || this.usuarios[0] || {
            id: 999,
            nombre: 'Operario Actual',
            email: 'operario@test.com',
            estado: true,
            roles: 'operario'
          };

          // Pre-seleccionar el usuario actual
          if (this.currentUser) {
            this.clockInForm.patchValue({ usuario: this.currentUser.id });
          }

          this.loadingMasterData = false;
        },
        error: (error: any) => {
          console.error('Error cargando usuarios:', error);
          
          // Fallback a usuario mock
          this.currentUser = {
            id: 999,
            nombre: 'Operario Test',
            email: 'operario@test.com',
            estado: true,
            roles: 'operario'
          };
          this.usuarios = [this.currentUser];
          
          if (this.currentUser) {
            this.clockInForm.patchValue({ usuario: this.currentUser.id });
          }
          
          this.loadingMasterData = false;
        }
      });
  }

  /**
   * Cargar registros recientes de horas trabajadas
   */
  loadRecentWorkHours(): void {
    this.http.get<any[]>(`${environment.apiUrl}/reportes-laborales`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reportes: any[]) => {
          // Convertir reportes del backend al formato del frontend
          this.recentWorkHours = reportes.map(reporte => ({
            id: reporte.id.toString(),
            fecha: reporte.fecha_asignacion.split('T')[0],
            horaInicio: new Date(reporte.fecha_asignacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            horaFin: reporte.horas_turno ? new Date(reporte.horas_turno).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '',
            tiempoDescanso: 60, // Valor por defecto
            totalHoras: reporte.horas_turno ? this.calculateHours(reporte.fecha_asignacion, reporte.horas_turno) : 0,
            usuarioId: reporte.usuario_id.toString(),
            notas: '',
            estado: reporte.horas_turno ? 'completado' : 'activo',
            createdAt: new Date(reporte.created || reporte.fecha_asignacion),
            updatedAt: new Date(reporte.updated || reporte.fecha_asignacion)
          }));
        },
        error: (error: any) => {
          console.error('Error cargando registros recientes:', error);
          this.recentWorkHours = [];
        }
      });
  }

  /**
   * Calcular horas entre dos timestamps
   */
  private calculateHours(start: string, end: string): number {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  }

  // Comprobar si hay un fichaje activo guardado
  checkForActiveClockIn(): void {
    const savedClockIn = localStorage.getItem('activeWorkClockIn');
    if (savedClockIn) {
      this.activeClockIn = JSON.parse(savedClockIn);
      // Asegurarse de que startTimestamp sea un objeto Date
      if (this.activeClockIn) {
        this.activeClockIn.startTimestamp = new Date(this.activeClockIn.startTimestamp);
        this.startElapsedTimeCounter();
      }
    }
  }

  /**
   * Fichar entrada (sin selección de proyecto)
   */
  clockIn(): void {
    this.clockInSubmitted = true;
    this.success = false;
    this.error = '';

    if (this.clockInForm.invalid) {
      this.markFormGroupTouched(this.clockInForm);
      return;
    }

    this.loading = true;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    const formValues = this.clockInForm.value;
    const reporteData = {
      usuario_id: parseInt(formValues.usuario),
      fecha_asignacion: now.toISOString(),
      horas_turno: null // Se llenará al hacer clockOut
    };

    this.http.post<any>(`${environment.apiUrl}/reportes-laborales`, reporteData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          if (response && response.id) {
            // Crear estado de fichaje activo
            this.activeClockIn = {
              isActive: true,
              startTime: currentTime,
              startTimestamp: now,
              usuarioId: formValues.usuario,
              reporteId: response.id.toString()
            };

            localStorage.setItem('activeWorkClockIn', JSON.stringify(this.activeClockIn));
            this.startElapsedTimeCounter();
            this.success = true;
            this.clockInSubmitted = false;
            this.clockInForm.reset();

            if (this.currentUser) {
              this.clockInForm.patchValue({ usuario: this.currentUser.id });
            }

            setTimeout(() => { this.success = false; }, 3000);
          } else {
            this.error = 'Error al crear el fichaje';
          }
        },
        error: (error: any) => {
          this.loading = false;
          this.error = 'Error al procesar la solicitud';
          console.error('Error iniciando sesión de trabajo:', error);
        }
      });
  }

  /**
   * Fichar salida
   */
  clockOut(): void {
    if (!this.activeClockIn || !this.activeClockIn.reporteId) return;

    this.loading = true;
    this.error = '';

    const now = new Date();
    const formValues = this.clockOutForm.value;
    
    const updateData = {
      horas_turno: now.toISOString()
    };

    this.http.put<any>(`${environment.apiUrl}/reportes-laborales/${this.activeClockIn.reporteId}`, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          
          if (response) {
            // Limpiar el estado activo
            clearInterval(this.elapsedTimeInterval);
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
          } else {
            this.error = 'Error al finalizar fichaje';
          }
        },
        error: (error: any) => {
          this.loading = false;
          this.error = 'Error al procesar la solicitud';
          console.error('Error finalizando sesión de trabajo:', error);
        }
      });
  }

  // Iniciar contador de tiempo transcurrido
  startElapsedTimeCounter(): void {
    // Limpiar cualquier intervalo existente
    if (this.elapsedTimeInterval) {
      clearInterval(this.elapsedTimeInterval);
    }

    // Actualizar cada minuto
    this.elapsedTimeInterval = setInterval(() => {
      // Esto forzará la actualización del template con getElapsedTime()
      if (this.activeClockIn) {
        this.activeClockIn = { ...this.activeClockIn };
      }
    }, 60000); // 60000 ms = 1 minuto
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
   * Marcar todos los campos del formulario como tocados para mostrar errores
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
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
  refreshRecentWorkHours(): void {
    this.loadRecentWorkHours();
  }

  // ============ MÉTODOS DE UTILIDAD PARA LA VISTA ============

  /**
   * Obtener nombre del usuario por ID
   */
  getUsuarioName(usuarioId: string): string {
    const usuario = this.usuarios.find(u => u.id?.toString() === usuarioId);
    return usuario ? usuario.nombre : 'Usuario desconocido';
  }

  /**
   * Verificar si un campo del formulario tiene errores
   */
  hasFieldError(fieldName: string, formGroup: FormGroup = this.clockInForm): boolean {
    const field = formGroup.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
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
      'usuario': 'El usuario',
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
   * Filtrar usuarios activos
   */
  get activeUsuarios(): Usuario[] {
    return this.usuarios.filter(usuario => usuario.estado !== false);
  }

  /**
   * Formatear horas para mostrar
   */
  formatHours(hours: number): string {
    return `${hours.toFixed(1)}h`;
  }

  /**
   * Obtener estado del reporte
   */
  getWorkHoursStatus(workHours: WorkHoursRecord): string {
    return workHours.estado || 'activo';
  }

  /**
   * Obtener clase CSS para el estado
   */
  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'activo': 'badge-success',
      'pendiente': 'badge-warning',
      'completado': 'badge-info',
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
    return !this.activeClockIn && !this.isLoading && this.clockInForm.valid;
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
  trackByWorkHours(index: number, workHours: WorkHoursRecord): string {
    return workHours.id;
  }

  /**
   * Editar registro de horas trabajadas
   */
  editWorkHours(workHours: WorkHoursRecord): void {
    console.log('Editando registro:', workHours);
    // Implementar lógica de edición
  }

  /**
   * Eliminar registro de horas trabajadas
   */
  deleteWorkHours(workHours: WorkHoursRecord): void {
    if (confirm('¿Está seguro de que desea eliminar este registro?')) {
      this.loading = true;
      this.http.delete<any>(`${environment.apiUrl}/reportes-laborales/${workHours.id}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadRecentWorkHours(); // Recargar la lista
            this.success = true;
            this.loading = false;
            setTimeout(() => { this.success = false; }, 3000);
          },
          error: (error: any) => {
            this.error = 'Error al eliminar el registro';
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
    
    const now = new Date();
    const start = this.activeClockIn.startTimestamp;
    const diffMs = now.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return diffHours >= 8; // Alerta a partir de 8 horas
  }

  /**
   * Verificar si ha superado el límite de 9 horas
   */
  hasExceededLimit(): boolean {
    if (!this.activeClockIn) return false;
    
    const now = new Date();
    const start = this.activeClockIn.startTimestamp;
    const diffMs = now.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return diffHours >= 9; // Límite superado a las 9 horas
  }

  /**
   * Obtener tiempo restante hasta el límite
   */
  getRemainingTime(): string {
    if (!this.activeClockIn) return '';
    
    const now = new Date();
    const start = this.activeClockIn.startTimestamp;
    const diffMs = now.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    const remainingHours = Math.max(0, 9 - diffHours);
    const hours = Math.floor(remainingHours);
    const minutes = Math.floor((remainingHours - hours) * 60);
    
    return remainingHours <= 0 ? 'Límite superado' : `${hours}h ${minutes}m restantes`;
  }

  /**
   * Obtener progreso de la jornada laboral
   */
  getWorkDayProgress(): number {
    if (!this.activeClockIn) return 0;
    
    const now = new Date();
    const start = this.activeClockIn.startTimestamp;
    const diffMs = now.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.min(100, Math.round((diffHours / 9) * 100));
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

  /**
   * Obtener todos los días del calendario
   */
  getCalendarDays(): any[] {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const days = [];
    const currentDate = new Date(startDate);
    const today = new Date();
    
    while (currentDate <= endDate) {
      const dayData = {
        dayNumber: currentDate.getDate(),
        fullDate: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: this.isSameDay(currentDate, today),
        isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
        hasWorkHours: this.hasWorkHoursForDay(currentDate),
        workHours: this.getWorkHoursForDay(currentDate),
        isPaymentDay: this.isPaymentDay(currentDate)
      };
      
      days.push(dayData);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }

  /**
   * TrackBy para optimizar el calendario
   */
  trackByDay(index: number, day: any): any {
    return day.fullDate.getTime();
  }

  /**
   * Obtener fecha del último pago
   */
  getLastPaymentDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 0);
  }

  /**
   * Obtener horas trabajadas en el mes actual
   */
  getCurrentMonthHours(): number {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return this.recentWorkHours
      .filter(workHours => {
        const workDate = new Date(workHours.fecha);
        return workDate.getMonth() === currentMonth && 
               workDate.getFullYear() === currentYear;
      })
      .reduce((total, workHours) => total + workHours.totalHoras, 0);
  }

  /**
   * Obtener monto pendiente de pago
   */
  getPendingAmount(): number {
    const hoursWorked = this.getCurrentMonthHours();
    const hourlyRate = 5000; // Ejemplo: $5000 por hora
    return hoursWorked * hourlyRate;
  }

  /**
   * Obtener promedio de horas por día
   */
  getAverageHoursPerDay(): number {
    if (this.recentWorkHours.length === 0) return 0;
    
    const totalHours = this.getTotalRecentHours();
    const workingDays = this.getWorkingDaysCount();
    
    return workingDays > 0 ? totalHours / workingDays : 0;
  }

  // ============ MÉTODOS AUXILIARES PRIVADOS ============

  /**
   * Verificar si dos fechas son el mismo día
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  /**
   * Verificar si hay horas trabajadas en un día específico
   */
  private hasWorkHoursForDay(date: Date): boolean {
    return this.recentWorkHours.some(workHours => 
      this.isSameDay(new Date(workHours.fecha), date)
    );
  }

  /**
   * Obtener horas trabajadas en un día específico
   */
  private getWorkHoursForDay(date: Date): number {
    const workHours = this.recentWorkHours.find(workHours => 
      this.isSameDay(new Date(workHours.fecha), date)
    );
    return workHours ? workHours.totalHoras : 0;
  }

  /**
   * Verificar si es día de pago
   */
  private isPaymentDay(date: Date): boolean {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.getDate() === 1;
  }

  /**
   * Obtener cantidad de días trabajados únicos
   */
  private getWorkingDaysCount(): number {
    const uniqueDates = new Set(
      this.recentWorkHours.map(workHours => workHours.fecha)
    );
    return uniqueDates.size;
  }
}