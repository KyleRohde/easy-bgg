import { Routes } from '@angular/router';
import { GamesListComponent } from './games-list/games-list.component';
import { PageHomeComponent } from './page-home/page-home.component';

export const routes: Routes = [
    { path: "", component: PageHomeComponent },
    { path: "my-games", component: GamesListComponent }
];
