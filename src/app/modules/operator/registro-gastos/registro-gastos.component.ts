import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

interface ExpenseRecord {
  id: number;
  date: string;
  expenseType: string;
  amount: number;
  project: string;
  operator: string;
  paymentMethod: string;
  receiptNumber: string;
  category: string;
  description: string;
  status: string;
}

@Component({
  selector: 'app-registro-gastos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  template: `
    <div class="expenses-container">
      <h2 class="page-title">Registro de Gastos</h2>
      
      <div class="form-card">
        <h3 class="form-title">Registrar Nuevo Gasto</h3>
        
        <form [formGroup]="expenseForm" (ngSubmit)="onSubmit()">
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
              <label for="expenseType">Tipo de Gasto</label>
              <select id="expenseType" formControlName="expenseType" class="form-control">
                <option value="">Seleccione tipo de gasto</option>
                <option *ngFor="let type of expenseTypes" [value]="type.id">
                  {{ type.name }}
                </option>
              </select>
              <div *ngIf="submitted && f['expenseType'].errors" class="error-message">
                <div *ngIf="f['expenseType'].errors['required']">El tipo de gasto es requerido</div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="category">Categoría</label>
              <select id="category" formControlName="category" class="form-control">
                <option value="">Seleccione una categoría</option>
                <option *ngFor="let cat of categories" [value]="cat.id">
                  {{ cat.name }}
                </option>
              </select>
              <div *ngIf="submitted && f['category'].errors" class="error-message">
                <div *ngIf="f['category'].errors['required']">La categoría es requerida</div>
              </div>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="amount">Monto ($)</label>
              <input type="number" id="amount" formControlName="amount" class="form-control">
              <div *ngIf="submitted && f['amount'].errors" class="error-message">
                <div *ngIf="f['amount'].errors['required']">El monto es requerido</div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="paymentMethod">Método de Pago</label>
              <select id="paymentMethod" formControlName="paymentMethod" class="form-control">
                <option value="">Seleccione método de pago</option>
                <option *ngFor="let method of paymentMethods" [value]="method.id">
                  {{ method.name }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="receiptNumber">Número de Factura/Boleta</label>
              <input type="text" id="receiptNumber" formControlName="receiptNumber" class="form-control">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="operator">Operador / Responsable</label>
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
            <label for="description">Descripción / Observaciones</label>
            <textarea id="description" formControlName="description" class="form-control" rows="3"></textarea>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Registrar Gasto</button>
            <button type="button" class="btn btn-secondary" (click)="resetForm()">Limpiar</button>
          </div>
          
          <div *ngIf="success" class="alert alert-success">
            Gasto registrado exitosamente
          </div>
          
          <div *ngIf="error" class="alert alert-danger">
            {{ error }}
          </div>
        </form>
      </div>
      
      <div class="recent-records">
        <h3 class="section-title">Gastos Recientes</h3>
        
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Proyecto</th>
                <th>Categoría</th>
                <th>Monto</th>
                <th>Método de Pago</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let record of recentExpenses">
                <td>{{ record.date | date:'dd/MM/yyyy' }}</td>
                <td>{{ getExpenseTypeName(record.expenseType) }}</td>
                <td>{{ getProjectName(record.project) }}</td>
                <td>{{ getCategoryName(record.category) }}</td>
                <td>{{ record.amount | currency:'CLP':'symbol':'1.0-0' }}</td>
                <td>{{ getPaymentMethodName(record.paymentMethod) }}</td>
                <td>
                  <span class="status-badge" [ngClass]="'status-' + record.status">
                    {{ getStatusName(record.status) }}
                  </span>
                </td>
                <td class="actions-cell">
                  <button class="action-btn edit-btn" title="Editar">✏️</button>
                  <button class="action-btn delete-btn" title="Eliminar">❌</button>
                </td>
              </tr>
              <tr *ngIf="recentExpenses.length === 0">
                <td colspan="8" class="empty-table">No hay registros recientes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .expenses-container {
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
    
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    
    .status-pending {
      background-color: #ffeeba;
      color: #856404;
    }
    
    .status-approved {
      background-color: #d4edda;
      color: #155724;
    }
    
    .status-rejected {
      background-color: #f8d7da;
      color: #721c24;
    }
  `]
})
export class RegistroGastosComponent implements OnInit {
  expenseForm: FormGroup;
  submitted = false;
  success = false;
  error = '';
  
  // Datos de ejemplo
  projects = [
    { id: '1', name: 'Construcción Ruta 68' },
    { id: '2', name: 'Extracción Cantera Norte' },
    { id: '3', name: 'Mantención Maquinaria' }
  ];
  
  expenseTypes = [
    { id: '1', name: 'Combustible' },
    { id: '2', name: 'Mantenimiento' },
    { id: '3', name: 'Materiales' },
    { id: '4', name: 'Viáticos' },
    { id: '5', name: 'Otros' }
  ];
  
  categories = [
    { id: '1', name: 'Maquinaria' },
    { id: '2', name: 'Vehículos' },
    { id: '3', name: 'Personal' },
    { id: '4', name: 'Insumos' },
    { id: '5', name: 'Administrativo' }
  ];
  
  paymentMethods = [
    { id: '1', name: 'Efectivo' },
    { id: '2', name: 'Tarjeta de Crédito' },
    { id: '3', name: 'Transferencia' },
    { id: '4', name: 'Cheque' }
  ];
  
  operators = [
    { id: '1', name: 'Juan Pérez' },
    { id: '2', name: 'Carlos Rodríguez' },
    { id: '3', name: 'Miguel González' }
  ];
  
  statusTypes = [
    { id: 'pending', name: 'Pendiente' },
    { id: 'approved', name: 'Aprobado' },
    { id: 'rejected', name: 'Rechazado' }
  ];
  
  recentExpenses: ExpenseRecord[] = [];
  
  constructor(private formBuilder: FormBuilder) {
    this.expenseForm = this.formBuilder.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      project: ['', Validators.required],
      expenseType: ['', Validators.required],
      category: ['', Validators.required],
      amount: ['', Validators.required],
      paymentMethod: [''],
      receiptNumber: [''],
      operator: ['', Validators.required],
      description: ['']
    });
  }
  
  ngOnInit(): void {
    this.loadRecentExpenses();
  }
  
  // Getter para acceder más fácilmente a los campos del formulario
  get f() { return this.expenseForm.controls; }
  
  onSubmit() {
    this.submitted = true;
    this.success = false;
    this.error = '';
    
    // Detener si el formulario es inválido
    if (this.expenseForm.invalid) {
      return;
    }
    
    // Aquí enviaríamos los datos a un servicio
    // Por ahora, simulamos un registro exitoso
    setTimeout(() => {
      this.success = true;
      
      // Agregar el nuevo registro a la lista de recientes (para demostración)
      const formValues = this.expenseForm.value;
      
      const newExpense: ExpenseRecord = {
        id: Math.floor(Math.random() * 1000),
        date: formValues.date,
        expenseType: formValues.expenseType,
        amount: parseFloat(formValues.amount),
        project: formValues.project,
        operator: formValues.operator,
        paymentMethod: formValues.paymentMethod || '',
        receiptNumber: formValues.receiptNumber || '',
        category: formValues.category,
        description: formValues.description || '',
        status: 'pending' // Por defecto, los nuevos gastos son pendientes
      };
      
      this.recentExpenses.unshift(newExpense);
      this.resetForm();
    }, 800);
  }
  
  resetForm() {
    this.submitted = false;
    this.expenseForm.reset({
      date: new Date().toISOString().split('T')[0],
      project: '',
      expenseType: '',
      category: '',
      amount: '',
      paymentMethod: '',
      receiptNumber: '',
      operator: '',
      description: ''
    });
  }
  
  loadRecentExpenses() {
    // Simulamos la carga de datos recientes
    this.recentExpenses = [
      {
        id: 1,
        date: '2025-05-02',
        expenseType: '1',
        amount: 85000,
        project: '1',
        operator: '1',
        paymentMethod: '3',
        receiptNumber: 'F-12345',
        category: '1',
        description: 'Combustible para retroexcavadora',
        status: 'approved'
      },
      {
        id: 2,
        date: '2025-05-01',
        expenseType: '2',
        amount: 150000,
        project: '2',
        operator: '2',
        paymentMethod: '2',
        receiptNumber: 'F-54321',
        category: '1',
        description: 'Mantenimiento preventivo excavadora',
        status: 'pending'
      },
      {
        id: 3,
        date: '2025-04-29',
        expenseType: '4',
        amount: 45000,
        project: '1',
        operator: '3',
        paymentMethod: '1',
        receiptNumber: 'B-7890',
        category: '3',
        description: 'Viáticos para operadores',
        status: 'rejected'
      }
    ];
  }
  
  getExpenseTypeName(typeId: string): string {
    const type = this.expenseTypes.find(t => t.id === typeId);
    return type ? type.name : 'Desconocido';
  }
  
  getProjectName(projectId: string): string {
    const project = this.projects.find(p => p.id === projectId);
    return project ? project.name : 'Desconocido';
  }
  
  getOperatorName(operatorId: string): string {
    const operator = this.operators.find(o => o.id === operatorId);
    return operator ? operator.name : 'Desconocido';
  }
  
  getCategoryName(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : 'Desconocido';
  }
  
  getPaymentMethodName(methodId: string): string {
    const method = this.paymentMethods.find(m => m.id === methodId);
    return method ? method.name : 'No especificado';
  }
  
  getStatusName(statusId: string): string {
    const status = this.statusTypes.find(s => s.id === statusId);
    return status ? status.name : 'Desconocido';
  }
}