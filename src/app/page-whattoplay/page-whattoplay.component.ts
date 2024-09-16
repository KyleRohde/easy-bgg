import { Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { interval, map, takeWhile } from 'rxjs';
import { BoardgameBggEntryParser as bggParser } from '../models/boardgame-bggentry';
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
    MatTableModule,
    HttpClientModule,
    MatPaginatorModule,
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
  tableCols: string[] = ["thumbnail", "title"];
  usersLoaded: string[] = [];
  formFields: FormGroup;
  entries: MatTableDataSource<any> = new MatTableDataSource<any>([]);
  refetch: number = 0;
  tooManyUsers: boolean = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private http: HttpClient) {
    this.formFields = new FormGroup({
      username: new FormControl("")
    });
  }

  onSubmit() {
    let newUser: string = this.formFields.value.username;
    if(newUser === "") {
      // TODO: show toast
    }
    else if(this.refetch === 0) {
      // TODO: check user already fetched
      if(!this.usersLoaded.includes(newUser)) {
        this.fetchData(newUser);
      }
      else {
        // TODO: show toast
      }
    }
  }

  fetchData(username: string) {
    const url = "https://boardgamegeek.com/xmlapi2/collection";
    const queryParams = `excludesubtype=boardgameexpansion&wanttoplay=1&username=${username}`;
    const reqOpts: any = {
      responseType: "text",
      observe: "response"
    };
    
    //this.entries = new MatTableDataSource<any>([]);
    this.http.get(`${url}?${queryParams}`, reqOpts)
      .subscribe((res: any) => {
        if(res.status === 202) {
          // re-fetch in 5 seconds
          this.refetch = 5;
          const strCopy = (" " + username).slice(1);
          interval(1000).pipe(
            map(n => n + 1),
            takeWhile(n => n < 6)
          ).subscribe((n) => {
            this.refetch = 5 - n;
            if(n >= 5) {
              this.fetchData(strCopy);
            }
          });
        }
        else {
          this.refetch = 0;

          let newGamesList: any = {...this.entries.data};
          xml2js.parseString(res.body, (err, data) => {
              if(err) {
                console.error(err.message);
              }
              else {
                try {
                  data.items.item.forEach((val: any) => {
                    let parsedEntry: any;
                    try {
                      parsedEntry = bggParser.fromBggXmlSimple(val);
                    }
                    catch(ex:any) {
                      console.log(ex, val);
                    }
                    
                    let entryUpdate: string[] = newGamesList[parsedEntry.title];
                    if(entryUpdate === null || entryUpdate === undefined) {
                      entryUpdate = [this.formFields.value.username];
                    }
                    else {
                      entryUpdate.push(this.formFields.value.username);
                    }

                    newGamesList[parsedEntry.title] = entryUpdate;
                  });
                }
                catch(err: any) {
                  console.log(err);
                  console.log(data);
                  // TODO: flag and do not save to list
                }
              }
            });
          console.log(newGamesList);
          let newData = new MatTableDataSource<any>(newGamesList);
          newData.paginator = this.paginator;
          //newData.sort = this.sort;
          this.entries = newData;
          this.usersLoaded.push(username);
          this.formFields.setValue({username: ""});
        }
      });
  }

  toggleUser(selectedUsers: string[]) {
    console.log(selectedUsers, selectedUsers.length);
    if(selectedUsers.length > 3) {
      this.tooManyUsers = true;
    }
    else {
      this.tooManyUsers = false;
    }
  }
}
