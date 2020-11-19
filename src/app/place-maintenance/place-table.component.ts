import { HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { StateHistoryPlugin } from '@datorama/akita';
import { combineLatest, Subscription } from 'rxjs';
import { RoutedTabService } from '../routed-tab/state/routed-tab.service';
import { Routes } from '../routes.model';
import { PlaceMaintenance } from './state/place-maintenance.model';
import { PlaceMaintenanceQuery } from './state/place-maintenance.query';
import { PlaceMaintenanceService } from './state/place-maintenance.service';

@Component({
  selector: 'trinity-place-table',
  template: ` Area Code<input
      type="number"
      min="1"
      [(ngModel)]="areaCodeFilter"
    />
    <button (click)="onSearch()">Search</button>
    <button (click)="undo()">Undo</button>
    <button (click)="redo()">Redo</button>
    <button (click)="addAreasComponent()">Areas</button>
    <br />
    <button (click)="onCreate()">Create New Place</button>
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
    private service: PlaceMaintenanceService,
    private routedTabService: RoutedTabService,
    private router: Router,
    private route: ActivatedRoute
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

    this.placesSub = combineLatest([
      this.places$,
      this.query.scrollState$,
    ]).subscribe(([places, scrollState]) => {
      this.places = places;
      this.ui?.clearAll();
      this.ui?.parse(JSON.stringify(this.places), 'json');
      this.ui?.refresh();
      this.ui?.scrollTo(scrollState.x, scrollState.y);
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

  onCreate() {
    this.routedTabService.addTab(
      { label: 'New', path: 'new' },
      Routes.place,
      true
    );
  }

  undo() {
    this.stateHistory.jump(-2);
  }

  redo() {
    this.stateHistory.jump(2);
  }

  addAreasComponent() {
    // Find the route required
    const configToCopy = this.router.config.find(
      (route) => route.path === 'area-maintenance'
    );
    // Find the parents configuration and add the route
    this.route.parent?.routeConfig?.children?.unshift(<Route>configToCopy);
    // Update the tab
    this.routedTabService.addTab(
      { path: 'area-maintenance', label: 'test' },
      Routes.place
    );
  }

  onRowSelect(place: PlaceMaintenance) {
    this.routedTabService.addTab(
      { path: place.code, label: place.code },
      Routes.place
    );
  }

  ngOnDestroy() {
    this.service.setScrollState(this.ui.getScrollState());
    this.ui?.destructor();
    this.placesSub?.unsubscribe();
    this.getSub?.unsubscribe();
    this.areaFilterSub?.unsubscribe();
  }
}
