import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface DashboardCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-container">
      <h2 class="page-title">Panel del Operario</h2>
      
      <div class="stats-summary">
        <div class="stat-card">
          <div class="stat-icon">⏱️</div>
          <div class="stat-info">
            <span class="stat-value">{{todayWorkHours}} hrs</span>
            <span class="stat-label">Horas trabajadas hoy</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🚜</div>
          <div class="stat-info">
            <span class="stat-value">{{weekMachineHours}} hrs</span>
            <span class="stat-label">Horas de máquina esta semana</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🏗️</div>
          <div class="stat-info">
            <span class="stat-value">{{aggregatesDelivered}} m³</span>
            <span class="stat-label">Áridos entregados esta semana</span>
          </div>
        </div>
      </div>
      
      <h3 class="section-title">Acciones Rápidas</h3>
      
      <div class="dashboard-cards">
        <div *ngFor="let card of dashboardCards" class="dashboard-card" [ngStyle]="{'background-color': card.color}">
          <a [routerLink]="card.route" class="card-link">
            <div class="card-icon">{{card.icon}}</div>
            <div class="card-content">
              <h4 class="card-title">{{card.title}}</h4>
              <p class="card-description">{{card.description}}</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page-title {
      margin-bottom: 1.5rem;
      font-size: 1.75rem;
      color: #333;
    }
    
    .stats-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .stat-card {
      display: flex;
      align-items: center;
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      padding: 1.5rem;
    }
    
    .stat-icon {
      font-size: 2.5rem;
      margin-right: 1.5rem;
    }
    
    .stat-info {
      display: flex;
      flex-direction: column;
    }
    
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #333;
    }
    
    .stat-label {
      font-size: 0.875rem;
      color: #6c757d;
      margin-top: 0.25rem;
    }
    
    .section-title {
      margin: 2rem 0 1rem;
      font-size: 1.25rem;
      color: #333;
    }
    
    .dashboard-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    
    .dashboard-card {
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .dashboard-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    }
    
    .card-link {
      display: flex;
      padding: 1.5rem;
      color: white;
      text-decoration: none;
    }
    
    .card-icon {
      font-size: 2rem;
      margin-right: 1rem;
      display: flex;
      align-items: center;
    }
    
    .card-content {
      flex: 1;
    }
    
    .card-title {
      margin: 0 0 0.5rem;
      font-size: 1.25rem;
    }
    
    .card-description {
      margin: 0;
      opacity: 0.9;
      font-size: 0.9rem;
    }
  `]
})
export class DashboardComponent implements OnInit {
  // Datos de ejemplo para el dashboard
  todayWorkHours: number = 0;
  weekMachineHours: number = 0;
  aggregatesDelivered: number = 0;
  
  dashboardCards: DashboardCard[] = [
    {
      title: 'Registro Jornada Laboral',
      description: 'Registra tus horas de trabajo diarias',
      icon: '⏱️',
      route: '/operator/work-hours',
      color: '#4CAF50'
    },
    {
      title: 'Registro Horas Máquina',
      description: 'Controla las horas de uso de maquinaria',
      icon: '🚜',
      route: '/operator/machine-hours',
      color: '#2196F3'
    },
    {
      title: 'Registro Entrega de Áridos',
      description: 'Documenta entregas de material',
      icon: '🏗️',
      route: '/operator/aggregates',
      color: '#FF9800'
    },
    {
      title: 'Registro de Gastos',
      description: 'Registra gastos operativos',
      icon: '💰',
      route: '/operator/expenses',
      color: '#9C27B0'
    }
  ];
  
  ngOnInit(): void {
    // Aquí cargaríamos los datos desde un servicio
    this.loadDashboardData();
  }
  
  loadDashboardData(): void {
    // Simulamos la carga de datos
    this.todayWorkHours = 6.5;
    this.weekMachineHours = 32.5;
    this.aggregatesDelivered = 425.8;
  }
}