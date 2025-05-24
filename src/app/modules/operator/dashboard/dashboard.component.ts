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
      route: '/operator/entrega-aridos',
      color: '#FF9800'
    },
    {
      title: 'Registro de Gastos',
      description: 'Registra gastos operativos',
      icon: '💰',
      route: '/operator/registro-gastos',
      color: '#9C27B0'
    }
  ];

  ngOnInit(): void {
    // No se necesitan cargar las estadísticas de resumen
  }
}