import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

interface MachineHours {
  id: number;
  date: string;
  machineType: string;
  machineId: string;
  startHour: number;
  endHour: number;
  totalHours: number;
  project: string;
  operator: string;
  fuelUsed: number;
  notes: string;
}

@Component({
  selector: 'app-machine-hours',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  template: `
    <div class="machine-hours-container">
      <h2 class="page-title">Registro de Horas Máquina</h2>
      
      <div class="form-card">
        <h3 class="form-title">Registrar Horas de Uso de Maquinaria</h3>
        
        <form [formGroup]="machineHoursForm" (ngSubmit)="onSubmit()">
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
              <label for="machineType">Tipo de Máquina</label>
              <select id="machineType" formControlName="machineType" class="form-control">
                <option value="">Seleccione tipo de máquina</option>
                <option *ngFor="let type of machineTypes" [value]="type.id">
                  {{ type.name }}
                </option>
              </select>
              <div *ngIf="submitted && f['machineType'].errors" class="error-message">
                <div *ngIf="f['machineType'].errors['required']">El tipo de máquina es requerido</div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="machineId">ID de Máquina</label>
              <select id="machineId" formControlName="machineId" class="form-control">
                <option value="">Seleccione una máquina</option>
                <option *ngFor="let machine of machines" [value]="machine.id">
                  {{ machine.name }} ({{ machine.id }})
                </option>
              </select>
              <div *ngIf="submitted && f['machineId'].errors" class="error-message">
                <div *ngIf="f['machineId'].errors['required']">La máquina es requerida</div>
              </div>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="operator">Operador</label>
              <select id="operator" formControlName="operator" class="form-control">
                <option value="">Seleccione un operador</option>
                <option *ngFor="let op of operators" [value]="op.id">
                  {{ op.name }}
                </option>
              </select>
              <div *ngIf="submitted && f['operator'].errors" class="error-message">
                <div *ngIf="f['operator'].errors['required']">El operador es requerido</div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="startHour">Lectura Inicial (horas)</label>
              <input type="number" id="startHour" formControlName="startHour" class="form-control">
              <div *ngIf="submitted && f['startHour'].errors" class="error-message">
                <div *ngIf="f['startHour'].errors['required']">La lectura inicial es requerida</div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="endHour">Lectura Final (horas)</label>
              <input type="number" id="endHour" formControlName="endHour" class="form-control">
              <div *ngIf="submitted && f['endHour'].errors" class="error-message">
                <div *ngIf="f['endHour'].errors['required']">La lectura final es requerida</div>
              </div>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="fuelUsed">Combustible Utilizado (litros)</label>
              <input type="number" id="fuelUsed" formControlName="fuelUsed" class="form-control">
            </div>
          </div>
          
          <div class="form-group">
            <label for="notes">Observaciones</label>
            <textarea id="notes" formControlName="notes" class="form-control" rows="3"></textarea>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Registrar Horas</button>
            <button type="button" class="btn btn-secondary" (click)="resetForm()">Limpiar</button>
          </div>
          
          <div *ngIf="success" class="alert alert-success">
            Horas de máquina registradas exitosamente
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
                <th>Máquina</th>
                <th>Proyecto</th>
                <th>Operador</th>
                <th>Horas Trabajadas</th>
                <th>Combustible</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let record of recentRecords">
                <td>{{ record.date | date:'dd/MM/yyyy' }}</td>
                <td>{{ getMachineName(record.machineId) }}</td>
                <td>{{ getProjectName(record.project) }}</td>
                <td>{{ getOperatorName(record.operator) }}</td>
                <td>{{ record.totalHours }} hrs</td>
                <td>{{ record.fuelUsed }} L</td>
                <td class="actions-cell">
                  <button class="action-btn edit-btn" title="Editar">✏️</button>
                  <button class="action-btn delete-btn" title="Eliminar">❌</button>
                </td>
              </tr>
              <tr *ngIf="recentRecords.length === 0">
                <td colspan="7" class="empty-table">No hay registros recientes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .machine-hours-container {
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
export class MachineHoursComponent implements OnInit {
  machineHoursForm: FormGroup;
  submitted = false;
  success = false;
  error = '';
  
  // Datos de ejemplo
  projects = [
    { id: '1', name: 'Construcción Ruta 68' },
    { id: '2', name: 'Extracción Cantera Norte' },
    { id: '3', name: 'Mantención Maquinaria' }
  ];
  
  machineTypes = [
    { id: '1', name: 'Retroexcavadora' },
    { id: '2', name: 'Excavadora' },
    { id: '3', name: 'Cargador Frontal' },
    { id: '4', name: 'Bulldozer' }
  ];
  
  machines = [
    { id: 'M001', name: 'Retroexcavadora JCB', type: '1' },
    { id: 'M002', name: 'Excavadora CAT 320', type: '2' },
    { id: 'M003', name: 'Cargador Komatsu', type: '3' },
    { id: 'M004', name: 'Bulldozer D6', type: '4' }
  ];
  
  operators = [
    { id: '1', name: 'Juan Pérez' },
    { id: '2', name: 'Carlos Rodríguez' },
    { id: '3', name: 'Miguel González' }
  ];
  
  recentRecords: MachineHours[] = [];
  
  constructor(private formBuilder: FormBuilder) {
    this.machineHoursForm = this.formBuilder.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      project: ['', Validators.required],
      machineType: ['', Validators.required],
      machineId: ['', Validators.required],
      operator: ['', Validators.required],
      startHour: ['', Validators.required],
      endHour: ['', Validators.required],
      fuelUsed: ['0'],
      notes: ['']
    });
  }
  
  ngOnInit(): void {
    this.loadRecentRecords();
  }
  
  // Getter para acceder más fácilmente a los campos del formulario
  get f() { return this.machineHoursForm.controls; }
  
  onSubmit() {
    this.submitted = true;
    this.success = false;
    this.error = '';
    
    // Detener si el formulario es inválido
    if (this.machineHoursForm.invalid) {
      return;
    }
    
    // Aquí enviaríamos los datos a un servicio
    // Por ahora, simulamos un registro exitoso
    setTimeout(() => {
      this.success = true;
      
      // Agregar el nuevo registro a la lista de recientes (para demostración)
      const formValues = this.machineHoursForm.value;
      
      const startHour = parseFloat(formValues.startHour);
      const endHour = parseFloat(formValues.endHour);
      
      // Calcular total de horas trabajadas
      const totalHours = Math.round((endHour - startHour) * 10) / 10; // Redondear a 1 decimal
      
      const newRecord: MachineHours = {
        id: Math.floor(Math.random() * 1000),
        date: formValues.date,
        machineType: formValues.machineType,
        machineId: formValues.machineId,
        startHour: startHour,
        endHour: endHour,
        totalHours: totalHours,
        project: formValues.project,
        operator: formValues.operator,
        fuelUsed: parseFloat(formValues.fuelUsed) || 0,
        notes: formValues.notes
      };
      
      this.recentRecords.unshift(newRecord);
      this.resetForm();
    }, 800);
  }
  
  resetForm() {
    this.submitted = false;
    this.machineHoursForm.reset({
      date: new Date().toISOString().split('T')[0],
      project: '',
      machineType: '',
      machineId: '',
      operator: '',
      startHour: '',
      endHour: '',
      fuelUsed: '0',
      notes: ''
    });
  }
  
  loadRecentRecords() {
    // Simulamos la carga de datos recientes
    this.recentRecords = [
      {
        id: 1,
        date: '2025-04-30',
        machineType: '1',
        machineId: 'M001',
        startHour: 2450.5,
        endHour: 2458.2,
        totalHours: 7.7,
        project: '1',
        operator: '1',
        fuelUsed: 45,
        notes: 'Excavación para cimientos'
      },
      {
        id: 2,
        date: '2025-04-29',
        machineType: '2',
        machineId: 'M002',
        startHour: 3780.0,
        endHour: 3788.5,
        totalHours: 8.5,
        project: '2',
        operator: '2',
        fuelUsed: 60,
        notes: 'Extracción de material'
      }
    ];
  }
  
  getMachineName(machineId: string): string {
    const machine = this.machines.find(m => m.id === machineId);
    return machine ? machine.name : 'Desconocido';
  }
  
  getProjectName(projectId: string): string {
    const project = this.projects.find(p => p.id === projectId);
    return project ? project.name : 'Desconocido';
  }
  
  getOperatorName(operatorId: string): string {
    const operator = this.operators.find(o => o.id === operatorId);
    return operator ? operator.name : 'Desconocido';
  }
}