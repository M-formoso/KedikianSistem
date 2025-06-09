import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil, forkJoin } from 'rxjs';

// Importar servicios e interfaces
import { 
  ReporteLaboral,
  WorkHoursRequest,
  WorkHoursRecord
} from '../../../core/services/reporte-laboral.service';
import { 
  ProyectoService,
  Proyecto
} from '../../../core/services/proyecto.service';
import { 
  UsuarioService,
  Usuario
} from '../../../core/services/usuario.service';


interface ClockStatus {
  isActive: boolean;
  startTime: string;
  startTimestamp: Date;
  proyecto: string;
  proyectoId: string;
  usuarioId: string;
  reporteId?: string;
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
  proyectos: Proyecto[] = [];
  usuarios: Usuario[] = [];
  currentUser: Usuario | null = null;
  
  // Registros recientes
  recentWorkHours: WorkHoursRecord[] = [];
  
  // Para cancelar suscripciones
  private destroy$ = new Subject<void>();
  
  constructor(
    private formBuilder: FormBuilder,
    private reporteLaboralService: ReporteLaboral,
    private proyectoService: ProyectoService,
    private usuarioService: UsuarioService
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
    // Formulario para fichar entrada
    this.clockInForm = this.formBuilder.group({
      proyecto: ['', Validators.required],
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
    
    // Cargar todos los datos maestros en paralelo
    forkJoin({
      proyectos: this.proyectoService.getActiveProjects(),
      usuarios: this.usuarioService.getActiveUsers(),
      currentUser: this.usuarioService.getCurrentUser()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (responses: any) => {
        // Verificar que todas las respuestas sean exitosas
        if (responses.proyectos && responses.proyectos.success) {
          this.proyectos = responses.proyectos.data || [];
        }
        
        if (responses.usuarios && responses.usuarios.success) {
          this.usuarios = responses.usuarios.data || [];
        }
        
        if (responses.currentUser && responses.currentUser.success) {
          this.currentUser = responses.currentUser.data;
          // Pre-seleccionar el usuario actual
          if (this.currentUser) {
            this.clockInForm.patchValue({ usuario: this.currentUser.id });
          }
        }
        
        this.loadingMasterData = false;
      },
      error: (error: any) => {
        this.error = `Error al cargar datos: ${error.message || error}`;
        this.loadingMasterData = false;
        console.error('Error cargando datos maestros:', error);
      }
    });
  }
  
  /**
   * Cargar registros recientes de horas trabajadas
   */
  loadRecentWorkHours(): void {
    this.reporteLaboralService.getRecentWorkHours(10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.success && response.data) {
            this.recentWorkHours = response.data;
          }
        },
        error: (error: any) => {
          console.error('Error cargando registros recientes:', error);
          // No mostrar error al usuario para registros recientes
        }
      });
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
   * Fichar entrada
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
    const workHoursData: WorkHoursRequest = {
      fecha: new Date().toISOString().split('T')[0],
      horaInicio: currentTime,
      tiempoDescanso: 0, // Se establecerá al fichar salida
      proyectoId: formValues.proyecto,
      usuarioId: formValues.usuario,
      notas: '',
      horaInicioTimestamp: now
    };

    this.reporteLaboralService.startWorkSession(workHoursData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          if (response && response.success) {
            // Crear estado de fichaje activo
            this.activeClockIn = {
              isActive: true,
              startTime: currentTime,
              startTimestamp: now,
              proyecto: this.getProyectoName(formValues.proyecto),
              proyectoId: formValues.proyecto,
              usuarioId: formValues.usuario,
              reporteId: response.data.id
            };
            
            // Guardar en localStorage para persistencia
            localStorage.setItem('activeWorkClockIn', JSON.stringify(this.activeClockIn));
            
            // Iniciar contador de tiempo transcurrido
            this.startElapsedTimeCounter();
            
            this.success = true;
            this.clockInSubmitted = false;
            this.clockInForm.reset();
            
            // Pre-seleccionar el usuario actual nuevamente
            if (this.currentUser) {
              this.clockInForm.patchValue({ usuario: this.currentUser.id });
            }
            
            // Ocultar mensaje de éxito después de 3 segundos
            setTimeout(() => {
              this.success = false;
            }, 3000);
          } else {
            this.error = (response && response.message) || 'Error al iniciar sesión de trabajo';
          }
        },
        error: (error: any) => {
          this.loading = false;
          this.error = error.message || error || 'Error al procesar la solicitud';
          console.error('Error iniciando sesión de trabajo:', error);
        }
      });
  }
  
  /**
   * Fichar salida
   */
  clockOut(): void {
    if (!this.activeClockIn) return;
    
    this.loading = true;
    this.error = '';
    
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;
    
    const formValues = this.clockOutForm.value;
    const updateData = {
      id: this.activeClockIn.reporteId,
      horaFin: currentTime,
      tiempoDescanso: formValues.tiempoDescanso || 60,
      notas: formValues.notas || ''
    };

    this.reporteLaboralService.endWorkSession(updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          if (response && response.success) {
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
            
            // Ocultar mensaje de éxito después de 3 segundos
            setTimeout(() => {
              this.success = false;
            }, 3000);
          } else {
            this.error = (response && response.message) || 'Error al finalizar sesión de trabajo';
          }
        },
        error: (error: any) => {
          this.loading = false;
          this.error = error.message || error || 'Error al procesar la solicitud';
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
   * Obtener nombre del proyecto por ID
   */
  getProyectoName(proyectoId: string): string {
    const proyecto = this.proyectos.find(p => p.id === proyectoId);
    return proyecto ? proyecto.nombre : 'Proyecto desconocido';
  }
  
  /**
   * Obtener nombre del usuario por ID
   */
  getUsuarioName(usuarioId: string): string {
    const usuario = this.usuarios.find(u => u.id === usuarioId);
    return usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario desconocido';
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
      'proyecto': 'El proyecto',
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
   * Filtrar proyectos activos
   */
  get activeProyectos(): Proyecto[] {
    return this.proyectos.filter(proyecto => proyecto.isActive !== false);
  }
  
  /**
   * Filtrar usuarios activos
   */
  get activeUsuarios(): Usuario[] {
    return this.usuarios.filter(usuario => usuario.isActive !== false);
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
   * Obtener reportes por estado
   */
  getWorkHoursByStatus(status: string): WorkHoursRecord[] {
    return this.recentWorkHours.filter(workHours => workHours.estado === status);
  }
  
  /**
   * Verificar si puede fichar entrada
   */
  canClockIn(): boolean {
    return !this.activeClockIn && !this.isLoading;
  }
  
  /**
   * Verificar si puede fichar salida
   */
  canClockOut(): boolean {
    return !!this.activeClockIn && !this.isLoading;
  }
  
  /**
   * Obtener información del fichaje actual
   */
  getCurrentClockInfo(): string {
    if (!this.activeClockIn) return '';
    
    return `Proyecto: ${this.activeClockIn.proyecto} | Inicio: ${this.activeClockIn.startTime}`;
  }
}