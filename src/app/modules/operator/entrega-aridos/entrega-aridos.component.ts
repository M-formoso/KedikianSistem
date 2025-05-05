import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

interface AridosDelivery {
  id: number;
  date: string;
  project: string;
  materialType: string;
  quantity: number;
  unit: string;
  destination: string;
  vehicleId: string;
  operator: string;
  notes: string;
}

@Component({
  selector: 'app-entrega-aridos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  template: `
    <div class="aridos-delivery-container">
      <h2 class="page-title">Registro de Entrega de Áridos</h2>
      
      <div class="form-card">
        <h3 class="form-title">Registrar Entrega de Material</h3>
        
        <form [formGroup]="aridosDeliveryForm" (ngSubmit)="onSubmit()">
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
              <label for="materialType">Tipo de Material</label>
              <select id="materialType" formControlName="materialType" class="form-control">
                <option value="">Seleccione tipo de material</option>
                <option *ngFor="let material of materialTypes" [value]="material.id">
                  {{ material.name }}
                </option>
              </select>
              <div *ngIf="submitted && f['materialType'].errors" class="error-message">
                <div *ngIf="f['materialType'].errors['required']">El tipo de material es requerido</div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="quantity">Cantidad</label>
              <input type="number" id="quantity" formControlName="quantity" class="form-control" step="0.1">
              <div *ngIf="submitted && f['quantity'].errors" class="error-message">
                <div *ngIf="f['quantity'].errors['required']">La cantidad es requerida</div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="unit">Unidad</label>
              <select id="unit" formControlName="unit" class="form-control">
                <option value="m3">Metros cúbicos (m³)</option>
                <option value="ton">Toneladas (ton)</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="destination">Destino</label>
              <input type="text" id="destination" formControlName="destination" class="form-control">
              <div *ngIf="submitted && f['destination'].errors" class="error-message">
                <div *ngIf="f['destination'].errors['required']">El destino es requerido</div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="vehicleId">Vehículo</label>
              <select id="vehicleId" formControlName="vehicleId" class="form-control">
                <option value="">Seleccione un vehículo</option>
                <option *ngFor="let vehicle of vehicles" [value]="vehicle.id">
                  {{ vehicle.name }} ({{ vehicle.id }})
                </option>
              </select>
              <div *ngIf="submitted && f['vehicleId'].errors" class="error-message">
                <div *ngIf="f['vehicleId'].errors['required']">El vehículo es requerido</div>
              </div>
            </div>
            
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
          </div>
          
          <div class="form-group">
            <label for="notes">Observaciones</label>
            <textarea id="notes" formControlName="notes" class="form-control" rows="3"></textarea>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Registrar Entrega</button>
            <button type="button" class="btn btn-secondary" (click)="resetForm()">Limpiar</button>
          </div>
          
          <div *ngIf="success" class="alert alert-success">
            Entrega de áridos registrada exitosamente
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
                <th>Material</th>
                <th>Cantidad</th>
                <th>Destino</th>
                <th>Vehículo</th>
                <th>Operador</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let record of recentRecords">
                <td>{{ record.date | date:'dd/MM/yyyy' }}</td>
                <td>{{ getProjectName(record.project) }}</td>
                <td>{{ getMaterialName(record.materialType) }}</td>
                <td>{{ record.quantity }} {{ record.unit === 'm3' ? 'm³' : 'ton' }}</td>
                <td>{{ record.destination }}</td>
                <td>{{ getVehicleName(record.vehicleId) }}</td>
                <td>{{ getOperatorName(record.operator) }}</td>
                <td class="actions-cell">
                  <button class="action-btn edit-btn" title="Editar">✏️</button>
                  <button class="action-btn delete-btn" title="Eliminar">❌</button>
                </td>
              </tr>
              <tr *ngIf="recentRecords.length === 0">
                <td colspan="8" class="empty-table">No hay registros recientes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .aridos-delivery-container {
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
export class EntregaAridosComponent implements OnInit {
  aridosDeliveryForm: FormGroup;
  submitted = false;
  success = false;
  error = '';
  
  // Datos de ejemplo
  projects = [
    { id: '1', name: 'Construcción Ruta 68' },
    { id: '2', name: 'Extracción Cantera Norte' },
    { id: '3', name: 'Mantención Maquinaria' },
    { id: '4', name: 'Desarrollo Urbano Este' }
  ];
  
  materialTypes = [
    { id: '1', name: 'Arena Fina' },
    { id: '2', name: 'Grava' },
    { id: '3', name: 'Piedra Chancada' },
    { id: '4', name: 'Gravilla' },
    { id: '5', name: 'Arena Gruesa' },
    { id: '6', name: 'Ripio' }
  ];
  
  vehicles = [
    { id: 'V001', name: 'Camión Volquete Mercedes', capacity: '20 ton' },
    { id: 'V002', name: 'Camión Tolva Volvo', capacity: '15 ton' },
    { id: 'V003', name: 'Camión Volquete Scania', capacity: '25 ton' },
    { id: 'V004', name: 'Camión Articulado CAT', capacity: '30 ton' }
  ];
  
  operators = [
    { id: '1', name: 'Juan Pérez' },
    { id: '2', name: 'Carlos Rodríguez' },
    { id: '3', name: 'Miguel González' },
    { id: '4', name: 'Luis Morales' }
  ];
  
  recentRecords: AridosDelivery[] = [];
  
  constructor(private formBuilder: FormBuilder) {
    this.aridosDeliveryForm = this.formBuilder.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      project: ['', Validators.required],
      materialType: ['', Validators.required],
      quantity: ['', Validators.required],
      unit: ['m3', Validators.required],
      destination: ['', Validators.required],
      vehicleId: ['', Validators.required],
      operator: ['', Validators.required],
      notes: ['']
    });
  }
  
  ngOnInit(): void {
    this.loadRecentRecords();
  }
  
  // Getter para acceder más fácilmente a los campos del formulario
  get f() { return this.aridosDeliveryForm.controls; }
  
  onSubmit() {
    this.submitted = true;
    this.success = false;
    this.error = '';
    
    // Detener si el formulario es inválido
    if (this.aridosDeliveryForm.invalid) {
      return;
    }
    
    // Aquí enviaríamos los datos a un servicio
    // Por ahora, simulamos un registro exitoso
    setTimeout(() => {
      this.success = true;
      
      // Agregar el nuevo registro a la lista de recientes (para demostración)
      const formValues = this.aridosDeliveryForm.value;
      
      const quantity = parseFloat(formValues.quantity);
      
      const newRecord: AridosDelivery = {
        id: Math.floor(Math.random() * 1000),
        date: formValues.date,
        project: formValues.project,
        materialType: formValues.materialType,
        quantity: quantity,
        unit: formValues.unit,
        destination: formValues.destination,
        vehicleId: formValues.vehicleId,
        operator: formValues.operator,
        notes: formValues.notes
      };
      
      this.recentRecords.unshift(newRecord);
      this.resetForm();
    }, 800);
  }
  
  resetForm() {
    this.submitted = false;
    this.aridosDeliveryForm.reset({
      date: new Date().toISOString().split('T')[0],
      project: '',
      materialType: '',
      quantity: '',
      unit: 'm3',
      destination: '',
      vehicleId: '',
      operator: '',
      notes: ''
    });
  }
  
  loadRecentRecords() {
    // Simulamos la carga de datos recientes
    this.recentRecords = [
      {
        id: 1,
        date: '2025-05-02',
        project: '1',
        materialType: '2',
        quantity: 15.5,
        unit: 'm3',
        destination: 'Sector Norte Ruta 68',
        vehicleId: 'V001',
        operator: '1',
        notes: 'Entregado para cimientos'
      },
      {
        id: 2,
        date: '2025-05-01',
        project: '4',
        materialType: '1',
        quantity: 8.0,
        unit: 'm3',
        destination: 'Construcción Parque Este',
        vehicleId: 'V003',
        operator: '2',
        notes: 'Material para mezcla de concreto'
      },
      {
        id: 3,
        date: '2025-04-30',
        project: '2',
        materialType: '5',
        quantity: 12.5,
        unit: 'ton',
        destination: 'Planta Mezcladora Oeste',
        vehicleId: 'V002',
        operator: '3',
        notes: 'Uso para preparación de asfalto'
      }
    ];
  }
  
  getProjectName(projectId: string): string {
    const project = this.projects.find(p => p.id === projectId);
    return project ? project.name : 'Desconocido';
  }
  
  getMaterialName(materialId: string): string {
    const material = this.materialTypes.find(m => m.id === materialId);
    return material ? material.name : 'Desconocido';
  }
  
  getVehicleName(vehicleId: string): string {
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    return vehicle ? vehicle.name : 'Desconocido';
  }
  
  getOperatorName(operatorId: string): string {
    const operator = this.operators.find(o => o.id === operatorId);
    return operator ? operator.name : 'Desconocido';
  }
}