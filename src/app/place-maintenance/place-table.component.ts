import { HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StateHistoryPlugin } from '@datorama/akita';
import { Subscription } from 'rxjs';
import { PlaceMaintenance } from './state/place-maintenance.model';
import { PlaceMaintenanceQuery } from './state/place-maintenance.query';
import { PlaceMaintenanceService } from './state/place-maintenance.service';

@Component({
  selector: 'trinity-place-table',
  template: ` Area Code<input type="number" [(ngModel)]="areaCodeFilter" />
    <button (click)="onSearch()">Search</button>
    <button (click)="undo()">Undo</button>
    <button (click)="redo()">Redo</button>
    <div id="place-table" style="height: 500px"></div>`,
  styles: [],
})
export class PlaceTableComponent implements OnInit, OnDestroy {
  places$ = this.query.selectAll();
  places: PlaceMaintenance[];
  placesSub: Subscription;

  getSub: Subscription;
  areaFilterSub: Subscription;

  areaCodeFilter: number | null;

  stateHistory: StateHistoryPlugin;

  private ui: webix.ui.datatable;
  private columnConfig = [
    {
      id: 'code',
      header: 'Code',
      sort: 'int',
      width: '100',
    },
    { id: 'name', header: 'Name', sort: 'string', width: '300' },
    { id: 'areaCode', header: 'Area Code', sort: 'int', width: '100' },
  ];
  constructor(
    private query: PlaceMaintenanceQuery,
    private router: Router,
    private service: PlaceMaintenanceService
  ) {}

  ngOnInit() {
    this.stateHistory = new StateHistoryPlugin(this.query);

    this.areaFilterSub = this.query.areaCodeFilter$.subscribe(
      (res) => (this.areaCodeFilter = res)
    );

    this.ui = webix.ui({
      id: 'table',
      container: 'place-table',
      view: 'datatable',
      columns: this.columnConfig,
      data: [],
      select: 'row',
      on: {
        onAfterSelect: (id: number) => this.onRowSelect(this.ui?.getItem(id)),
      },
    }) as webix.ui.datatable;

    this.placesSub = this.places$?.subscribe((places) => {
      this.places = places;
      console.log(this.places);
      this.ui?.clearAll();
      this.ui?.parse(JSON.stringify(this.places), 'json');
      this.ui?.refresh();
    });

    this.ui.resize();
  }

  onSearch() {
    this.service.updateFilter(this.areaCodeFilter);
    const params = new HttpParams()
      .set('areaFrom', `${this.areaCodeFilter}`)
      .set('areaTo', `${this.areaCodeFilter}`);
    this.getSub = this.service
      .get({ mapResponseFn: (res: any) => res.places, params })
      .subscribe();
  }

  undo() {
    this.stateHistory.jump(-2);
  }

  redo() {
    this.stateHistory.jump(2);
  }

  onRowSelect(place: PlaceMaintenance) {
    this.router.navigate(['place-maintenance', place.code]);
  }

  ngOnDestroy() {
    this.ui?.destructor();
    this.placesSub?.unsubscribe();
    this.getSub?.unsubscribe();
    this.areaFilterSub?.unsubscribe();
  }
}
