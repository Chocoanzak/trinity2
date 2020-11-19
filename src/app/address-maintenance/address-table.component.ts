import { HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { combineLatest, Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { RoutedTabService } from '../routed-tab/state/routed-tab.service';
import { Routes } from '../routes.model';
import {
  AddressMaintenance,
  AddressMaintenanceWrapper,
} from './state/address-maintenance.model';
import { AddressMaintenanceQuery } from './state/address-maintenance.query';
import { AddressMaintenanceService } from './state/address-maintenance.service';

@Component({
  selector: 'trinity-address-table',
  template: `<input [(ngModel)]="addressCodeFilter" />
    <div id="address-table" style="height: 500px"></div>`,
})
export class AddressTableComponent implements OnInit, OnDestroy {
  addresses$ = this.query.selectAll();
  addresses: AddressMaintenance[];
  addressesSub: Subscription;

  getSub: Subscription;

  addressCodeFilter: string;

  private table: webix.ui.datatable;
  private columnConfig = [
    {
      id: 'code',
      header: 'Code',
      sort: 'int',
      width: '100',
    },
    {
      id: 'authorityDescription',
      header: 'Authority',
      sort: 'string',
      width: '300',
    },
  ];

  constructor(
    private query: AddressMaintenanceQuery,
    private service: AddressMaintenanceService,
    private routedTabService: RoutedTabService,
    private routerQuery: RouterQuery
  ) {}

  ngOnInit(): void {
    this.routerQuery
      .selectQueryParams('addressCode')
      .subscribe(
        (addressCode) => (this.addressCodeFilter = <string>addressCode)
      ); // TODO fix typing

    // only call api when there's no addresses in the store
    this.getSub = this.query
      .selectHasCache()
      .pipe(
        filter((hasCache) => !hasCache), // only continue to next step if don't have cache
        switchMap(() => {
          const params = new HttpParams()
            .set('addressFrom', this.addressCodeFilter)
            .set('addressTo', this.addressCodeFilter);
          return this.service.get({
            mapResponseFn: (res: AddressMaintenanceWrapper) => res.addresses,
            params,
          });
        })
      )
      .subscribe();

    this.table = webix.ui({
      id: 'address-table',
      container: 'address-table',
      view: 'datatable',
      columns: this.columnConfig,
      data: [],
      select: 'row',
      on: {
        onAfterSelect: (id: number) =>
          this.onRowSelect(this.table?.getItem(id)),
      },
    }) as webix.ui.datatable;
    this.table.resize();

    this.addressesSub = combineLatest([
      this.addresses$,
      this.query.scrollState$,
    ]).subscribe(([addresses, scrollState]) => {
      this.addresses = addresses;
      this.table?.clearAll();
      this.table?.parse(JSON.stringify(this.addresses), 'json');
      this.table?.refresh();
      this.table?.scrollTo(scrollState.x, scrollState.y);
    });
  }

  onRowSelect(address: AddressMaintenance) {
    this.routedTabService.addTab(
      { path: address.code, label: address.code },
      Routes.address
    );
  }

  ngOnDestroy() {
    this.service.setScrollState(this.table.getScrollState());
    this.table?.destructor();
    this.addressesSub?.unsubscribe();
  }
}
