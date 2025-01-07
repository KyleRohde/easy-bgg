import { Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { BoardgameBggEntry, BoardgameBggEntryParser as bggParser } from '../models/boardgame-bggentry';
import { interval, map, takeWhile } from 'rxjs';
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

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private http: HttpClient) {
    this.formFields = new FormGroup({
      username: new FormControl("")
    });
  }
  
  onSubmit() {
    if(this.formFields.value.username === "") {
      // TODO: show toast
    }
    else if(this.refetch === 0) {
      this.fetchData(this.formFields.value.username);
    }
  }

  fetchData(username: string) {
    const url = "https://boardgamegeek.com/xmlapi2/collection";
    const queryParams = `excludesubtype=boardgameexpansion&username=${username}`;
    const reqOpts: any = {
      responseType: "text",
      observe: "response"
    };
    
    this.entries = new MatTableDataSource<BoardgameBggEntry>([]);
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

          let newGamesList: BoardgameBggEntry[] = [];
          xml2js.parseString(res.body, (err, data) => {
              if(err) {
                console.error(err.message);
              }
              else {
                data.items.item.forEach((val: any) => {
                  try {
                    let newEntry: BoardgameBggEntry = bggParser.fromBggXml(val);
                    newGamesList.push(newEntry);
                  }
                  catch(ex:any) {
                    console.log(ex, val);
                  }
                });
              }
            });

          let newData = new MatTableDataSource<BoardgameBggEntry>(newGamesList);
          newData.paginator = this.paginator;
          newData.sort = this.sort;
          this.entries = newData;
          this.formFields.setValue({username: ""});
          console.log(newData);
        }
      }, (err: any) => console.log(err))
  }
}
