import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-operator-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="app-container">
      <app-sidebar></app-sidebar>
      <div class="content-area">
        <app-header></app-header>
        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      height: 100vh;
    }
    
    .content-area {
      flex: 1;
      position: relative;
      transition: margin-left 0.3s ease;
    }
    
    .main-content {
      padding: 2rem 1rem;
      margin-top: 60px; /* Altura del header */
      height: calc(100vh - 60px);
      overflow-y: auto;
    }
    
    /* Estilos responsive */
    @media (min-width: 769px) {
      .content-area {
        margin-left: 250px; /* Ancho del sidebar */
      }
    }
    
    @media (max-width: 768px) {
      .content-area {
        margin-left: 0;
      }
      
      .main-content {
        padding: 1rem;
        margin-top: 60px; /* Espacio para el botón hamburguesa y header */
      }
    }
  `]
})
export class OperatorLayoutComponent {}