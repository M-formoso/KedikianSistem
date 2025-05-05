import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OperatorLayoutComponent } from './operator-layout.component';
import { WorkHoursComponent } from './work-hours/work-hours.component';



const routes: Routes = [
  {
    path: '',
    component: OperatorLayoutComponent,
    children: [
      { path: 'jornada', component: WorkHoursComponent },
      { path: '', redirectTo: 'jornada', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OperatorRoutingModule {}
