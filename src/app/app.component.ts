import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  BehaviorSubject,
  Observable,
  Subscription,
  tap,
  map,
  combineLatest,
  distinctUntilChanged,
} from 'rxjs';
import { APIService, Restaurant } from './API.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'amplify-angular-app';
  public createForm: FormGroup;

  private _restaurants = new BehaviorSubject<Restaurant[]>([]);
  public restaurants$ = this._restaurants.asObservable();

  private _page = new BehaviorSubject<number>(1);
  public page$ = this._page.asObservable().pipe(distinctUntilChanged());
  private _pageSize = 5;

  paginatedRestaurants$: Observable<Restaurant[]> = combineLatest([
    this.restaurants$,
    this.page$,
  ]).pipe(
    tap(([restaurants, page]) => console.log(restaurants, page)),
    map(([restaurants, page]) => {
      const start = page === 1 ? 0 : (page - 1) * 5;
      return restaurants.slice(start, start + this._pageSize);
    })
  );

  get pages() {
    return Math.ceil(this._restaurants.value.length / 5);
  }

  private subscription: Subscription | null = null;

  constructor(private api: APIService, private fb: FormBuilder) {
    this.createForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      city: ['', Validators.required],
    });
  }

  async ngOnInit() {
    this.api.ListRestaurants().then((event) => {
      this._restaurants.next(event.items as Restaurant[]);
    });

    this.subscription = <Subscription>(
      this.api.OnCreateRestaurantListener.subscribe((event: any) => {
        const newRestaurant = event.value.data.onCreateRestaurant;
        this._restaurants.next([newRestaurant, ...this._restaurants.value]);
      })
    );
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.subscription = null;
  }

  public onCreate(restaurant: Restaurant) {
    this.api
      .CreateRestaurant(restaurant)
      .then((event) => {
        console.log('item created!');
        this.createForm.reset();
      })
      .catch((e) => {
        console.log('error creating restaurant...', e);
      });
  }

  decrement() {
    const nextValue = this._page.value - 1 > 0 ? this._page.value - 1 : 1;
    this._page.next(nextValue);
  }

  increment() {
    const nextValue =
      this._page.value + 1 <= this.pages ? this._page.value + 1 : this.pages;
    this._page.next(nextValue);
  }
}
