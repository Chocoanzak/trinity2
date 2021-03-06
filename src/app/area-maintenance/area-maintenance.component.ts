import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { AreaTableComponent } from './area-table.component';
import {
  AreaMaintenance,
  createAreaMaintenance,
} from './state/area-maintenance.model';
import { AreaMaintenanceQuery } from './state/area-maintenance.query';
import { AreaMaintenanceService } from './state/area-maintenance.service';

@Component({
  selector: 'trinity-area-maintenance',
  template: ` <div id="area-buttons"></div>
    <trinity-area-table
      #tableComponent
      [areas$]="areas$"
      [scrollState$]="query.scrollState$"
      (rowSelect)="onRowSelect($event)"
      (scrollState)="service.updateScrollPostition($event)"
      style="
        width:100%;
        height: 400px;
        display: block;"
    ></trinity-area-table>
    <trinity-area-detail
      [area]="activeArea"
      [isAdding]="isAdding"
      [listOfCurrentAreaCodes]="listOfCurrentAreaCodes"
      (save)="onSaveForm($event)"
      (delete)="onDelete()"
      (formIsDirty)="formIsDirty = $event"
    ></trinity-area-detail>`,
  styles: [],
})
export class AreaMaintenanceComponent implements OnInit, OnDestroy {
  areas$ = this.query.selectAll();
  activeArea: AreaMaintenance | undefined = createAreaMaintenance({});
  isAdding: boolean = true;
  listOfCurrentAreaCodes: (number | null)[] = [];

  getSub: Subscription;
  updateSub: Subscription;
  addSub: Subscription;
  deleteSub: Subscription;
  sequenceSub: Subscription;
  listOfCurrentAreaCodesSub: Subscription;

  @ViewChild('tableComponent') tableComponent: AreaTableComponent;

  private ui: webix.ui.toolbar;
  formIsDirty: boolean = false;

  constructor(
    public service: AreaMaintenanceService,
    public query: AreaMaintenanceQuery
  ) {}

  ngOnInit(): void {
    // only call api when there's no areas in the store
    this.getSub = this.query
      .selectHasCache()
      .pipe(
        filter((hasCache) => !hasCache), // only continue to next step if don't have cache
        switchMap(() =>
          this.service.get({ mapResponseFn: (res: any) => res.areas })
        )
      )
      .subscribe();

    // get an array of all the area codes for validating area code in form
    this.listOfCurrentAreaCodesSub = this.areas$.subscribe((areas) => {
      this.listOfCurrentAreaCodes = areas.map((area) => area.code);
    });

    webix.ready(() => {
      this.ui = webix.ui({
        view: 'toolbar',
        container: 'area-buttons',
        elements: [
          {
            view: 'button',
            label: 'X10',
            width: '100',
            on: {
              onItemClick: () => {
                this.sequence();
              },
            },
          },
          {
            view: 'button',
            label: 'New',
            width: '100',
            on: {
              onItemClick: () => {
                this.onNew();
              },
            },
          },
          {
            view: 'button',
            label: 'Export PDF',
            width: '100',
            on: {
              onItemClick: () => {
                webix.toPDF('area-table');
              },
            },
          },
        ],
      }) as webix.ui.form;
    });
  }

  onRowSelect(area: AreaMaintenance) {
    this.service.setActive(area.code);
    this.activeArea = this.query.getActive();
    this.isAdding = false;
    this.formIsDirty = false;
  }

  onSaveForm(newArea: AreaMaintenance) {
    if (!this.isAdding) {
      this.updateSub = this.service
        .update(
          newArea.code,
          { areas: [newArea] },
          { mapResponseFn: (res: any) => res.areas[0] }
        )
        .subscribe(() => {
          this.activeArea = this.query.getActive(); // TODO do we need this?
          this.formIsDirty = false;
        });
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
    this.activeArea = createAreaMaintenance({});
  }

  onDelete() {
    this.deleteSub = this.service
      .delete(this.query.getActiveId())
      .subscribe(() => {
        const form = webix.$$('area-details') as webix.ui.form;
        form.clear();
        this.isAdding = true;
        this.service.setActive(null);
      });
  }

  sequence() {
    this.sequenceSub = this.service
      .sequence()
      .subscribe(this.tableComponent?.sortSequence);
    // sorting after calling api doesn't work
  }

  ngOnDestroy() {
    this.getSub?.unsubscribe();
    this.updateSub?.unsubscribe();
    this.addSub?.unsubscribe();
    this.deleteSub?.unsubscribe();
    this.sequenceSub?.unsubscribe();
    this.listOfCurrentAreaCodesSub?.unsubscribe();
    this.ui?.destructor();
  }
}
