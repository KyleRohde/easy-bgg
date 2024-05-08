import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { BoardgameBggEntry, BoardgameBggEntryParser as bggParser } from '../models/boardgame-bggentry';
import { timer } from 'rxjs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
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
    MatButtonModule
  ],
  templateUrl: './games-list.component.html',
  styleUrl: '/src/styles/styles.scss'
})
export class GamesListComponent implements AfterViewInit {
  tableCols: string[] = ["thumbnail", "title", "year", "own", "wtp"];
  formFields: FormGroup;
  entries: MatTableDataSource<BoardgameBggEntry> = new MatTableDataSource<BoardgameBggEntry>([]);
  refetch: boolean = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private http: HttpClient) {
    this.formFields = new FormGroup({
      username: new FormControl("")
    });
  }

  ngAfterViewInit() {
    this.entries.paginator = this.paginator;
  }

  onSubmit() {
    console.log(this.formFields);
    if(this.formFields.value.username === "") {
      // TODO: show toast
    }
    else {
      this.fetchData(this.formFields.value.username);
    }
  }

  fetchData(username: string) {
    const url = "https://boardgamegeek.com/xmlapi2/collection";
    const queryParams = `excludesubtype=boardgameexpansion&username=${username}`;
    const reqOpts: any = {
      responseType: "text",
      observe: "response"
    }
    
    this.http.get(`${url}?${queryParams}`, reqOpts)
      .subscribe((res: any) => {
        if(res.status === 202) {
          this.refetch = true;
          // re-fetch in 5 seconds
          const strCopy = (" " + username).slice(1);
          timer(5 * 1000).subscribe(() => this.fetchData(strCopy));
        }
        else {
          this.refetch = false;
          this.formFields.value.username = "";

          let newGamesList: BoardgameBggEntry[] = [];
          xml2js.parseString(res.body, (err, data) => {
              if(err) {
                console.error(err.message);
              }
              else {
                console.log({msg:"Here's your stuff", z: data.items.item});
                data.items.item.forEach((val: any) => {
                  let newEntry: BoardgameBggEntry = bggParser.fromBggXml(val);
                  newGamesList.push(newEntry);
                });
              }
            })
            let newData = new MatTableDataSource<BoardgameBggEntry>(newGamesList);
            newData.paginator = this.paginator;
            this.entries = newData;
        }
      }, (err: any) => console.log(err))
  }
}
