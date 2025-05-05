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
}

@Component({
  selector: 'app-work-hours',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  template: `
    <div class="work-hours-container">
      <h2 class="page-title">Registro de Jornada Laboral</h2>
      
      <div class="form-card">
        <h3 class="form-title">Registrar Nueva Jornada</h3>
        
        <form [formGroup]="workHoursForm" (ngSubmit)="onSubmit()">
          <div class="form-row">
            <div class="form-group">
              <label for="date">Fecha</label>
              <input type="date" id="date" formControlName="date" class="form-control">
              <div *ngIf="submitted && f['date'].errors" class="error-message">
                <div *ngIf="f['date'].errors['required']">La fecha es requerida</div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="project">Proyecto</label>
              <select id="project" formControlName="project" class="form-control">
                <option value="">Seleccione un proyecto</option>
                <option *ngFor="let project of projects" [value]="project.id">
                  {{ project.name }}
                </option>
              </select>
              <div *ngIf="submitted && f['project'].errors" class="error-message">
                <div *ngIf="f['project'].errors['required']">El proyecto es requerido</div>
              </div>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="startTime">Hora de Inicio</label>
              <input type="time" id="startTime" formControlName="startTime" class="form-control">
              <div *ngIf="submitted && f['startTime'].errors" class="error-message">
                <div *ngIf="f['startTime'].errors['required']">La hora de inicio es requerida</div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="endTime">Hora de Fin</label>
              <input type="time" id="endTime" formControlName="endTime" class="form-control">
              <div *ngIf="submitted && f['endTime'].errors" class="error-message">
                <div *ngIf="f['endTime'].errors['required']">La hora de fin es requerida</div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="breakTime">Tiempo de Descanso (minutos)</label>
              <input type="number" id="breakTime" formControlName="breakTime" class="form-control">
            </div>
          </div>
          
          <div class="form-group">
            <label for="notes">Notas</label>
            <textarea id="notes" formControlName="notes" class="form-control" rows="3"></textarea>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Registrar Jornada</button>
            <button type="button" class="btn btn-secondary" (click)="resetForm()">Limpiar</button>
          </div>
          
          <div *ngIf="success" class="alert alert-success">
            Jornada registrada exitosamente
          </div>
          
          <div *ngIf="error" class="alert alert-danger">
            {{ error }}
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
                <td>{{ workDay.date | date:'dd/MM/yyyy' }}</td>
                <td>{{ workDay.project }}</td>
                <td>{{ workDay.startTime }}</td>
                <td>{{ workDay.endTime }}</td>
                <td>{{ workDay.breakTime }} min</td>
                <td>{{ workDay.totalHours }} hrs</td>
                <td class="actions-cell">
                  <button class="action-btn edit-btn" title="Editar">✏️</button>
                  <button class="action-btn delete-btn" title="Eliminar">❌</button>
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
    .work-hours-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page-title {
      margin-bottom: 1.5rem;
      font-size: 1.75rem;
      color: #333;
    }
    
    .form-card {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .form-title {
      margin-top: 0;
      margin-bottom: 1.5rem;
      font-size: 1.25rem;
      color: #333;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 1rem;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    
    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }
    
    textarea.form-control {
      resize: vertical;
    }
    
    .form-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }
    
    .btn {
      display: inline-block;
      font-weight: 400;
      text-align: center;
      white-space: nowrap;
      vertical-align: middle;
      user-select: none;
      border: 1px solid transparent;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      line-height: 1.5;
      border-radius: 0.25rem;
      cursor: pointer;
    }
    
    .btn-primary {
      color: #fff;
      background-color: #007bff;
      border-color: #007bff;
    }
    
    .btn-primary:hover {
      background-color: #0069d9;
      border-color: #0062cc;
    }
    
    .btn-secondary {
      color: #333;
      background-color: #f8f9fa;
      border-color: #ddd;
    }
    
    .btn-secondary:hover {
      background-color: #e9ecef;
      border-color: #ccc;
    }
    
    .alert {
      position: relative;
      padding: 0.75rem 1.25rem;
      margin-top: 1rem;
      border: 1px solid transparent;
      border-radius: 0.25rem;
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
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }
    
    .section-title {
      margin: 2rem 0 1rem;
      font-size: 1.25rem;
      color: #333;
    }
    
    .table-responsive {
      overflow-x: auto;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .data-table th,
    .data-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .data-table th {
      background-color: #f8f9fa;
      color: #495057;
      font-weight: 600;
    }
    
    .data-table tbody tr:hover {
      background-color: #f8f9fa;
    }
    
    .empty-table {
      text-align: center;
      color: #6c757d;
      padding: 2rem 0;
    }
    
    .actions-cell {
      white-space: nowrap;
    }
    
    .action-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.25rem;
      padding: 0.25rem;
      margin-right: 0.5rem;
    }
    
    .action-btn:hover {
      opacity: 0.8;
    }
  `]
})
export class WorkHoursComponent implements OnInit {
  workHoursForm: FormGroup;
  submitted = false;
  success = false;
  error = '';
  
  // Datos de ejemplo
  projects = [
    { id: '1', name: 'Construcción Ruta 68' },
    { id: '2', name: 'Extracción Cantera Norte' },
    { id: '3', name: 'Mantención Maquinaria' }
  ];
  
  recentWorkDays: WorkDay[] = [];
  
  constructor(private formBuilder: FormBuilder) {
    this.workHoursForm = this.formBuilder.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      project: ['', Validators.required],
      startTime: ['08:00', Validators.required],
      endTime: ['18:00', Validators.required],
      breakTime: [60],
      notes: ['']
    });
  }
  
  ngOnInit(): void {
    this.loadRecentWorkDays();
  }
  
  // Getter para acceder más fácilmente a los campos del formulario
  get f() { return this.workHoursForm.controls; }
  
  onSubmit() {
    this.submitted = true;
    this.success = false;
    this.error = '';
    
    // Detener si el formulario es inválido
    if (this.workHoursForm.invalid) {
      return;
    }
    
    // Aquí enviaríamos los datos a un servicio
    // Por ahora, simulamos un registro exitoso
    setTimeout(() => {
      this.success = true;
      
      // Agregar el nuevo registro a la lista de recientes (para demostración)
      const formValues = this.workHoursForm.value;
      const projectName = this.projects.find(p => p.id === formValues.project)?.name || 'Desconocido';
      
      const startHour = parseInt(formValues.startTime.split(':')[0], 10);
      const startMin = parseInt(formValues.startTime.split(':')[1], 10);
      const endHour = parseInt(formValues.endTime.split(':')[0], 10);
      const endMin = parseInt(formValues.endTime.split(':')[1], 10);
      
      // Calcular total de horas trabajadas
      let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin) - formValues.breakTime;
      const totalHours = Math.round((totalMinutes / 60) * 10) / 10; // Redondear a 1 decimal
      
      const newWorkDay: WorkDay = {
        id: Math.floor(Math.random() * 1000),
        date: formValues.date,
        startTime: formValues.startTime,
        endTime: formValues.endTime,
        breakTime: formValues.breakTime,
        totalHours: totalHours,
        project: projectName,
        notes: formValues.notes
      };
      
      this.recentWorkDays.unshift(newWorkDay);
      this.resetForm();
    }, 800);
  }
  
  resetForm() {
    this.submitted = false;
    this.workHoursForm.reset({
      date: new Date().toISOString().split('T')[0],
      project: '',
      startTime: '08:00',
      endTime: '18:00',
      breakTime: 60,
      notes: ''
    });
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
}