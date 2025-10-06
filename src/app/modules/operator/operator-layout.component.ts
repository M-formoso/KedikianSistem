import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-operator-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarComponent,
    HeaderComponent,
  ],
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
      min-height: 100vh;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
    }
    
    .content-area {
      flex: 1;
      position: relative;
      transition: margin-left 0.3s ease;
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
    }
    
    .main-content {
      padding: 1rem;
      margin-top: 60px;
      min-height: calc(100vh - 60px);
      overflow-y: auto;
      overflow-x: hidden;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    
    @media (min-width: 769px) {
      .content-area {
        margin-left: 250px;
      }
    }
    
    @media (max-width: 768px) {
      .content-area {
        margin-left: 0;
        width: 100vw;
      }
      
      .main-content {
        padding: 0.5rem;
        margin-top: 60px;
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      .main-content {
        padding: 0.25rem;
      }
    }
  `]
})
export class OperatorLayoutComponent {}