import { Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { BoardgameBggEntry, BoardgameBggEntryParser as bggParser } from '../models/boardgame-bggentry';
import { interval, map, takeWhile, lastValueFrom } from 'rxjs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSort, MatSortModule } from '@angular/material/sort';
import * as xml2js from 'xml2js';

@Component({
  selector: 'app-games-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
		NgFor,
		HttpClientModule,
		NgIf,
		MatTableModule,
		MatPaginatorModule,
		MatIconModule,
		MatFormFieldModule,
		MatInputModule,
    MatButtonModule,
    MatSortModule
  ],
  templateUrl: './games-list.component.html',
  styleUrl: '../../styles/games-list.component.scss'
})
export class GamesListComponent {
  tableCols: string[] = ["thumbnail", "title", "yearPublished", "own", "wantToPlay"];
  formFields: FormGroup;
  entries: MatTableDataSource<BoardgameBggEntry> = new MatTableDataSource<BoardgameBggEntry>([]);
  refetch: number = 0;
  hasRetried: boolean = false;
  lockInput: boolean = false;
  titleName: string = "";

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private http: HttpClient) {
    this.formFields = new FormGroup({
      username: new FormControl({value: "", disabled: false})
    });
  }
  
  async onSubmit() {
    if(this.formFields.value.username === "") {
      // TODO: show toast
    }
    else if(this.refetch === 0) {
      this.entries = new MatTableDataSource<BoardgameBggEntry>([]);
      let xmlParsed: any = await this.fetchData(this.formFields.value.username);
      //console.log(xmlParsed);
    
      if(xmlParsed.status === 202) {
        if(this.hasRetried) {
          // TODO: show toast
          this.hasRetried = false;
          this.lockFields(false);
          return;
        }
        this.hasRetried = true;
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
        console.log("Error parsing data");
        this.lockFields(false);
        return;
      }

      let newGamesList: BoardgameBggEntry[] = [];
      xmlParsed.data.forEach((val: any) => {
        try {
          let newEntry: BoardgameBggEntry = bggParser.fromBggXml(val);
          newGamesList.push(newEntry);
        }
        catch(ex:any) {
          console.log(ex, val);
        }
      });

      this.titleName = this.formFields.value.username;
      let newData = new MatTableDataSource<BoardgameBggEntry>(newGamesList);
      newData.paginator = this.paginator;
      newData.sort = this.sort;
      this.entries = newData;
      this.formFields.setValue({username: ""});
    }
  }

  private async fetchData(username: string) {
    const url = "https://boardgamegeek.com/xmlapi2/collection";
    const queryParams = `excludesubtype=boardgameexpansion&username=${username}`;
    const reqOpts: any = {
      responseType: "text",
      observe: "response"
    };
        
    let res: any = {};
    try {
      res = await lastValueFrom(this.http.get(`${url}?${queryParams}`, reqOpts));
    }
    catch(ex) {
      console.error(ex);
      return {
        status: 500,
        data: null
      }
    }
    
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

  private lockFields(shouldLock: boolean) {
    this.lockInput = shouldLock;
    if(!shouldLock) {
      this.formFields.get("username")?.enable();
    }
    else {
      this.formFields.get("username")?.disable();
    }
  }
}
