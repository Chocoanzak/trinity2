import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpMethod } from '@datorama/akita-ng-entity-service';
import { Subscription } from 'rxjs';
import { AreaMaintenance } from './state/area-maintenance.model';
import { AreaMaintenanceQuery } from './state/area-maintenance.query';
import { AreaMaintenanceService } from './state/area-maintenance.service';

@Component({
  selector: 'trinity-area-maintenance',
  template: `<trinity-area-table
      [areas]="areas$ | async"
      (rowSelect)="onRowSelect($event)"
      style="
    width:100%;
    height: 500px;
    display: block;"
    ></trinity-area-table>
    <trinity-area-detail
      [area]="activeArea"
      (save)="onSaveForm($event)"
      (new)="onNew()"
      (delete)="onDelete()"
    ></trinity-area-detail>`,
  styles: [],
})
export class AreaMaintenanceComponent implements OnInit, OnDestroy {
  areas$ = this.query.selectAll();
  activeArea: AreaMaintenance | null = null;
  isAdding: boolean = true;

  getSub: Subscription | undefined;
  updateSub: Subscription | undefined;
  addSub: Subscription | undefined;
  deleteSub: Subscription | undefined;

  constructor(
    private service: AreaMaintenanceService,
    private query: AreaMaintenanceQuery
  ) {}

  ngOnInit(): void {
    this.getSub = this.service
      .get({ mapResponseFn: (res: any) => res.areas })
      .subscribe();
  }

  onRowSelect(area: AreaMaintenance) {
    this.service.setActive(area.code);
    this.activeArea = this.query.getActive();
    this.isAdding = false;
  }

  onSaveForm(newArea: AreaMaintenance) {
    if (!this.isAdding) {
      this.updateSub = this.service
        .update(
          newArea.code,
          // newArea
          { areas: [newArea] },
          { method: HttpMethod.POST, mapResponseFn: (res: any) => res.areas[0] }
        )
        // we use POST to update records but Akita has it strongly typed so it only allows put and patch
        .subscribe();
    } else {
      this.addSub = this.service
        .add(
          { areas: [newArea] },
          { mapResponseFn: (res: any) => res.areas[0] }
        )
        .subscribe(() => this.onRowSelect(newArea));
    }
  }

  onNew() {
    this.service.setActive(null);
    this.isAdding = true;
  }

  onDelete() {
    this.deleteSub = this.service.delete(this.query.getActiveId()).subscribe();
  }

  ngOnDestroy() {
    this.getSub?.unsubscribe();
    this.updateSub?.unsubscribe();
    this.addSub?.unsubscribe();
    this.deleteSub?.unsubscribe();
  }
}
