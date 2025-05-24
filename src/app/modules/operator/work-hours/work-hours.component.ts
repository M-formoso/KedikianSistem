import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

interface WorkDay {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  breakTime: number;
  totalHours: number;
  project: string;
  notes: string;
  clockInTimestamp?: Date; // Nuevo: hora exacta en que fichó
}

interface ClockStatus {
  isActive: boolean;
  startTime: string;
  startTimestamp: Date;
  project: string;
}

@Component({
  selector: 'app-work-hours',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  template: `
    <div class="work-hours-container">
      <h2 class="page-title">Registro de Jornada Laboral</h2>
      
      <!-- Nuevo panel de fichaje -->
      <div class="form-card" *ngIf="!activeClockIn">
        <h3 class="form-title">Fichar Entrada</h3>
        
        <form [formGroup]="clockInForm" (ngSubmit)="clockIn()">
          <div class="form-compact">
            <div class="form-group">
              <label for="project">Proyecto</label>
              <select id="project" formControlName="project" class="form-control">
                <option value="">Seleccione un proyecto</option>
                <option *ngFor="let project of projects" [value]="project.id">
                  {{ project.name }}
                </option>
              </select>
              <div *ngIf="clockInSubmitted && clockInForm.get('project')?.errors" class="error-message">
                <div *ngIf="clockInForm.get('project')?.errors?.['required']">El proyecto es requerido</div>
              </div>
            </div>
            
            <div class="form-group clock-in-action">
              <button type="submit" class="btn btn-primary btn-clock-in">
                <span class="clock-icon">⏱️</span> Fichar Entrada
              </button>
            </div>
          </div>
        </form>
      </div>
      
      <!-- Panel de jornada activa -->
      <div class="form-card active-work-day" *ngIf="activeClockIn">
        <h3 class="form-title">Jornada Activa</h3>
        
        <div class="active-session-info">
          <div class="active-info-row">
            <div class="active-info-item">
              <span class="info-label">Proyecto:</span>
              <span class="info-value">{{ getProjectName(activeClockIn.project) }}</span>
            </div>
            
            <div class="active-info-item">
              <span class="info-label">Hora de entrada:</span>
              <span class="info-value">{{ activeClockIn.startTime }}</span>
            </div>
            
            <div class="active-info-item">
              <span class="info-label">Tiempo transcurrido:</span>
              <span class="info-value">{{ getElapsedTime() }}</span>
            </div>
          </div>
        </div>
        
        <form [formGroup]="clockOutForm" (ngSubmit)="clockOut()">
          <div class="form-compact">
            <div class="form-group">
              <label for="breakTime">Tiempo de Descanso (minutos)</label>
              <input type="number" id="breakTime" formControlName="breakTime" class="form-control">
            </div>
            
            <div class="form-group">
              <label for="notes">Notas</label>
              <textarea id="notes" formControlName="notes" class="form-control" rows="2"></textarea>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-danger">
              <span class="clock-icon">⏱️</span> Fichar Salida
            </button>
          </div>
        </form>
      </div>
      
      <div class="recent-records">
        <h3 class="section-title">Registros Recientes</h3>
        
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proyecto</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Descanso</th>
                <th>Total Horas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let workDay of recentWorkDays">
                <td [attr.data-label]="'Fecha'">{{ workDay.date | date:'dd/MM/yyyy' }}</td>
                <td [attr.data-label]="'Proyecto'">{{ workDay.project }}</td>
                <td [attr.data-label]="'Entrada'">{{ workDay.startTime }}</td>
                <td [attr.data-label]="'Salida'">{{ workDay.endTime }}</td>
                <td [attr.data-label]="'Descanso'">{{ workDay.breakTime }} min</td>
                <td [attr.data-label]="'Total Horas'">{{ workDay.totalHours }} hrs</td>
                <td [attr.data-label]="'Acciones'" class="actions-cell">
                  <button class="action-btn edit-btn" title="Editar" *ngIf="!activeClockIn">✏️</button>
                  <button class="action-btn delete-btn" title="Eliminar" *ngIf="!activeClockIn">❌</button>
                </td>
              </tr>
              <tr *ngIf="recentWorkDays.length === 0">
                <td colspan="7" class="empty-table">No hay registros recientes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Estilos base */
    .work-hours-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      padding: 0 5px;
      box-sizing: border-box;
      overflow-x: hidden;
    }
    
    .page-title {
      margin-bottom: 1rem;
      font-size: 1.25rem;
      color: #333;
      text-align: center;
    }
    
    .form-card {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      padding: 1rem;
      margin: 0 auto 1rem auto;
      max-width: 100%;
      overflow-x: hidden;
    }
    
    .active-work-day {
      border-left: 4px solid #28a745;
    }
    
    .form-title {
      margin-top: 0;
      margin-bottom: 1rem;
      font-size: 1.1rem;
      color: #333;
      text-align: center;
    }
    
    .form-compact {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 100%;
    }
    
    .clock-in-action {
      display: flex;
      align-items: flex-end;
    }
    
    .active-session-info {
      background-color: #f8f9fa;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    
    .active-info-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }
    
    .active-info-item {
      margin-bottom: 0.5rem;
    }
    
    .info-label {
      font-weight: 600;
      margin-right: 0.25rem;
      font-size: 0.9rem;
    }
    
    .info-value {
      color: #333;
      font-size: 0.9rem;
    }
    
    .clock-icon {
      font-size: 1rem;
      margin-right: 0.5rem;
    }
    
    .btn-clock-in {
      padding: 0.5rem 0.75rem;
      font-size: 0.9rem;
      width: 100%;
    }
    
    .form-group {
      margin-bottom: 0.5rem;
      width: 100%;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 0.25rem;
      font-weight: 500;
      font-size: 0.9rem;
    }
    
    .form-control {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 0.9rem;
      box-sizing: border-box;
    }
    
    textarea.form-control {
      resize: vertical;
    }
    
    .form-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
      width: 100%;
    }
    
    .btn {
      display: inline-block;
      font-weight: 400;
      text-align: center;
      white-space: nowrap;
      vertical-align: middle;
      user-select: none;
      border: 1px solid transparent;
      padding: 0.5rem 0.75rem;
      font-size: 0.9rem;
      line-height: 1.5;
      border-radius: 0.25rem;
      cursor: pointer;
    }
    
    .btn-primary {
      color: #fff;
      background-color: #007bff;
      border-color: #007bff;
      flex: 1;
    }
    
    .btn-primary:hover {
      background-color: #0069d9;
      border-color: #0062cc;
    }
    
    .btn-danger {
      color: #fff;
      background-color: #dc3545;
      border-color: #dc3545;
      flex: 1;
    }
    
    .btn-danger:hover {
      background-color: #c82333;
      border-color: #bd2130;
    }
    
    .btn-secondary {
      color: #333;
      background-color: #f8f9fa;
      border-color: #ddd;
      flex: 1;
    }
    
    .btn-secondary:hover {
      background-color: #e9ecef;
      border-color: #ccc;
    }
    
    .alert {
      position: relative;
      padding: 0.5rem 0.75rem;
      margin-top: 0.75rem;
      border: 1px solid transparent;
      border-radius: 0.25rem;
      font-size: 0.85rem;
    }
    
    .alert-success {
      color: #155724;
      background-color: #d4edda;
      border-color: #c3e6cb;
    }
    
    .alert-danger {
      color: #721c24;
      background-color: #f8d7da;
      border-color: #f5c6cb;
    }
    
    .error-message {
      color: #dc3545;
      font-size: 0.75rem;
      margin-top: 0.15rem;
    }
    
    .section-title {
      margin: 1rem 0 0.75rem;
      font-size: 1.1rem;
      color: #333;
      text-align: center;
    }
    
    .table-responsive {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin-bottom: 1rem;
      width: 100%;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    
    .data-table th,
    .data-table td {
      padding: 0.5rem;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
      font-size: 0.85rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .data-table th {
      background-color: #f8f9fa;
      color: #495057;
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    
    .data-table tbody tr:hover {
      background-color: #f8f9fa;
    }
    
    .empty-table {
      text-align: center;
      color: #6c757d;
      padding: 1rem 0;
    }
    
    .actions-cell {
      white-space: nowrap;
    }
    
    .action-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      padding: 0.15rem;
      margin-right: 0.25rem;
    }
    
    .action-btn:hover {
      opacity: 0.8;
    }
    
    /* Media Queries para mejor responsividad */
    @media screen and (max-width: 768px) {
      .work-hours-container {
        padding: 0 5px;
      }
      
      .form-card {
        padding: 0.75rem;
        max-width: 100%;
      }
      
      .active-info-row {
        flex-direction: column;
        gap: 0.5rem;
      }
      
      .active-info-item {
        margin-bottom: 0.25rem;
      }
      
      .form-control {
        padding: 0.45rem;
        font-size: 0.85rem;
      }
      
      .btn {
        padding: 0.45rem 0.65rem;
        font-size: 0.85rem;
      }
      
      /* Ajustes específicos para la tabla en tablets */
      .data-table {
        min-width: 100%;
        table-layout: auto;
      }
      
      .data-table th,
      .data-table td {
        padding: 0.4rem;
        font-size: 0.8rem;
      }
    }
    
    @media screen and (max-width: 480px) {
      .work-hours-container {
        padding: 0;
      }
      
      .page-title {
        font-size: 1.1rem;
        margin-bottom: 0.75rem;
      }
      
      .form-card {
        padding: 0.5rem;
        max-width: 100%;
        border-radius: 0; /* Quita bordes redondeados en móviles */
      }
      
      .active-session-info {
        padding: 0.75rem;
      }
      
      .active-info-row {
        flex-direction: column;
        gap: 0.25rem;
      }
      
      .active-info-item {
        margin-bottom: 0.15rem;
      }
      
      .form-group label {
        font-size: 0.85rem;
        margin-bottom: 0.15rem;
      }
      
      .form-control {
        padding: 0.4rem;
        font-size: 0.8rem;
      }
      
      textarea.form-control {
        height: 50px;
      }
      
      /* Ajustes específicos para la tabla en móviles */
      .data-table {
        /* Convertir tabla a formato de lista en móviles */
        display: block;
        width: 100%;
      }
      
      .data-table thead {
        display: none; /* Ocultar encabezados en móviles */
      }
      
      .data-table tbody {
        display: block;
        width: 100%;
      }
      
      .data-table tr {
        display: block;
        border-bottom: 2px solid #ddd;
        margin-bottom: 0.5rem;
        padding: 0.5rem 0;
      }
      
      .data-table td {
        display: block;
        text-align: right;
        border-bottom: 1px solid #eee;
        padding: 0.35rem 0.5rem;
        position: relative;
        overflow: visible;
        white-space: normal;
      }
      
      .data-table td:before {
        content: attr(data-label);
        float: left;
        font-weight: 600;
        color: #495057;
      }
      
      /* Forzar el ancho completo en dispositivos pequeños */
      body, html {
        max-width: 100vw;
        overflow-x: hidden;
      }
    }
  `]
})
export class WorkHoursComponent implements OnInit {
  // Formulario original (ahora dividido en dos)
  clockInForm: FormGroup;
  clockOutForm: FormGroup;
  
  // Estado de fichaje
  activeClockIn: ClockStatus | null = null;
  clockInSubmitted = false;
  elapsedTimeInterval: any;
  
  // Datos de ejemplo
  projects = [
    { id: '1', name: 'Construcción Ruta 68' },
    { id: '2', name: 'Extracción Cantera Norte' },
    { id: '3', name: 'Mantención Maquinaria' }
  ];
  
  recentWorkDays: WorkDay[] = [];
  
  constructor(private formBuilder: FormBuilder) {
    // Formulario para fichar entrada
    this.clockInForm = this.formBuilder.group({
      project: ['', Validators.required]
    });
    
    // Formulario para fichar salida
    this.clockOutForm = this.formBuilder.group({
      breakTime: [60],
      notes: ['']
    });
    
    // Verificar si hay un fichaje activo en localStorage
    this.checkForActiveClockIn();
  }
  
  ngOnInit(): void {
    this.loadRecentWorkDays();
    // Configuración para la tabla responsiva
    this.setupMobileTable();
  }
  
  // Configuración para la tabla responsiva en móviles
  setupMobileTable() {
    // Esta función se mantiene para seguir el mismo patrón que MachineHoursComponent
  }
  
  // Comprobar si hay un fichaje activo guardado
  checkForActiveClockIn(): void {
    const savedClockIn = localStorage.getItem('activeClockIn');
    if (savedClockIn) {
      this.activeClockIn = JSON.parse(savedClockIn);
      // Asegurarse de que startTimestamp sea un objeto Date
      if (this.activeClockIn) {
        this.activeClockIn.startTimestamp = new Date(this.activeClockIn.startTimestamp);
        this.startElapsedTimeCounter();
      }
    }
  }
  
  // Fichar entrada
  clockIn(): void {
    this.clockInSubmitted = true;
    
    if (this.clockInForm.invalid) {
      return;
    }
    
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;
    
    this.activeClockIn = {
      isActive: true,
      startTime: currentTime,
      startTimestamp: now,
      project: this.clockInForm.value.project
    };
    
    // Guardar en localStorage para persistencia
    localStorage.setItem('activeClockIn', JSON.stringify(this.activeClockIn));
    
    // Iniciar contador de tiempo transcurrido
    this.startElapsedTimeCounter();
    
    // Resetear el formulario de fichaje
    this.clockInSubmitted = false;
    this.clockInForm.reset();
  }
  
  // Fichar salida
  clockOut(): void {
    if (!this.activeClockIn) return;
    
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;
    
    // Calcular total de horas trabajadas
    const startTime = this.activeClockIn.startTime;
    const breakTime = this.clockOutForm.value.breakTime || 0;
    
    const startHour = parseInt(startTime.split(':')[0], 10);
    const startMin = parseInt(startTime.split(':')[1], 10);
    const endHour = parseInt(currentTime.split(':')[0], 10);
    const endMin = parseInt(currentTime.split(':')[1], 10);
    
    // Calcular total de horas trabajadas
    let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin) - breakTime;
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10; // Redondear a 1 decimal
    
    const projectName = this.getProjectName(this.activeClockIn.project);
    
    const newWorkDay: WorkDay = {
      id: Math.floor(Math.random() * 1000),
      date: new Date().toISOString().split('T')[0],
      startTime: this.activeClockIn.startTime,
      endTime: currentTime,
      breakTime: breakTime,
      totalHours: totalHours,
      project: projectName,
      notes: this.clockOutForm.value.notes || '',
      clockInTimestamp: this.activeClockIn.startTimestamp
    };
    
    // Agregar el registro a la lista
    this.recentWorkDays.unshift(newWorkDay);
    
    // Limpiar el estado activo
    clearInterval(this.elapsedTimeInterval);
    localStorage.removeItem('activeClockIn');
    this.activeClockIn = null;
    
    // Resetear el formulario de salida
    this.clockOutForm.reset({
      breakTime: 60,
      notes: ''
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
  
  // Obtener nombre del proyecto por ID
  getProjectName(projectId: string): string {
    const project = this.projects.find(p => p.id === projectId);
    return project ? project.name : 'Desconocido';
  }
  
  loadRecentWorkDays() {
    // Simulamos la carga de datos recientes
    this.recentWorkDays = [
      {
        id: 1,
        date: '2025-04-30',
        startTime: '08:00',
        endTime: '18:00',
        breakTime: 60,
        totalHours: 9.0,
        project: 'Construcción Ruta 68',
        notes: 'Trabajo en excavación de cimientos'
      },
      {
        id: 2,
        date: '2025-04-29',
        startTime: '08:30',
        endTime: '17:30',
        breakTime: 45,
        totalHours: 8.25,
        project: 'Extracción Cantera Norte',
        notes: 'Extracción de áridos para proyecto municipal'
      }
    ];
  }
  
  ngOnDestroy(): void {
    if (this.elapsedTimeInterval) {
      clearInterval(this.elapsedTimeInterval);
    }
  }
}