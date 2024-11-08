import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { interval, map, takeWhile, lastValueFrom } from 'rxjs';
import { BoardgameBggEntryParser as bggParser, SimpleBggEntry } from '../models/boardgame-bggentry';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgIf, NgFor } from '@angular/common';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatCheckboxModule} from '@angular/material/checkbox';
import * as xml2js from 'xml2js';

@Component({
  selector: 'app-page-whattoplay',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    HttpClientModule,
		MatFormFieldModule,
		MatInputModule,
		NgIf,
    NgFor,
    MatCheckboxModule,
    MatButtonToggleModule
  ],
  templateUrl: './page-whattoplay.component.html',
  styleUrl: '/src/styles/page-whattoplay.scss'
})
export class PageWhattoplayComponent {
  usersLoaded: { [key: string]: SimpleBggEntry[] } = {};
  selectedUsers: string[] = [];
  formFields: FormGroup;
  refetch: number = 0;
  tooManyUsers: boolean = false;

  constructor(private http: HttpClient) {
    this.formFields = new FormGroup({
      username: new FormControl("")
    });
  }

  async onSubmit() {
    let newUser: string = this.formFields.value.username;
    if(newUser === "") {
      // TODO: show toast
    }
    else if(this.refetch === 0) {
      if(!Object.keys(this.usersLoaded).includes(newUser)) {
        let xmlParsed: any = await this.fetchData(newUser);
        console.log(xmlParsed);
        // TODO: Fix this
        if(xmlParsed.status === 202) {
          // re-fetch in 5 seconds
          this.refetch = 5;
          interval(1000).pipe(
            map(n => n + 1),
            takeWhile(n => n < 6)
          ).subscribe((n) => {
            this.refetch = 5 - n;
            if(n >= 5) {
              this.onSubmit();
            }
          });
          return;
        }
        if(!xmlParsed || !xmlParsed.data) {
          // TODO: show toast
          return;
        }

        let userGamesList: SimpleBggEntry[] = [];
        try {
          xmlParsed.data.forEach((val: any) => {
            let parsedEntry: any;
            try {
              parsedEntry = bggParser.fromBggXmlSimple(val);
              userGamesList.push(parsedEntry);
            }
            catch(ex:any) {
              console.log(ex, val);
            }
          });
        }
        catch(err: any) {
          console.log(err);
          console.log(xmlParsed);
          return;
        }
        
        this.usersLoaded[newUser] = userGamesList;
        console.log(this.usersLoaded);
        this.formFields.setValue({username: ""});
      }
      else {
        // TODO: show toast for duplicate user
      }
    }
  }

  private async fetchData(username: string) {
    const url = "https://boardgamegeek.com/xmlapi2/collection";
    const queryParams = `excludesubtype=boardgameexpansion&wanttoplay=1&username=${username}`;
    const reqOpts: any = {
      responseType: "text",
      observe: "response"
    };
    
    let res: any = await lastValueFrom(this.http.get(`${url}?${queryParams}`, reqOpts));
    if(res.status === 202) {
      return {
        status: 202,
        data: null
      }
    }
    
    this.refetch = 0;
    let data: any = await xml2js.parseStringPromise(res.body);
    return {
      status: 200,
      data: data.items?.item
    }
  }

  toggleUser(selectedUsers: string[]) {
    this.selectedUsers = selectedUsers;
    if(selectedUsers.length > 3) {
      this.tooManyUsers = true;
    }
    else {
      this.tooManyUsers = false;
    }
  }

  usernameKeys() {
    return Object.keys(this.usersLoaded);
  }
}
