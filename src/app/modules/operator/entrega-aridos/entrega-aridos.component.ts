import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { EntregaAridosService } from '../../../core/services/entrega-aridos.service';
import { AridosDeliveryRequest } from '../../../core/services/entrega-aridos.service'; 


interface AridosDelivery {
  id: number;
  date: string;
  project: string;
  materialType: string;
  quantity: number;
  unit: string;
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
          <div class="form-compact">
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
            
            <div class="form-row">
              <div class="form-group half-width">
                <label for="quantity">Cantidad</label>
                <input type="number" id="quantity" formControlName="quantity" class="form-control" step="0.1">
                <div *ngIf="submitted && f['quantity'].errors" class="error-message">
                  <div *ngIf="f['quantity'].errors['required']">La cantidad es requerida</div>
                </div>
              </div>
              
              <div class="form-group half-width">
                <label for="unit">Unidad</label>
                <select id="unit" formControlName="unit" class="form-control">
                  <option value="m3">Metros cúbicos (m³)</option>
                  <option value="ton">Toneladas (ton)</option>
                </select>
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
          
            <div class="form-group compact-notes">
              <label for="notes">Observaciones</label>
              <textarea id="notes" formControlName="notes" class="form-control" rows="2"></textarea>
            </div>
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
                <td>{{ getVehicleName(record.vehicleId) }}</td>
                <td>{{ getOperatorName(record.operator) }}</td>
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
    /* Estilos base */
    .aridos-delivery-container {
      width: 100%;
      max-width: 100%; /* Ajustado para ocupar todo el ancho disponible */
      margin: 0 auto;
      padding: 0 5px; /* Reducido el padding para móviles */
      box-sizing: border-box;
      overflow-x: hidden; /* Evita el desplazamiento horizontal */
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
      max-width: 100%; /* Ajustado para ocupar todo el ancho disponible */
      overflow-x: hidden; /* Evita el desbordamiento horizontal */
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
      width: 100%; /* Asegura que ocupa todo el ancho disponible */
    }
    
    .form-row {
      display: flex;
      gap: 0.5rem;
      width: 100%;
    }
    
    .half-width {
      width: 50%;
    }
    
    .form-group {
      margin-bottom: 0.5rem;
      width: 100%; /* Asegura que ocupa todo el ancho disponible */
    }
    
    .compact-notes {
      margin-bottom: 0.25rem;
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
      width: 100%; /* Asegura que ocupa todo el ancho disponible */
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
      width: 100%; /* Asegura que ocupa todo el ancho disponible */
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed; /* Mantiene las columnas con tamaño fijo */
    }
    
    .data-table th,
    .data-table td {
      padding: 0.5rem;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
      font-size: 0.85rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis; /* Añade puntos suspensivos a texto largo */
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
    
    /* Media Queries mejorados para mejor responsividad */
    @media screen and (max-width: 768px) {
      .aridos-delivery-container {
        padding: 0 5px;
      }
      
      .form-card {
        padding: 0.75rem;
        max-width: 100%;
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
      .aridos-delivery-container {
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
      
      .form-row {
        flex-direction: column;
        gap: 0.25rem;
      }
      
      .half-width {
        width: 100%;
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
      
      /* Añade atributos data-label para móviles */
      .data-table td:nth-of-type(1):before { content: "Fecha: "; }
      .data-table td:nth-of-type(2):before { content: "Proyecto: "; }
      .data-table td:nth-of-type(3):before { content: "Material: "; }
      .data-table td:nth-of-type(4):before { content: "Cantidad: "; }
      .data-table td:nth-of-type(5):before { content: "Vehículo: "; }
      .data-table td:nth-of-type(6):before { content: "Operador: "; }
      .data-table td:nth-of-type(7):before { content: "Acciones: "; }
      
      /* Forzar el ancho completo en dispositivos pequeños */
      body, html {
        max-width: 100vw;
        overflow-x: hidden;
      }
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
  
  constructor(private formBuilder: FormBuilder,private entregaAridosService: EntregaAridosService) {
    this.aridosDeliveryForm = this.formBuilder.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      project: ['', Validators.required],
      materialType: ['', Validators.required],
      quantity: ['', Validators.required],
      unit: ['m3', Validators.required],
      vehicleId: ['', Validators.required],
      operator: ['', Validators.required],
      notes: ['']
    });
  }
  
  ngOnInit(): void {
    this.loadRecentRecords();
    // Añadimos clases especiales para la tabla en móviles
    this.setupMobileTable();
  }
  
  // Configuración para la tabla responsiva en móviles
  setupMobileTable() {
    // Esta función se ejecutaría después de que la vista es inicializada
    // Pero como es un ejemplo, la mantenemos aquí
  }
  
  // Getter para acceder más fácilmente a los campos del formulario
  get f() { return this.aridosDeliveryForm.controls; }
  
  // Reemplaza el método onSubmit():
onSubmit() {
  this.submitted = true;
  this.success = false;
  this.error = '';
  
  if (this.aridosDeliveryForm.invalid) {
    return;
  }

  const deliveryData: AridosDeliveryRequest = {
    date: this.aridosDeliveryForm.value.date,
    project: this.aridosDeliveryForm.value.project,
    materialType: this.aridosDeliveryForm.value.materialType,
    quantity: parseFloat(this.aridosDeliveryForm.value.quantity),
    unit: this.aridosDeliveryForm.value.unit,
    vehicleId: this.aridosDeliveryForm.value.vehicleId,
    operator: this.aridosDeliveryForm.value.operator,
    notes: this.aridosDeliveryForm.value.notes
  };

  this.entregaAridosService.createDelivery(deliveryData).subscribe({
    next: (response) => {
      if (response.success) {
        this.success = true;
        this.loadRecentRecords(); // Recargar la lista
        this.resetForm();
      }
    },
    error: (error) => {
      this.error = error.message;
    }
  });
}

  resetForm() {
    this.submitted = false;
    this.aridosDeliveryForm.reset({
      date: new Date().toISOString().split('T')[0],
      project: '',
      materialType: '',
      quantity: '',
      unit: 'm3',
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