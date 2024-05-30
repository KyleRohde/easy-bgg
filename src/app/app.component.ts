import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
		RouterLink,
		RouterLinkActive,
		MatIconModule,
    NgIf
  ],
  templateUrl: './app.component.html',
  styleUrl: '/src/styles/app.component.scss'
})
export class AppComponent {
  sidebarActive: boolean = false;
  bggIcon: string = "https://cf.geekdo-static.com/icons/favicon2.ico";

  toggleSidebar() {
    this.sidebarActive = !this.sidebarActive;
  }
}
