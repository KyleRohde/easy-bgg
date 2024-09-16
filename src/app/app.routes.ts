import { Routes } from '@angular/router';
import { GamesListComponent } from './games-list/games-list.component';
import { PageHomeComponent } from './page-home/page-home.component';
import { PageWhattoplayComponent } from './page-whattoplay/page-whattoplay.component';

export const routes: Routes = [
    { path: "", component: PageHomeComponent },
    { path: "my-games", component: GamesListComponent },
    { path: "what-to-play", component: PageWhattoplayComponent }
];
