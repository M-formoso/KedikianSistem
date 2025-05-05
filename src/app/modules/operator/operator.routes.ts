import { Routes } from '@angular/router';
import { OperatorLayoutComponent } from './operator-layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { WorkHoursComponent } from './work-hours/work-hours.component';
import { MachineHoursComponent} from './machine-hours/machine-hours.component';  
import { EntregaAridosComponent } from './entrega-aridos/entrega-aridos.component';
import { RegistroGastosComponent } from './registro-gastos/registro-gastos.component';

export const operatorRoutes: Routes = [
  {
    path: '',
    component: OperatorLayoutComponent,
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
      {
        path: 'work-hours',
        component: WorkHoursComponent, // ✅ ruta de registro horas laborales
      },
      {
        path: 'machine-hours',
        component: MachineHoursComponent, // ✅ ruta de registro horas de máquina
      },
      {
        path: 'entrega-aridos',
        component: EntregaAridosComponent, // ✅ ruta de entrega de áridos
      },
      {
        path: 'registro-gastos',
        component:RegistroGastosComponent
      }
    ]
  }
];
