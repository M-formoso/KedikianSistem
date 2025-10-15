// src/app/shared/components/table-filters/table-filters.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange';
  options?: { value: any; label: string }[];
  placeholder?: string;
}

@Component({
  selector: 'app-table-filters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="filters-container" [class.collapsed]="isCollapsed">
      <div class="filters-header">
        <h4 class="filters-title">
          <span class="filter-icon">🔍</span>
          Filtros de búsqueda
        </h4>
        <button 
          type="button" 
          class="btn-toggle" 
          (click)="toggleFilters()"
          [title]="isCollapsed ? 'Expandir filtros' : 'Colapsar filtros'">
          {{ isCollapsed ? '▼' : '▲' }}
        </button>
      </div>

      <div class="filters-content" *ngIf="!isCollapsed">
        <form [formGroup]="filterForm" class="filters-grid">
          <div 
            *ngFor="let filter of filterConfigs" 
            class="filter-group"
            [class.filter-full-width]="filter.type === 'dateRange'">
            
            <label [for]="filter.key">{{ filter.label }}</label>

            <!-- Campo de texto -->
            <input 
              *ngIf="filter.type === 'text'"
              type="text"
              [id]="filter.key"
              [formControlName]="filter.key"
              [placeholder]="filter.placeholder || ''"
              class="form-control">

            <!-- Campo de selección -->
            <select 
              *ngIf="filter.type === 'select'"
              [id]="filter.key"
              [formControlName]="filter.key"
              class="form-control">
              <option value="">Todos</option>
              <option 
                *ngFor="let option of filter.options" 
                [value]="option.value">
                {{ option.label }}
              </option>
            </select>

            <!-- Campo de fecha simple -->
            <input 
              *ngIf="filter.type === 'date'"
              type="date"
              [id]="filter.key"
              [formControlName]="filter.key"
              class="form-control">

            <!-- Rango de fechas -->
            <div *ngIf="filter.type === 'dateRange'" class="date-range-group">
              <div class="date-field">
                <label [for]="filter.key + 'Desde'">Desde:</label>
                <input 
                  type="date"
                  [id]="filter.key + 'Desde'"
                  [formControlName]="filter.key + 'Desde'"
                  class="form-control">
              </div>
              <div class="date-field">
                <label [for]="filter.key + 'Hasta'">Hasta:</label>
                <input 
                  type="date"
                  [id]="filter.key + 'Hasta'"
                  [formControlName]="filter.key + 'Hasta'"
                  class="form-control">
              </div>
            </div>
          </div>
        </form>

        <div class="filters-actions">
          <button 
            type="button" 
            class="btn btn-primary" 
            (click)="applyFilters()"
            [disabled]="isLoading">
            <span class="btn-icon">✓</span>
            Aplicar Filtros
          </button>
          <button 
            type="button" 
            class="btn btn-secondary" 
            (click)="clearFilters()"
            [disabled]="isLoading">
            <span class="btn-icon">✕</span>
            Limpiar
          </button>
        </div>

        <div class="active-filters" *ngIf="hasActiveFilters()">
          <span class="active-filters-label">Filtros activos:</span>
          <div class="filter-tags">
            <span 
              *ngFor="let filter of getActiveFilters()" 
              class="filter-tag">
              {{ filter.label }}: {{ filter.displayValue }}
              <button 
                type="button" 
                class="remove-filter" 
                (click)="removeFilter(filter.key)"
                title="Eliminar filtro">
                ×
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./table-filters.component.css']
})
export class TableFiltersComponent implements OnInit {
  @Input() filterConfigs: FilterConfig[] = [];
  @Input() isLoading = false;
  @Output() filtersChanged = new EventEmitter<any>();

  filterForm!: FormGroup;
  isCollapsed = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    const formConfig: any = {};
    
    this.filterConfigs.forEach(config => {
      if (config.type === 'dateRange') {
        formConfig[config.key + 'Desde'] = [''];
        formConfig[config.key + 'Hasta'] = [''];
      } else {
        formConfig[config.key] = [''];
      }
    });

    this.filterForm = this.fb.group(formConfig);
  }

  toggleFilters(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  applyFilters(): void {
    const filters = this.filterForm.value;
    const cleanedFilters: any = {};

    // Limpiar valores vacíos
    Object.keys(filters).forEach(key => {
      if (filters[key] !== '' && filters[key] !== null) {
        cleanedFilters[key] = filters[key];
      }
    });

    this.filtersChanged.emit(cleanedFilters);
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.filtersChanged.emit({});
  }

  removeFilter(key: string): void {
    if (key.includes('Desde') || key.includes('Hasta')) {
      const baseKey = key.replace('Desde', '').replace('Hasta', '');
      this.filterForm.patchValue({
        [baseKey + 'Desde']: '',
        [baseKey + 'Hasta']: ''
      });
    } else {
      this.filterForm.patchValue({ [key]: '' });
    }
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return this.getActiveFilters().length > 0;
  }

  getActiveFilters(): { key: string; label: string; displayValue: string }[] {
    const filters: { key: string; label: string; displayValue: string }[] = [];
    const formValue = this.filterForm.value;

    this.filterConfigs.forEach(config => {
      if (config.type === 'dateRange') {
        const desdeKey = config.key + 'Desde';
        const hastaKey = config.key + 'Hasta';
        
        if (formValue[desdeKey] || formValue[hastaKey]) {
          const desde = formValue[desdeKey] || '...';
          const hasta = formValue[hastaKey] || '...';
          filters.push({
            key: config.key,
            label: config.label,
            displayValue: `${desde} - ${hasta}`
          });
        }
      } else if (formValue[config.key] !== '' && formValue[config.key] !== null) {
        let displayValue = formValue[config.key];
        
        if (config.type === 'select' && config.options) {
          const option = config.options.find(opt => opt.value === formValue[config.key]);
          displayValue = option ? option.label : formValue[config.key];
        }

        filters.push({
          key: config.key,
          label: config.label,
          displayValue: displayValue
        });
      }
    });

    return filters;
  }
}