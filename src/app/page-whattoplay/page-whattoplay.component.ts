import { Component, Inject, NgZone, PLATFORM_ID } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { interval, map, takeWhile, lastValueFrom } from 'rxjs';
import { BoardgameBggEntryParser as bggParser, SimpleBggEntry } from '../models/boardgame-bggentry';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgIf, NgFor, isPlatformBrowser } from '@angular/common';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatCheckboxModule} from '@angular/material/checkbox';
import * as xml2js from 'xml2js';
import * as am5 from "@amcharts/amcharts5";
import * as am5venn from "@amcharts/amcharts5/venn";

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

  private root!: am5.Root;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object, private zone: NgZone) {
    this.formFields = new FormGroup({
      username: new FormControl("")
    });
  }

  browserOnly(f: () => void) {
    if (isPlatformBrowser(this.platformId)) {
      this.zone.runOutsideAngular(() => {
        f();
      });
    }
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

  // test: lukashi, itzbharath, mexo
  generateDiagram() {
    if(this.selectedUsers.length !== 3) {
      // TODO: error toast
      console.log("Please select 3 users");
      return;
    }

    // clean up existing diagram if exists
    this.browserOnly(() => {
      if (this.root) {
        this.root.dispose();
      }
    });

    let gameDict: { [key: string]: string[] } = {};
    // { "user": games[] } --> { "game": users[] }
    this.selectedUsers.forEach((val) => {
      this.usersLoaded[val].forEach((game) => {
        if(gameDict[game.title] === null || gameDict[game.title] === undefined) {
          gameDict[game.title] = [val];
        }
        else {
          gameDict[game.title].push(val);
        }
      });
    });

    let vennSetDict: { [key: string]: string[] } = {};
    // Needs to be assembled EXCALTY like this for diagram HTML layers
    this.selectedUsers.forEach((val) => vennSetDict[val] = []);
    vennSetDict[`${this.selectedUsers[0]}~${this.selectedUsers[1]}`] = [];
    vennSetDict[`${this.selectedUsers[0]}~${this.selectedUsers[2]}`] = [];
    vennSetDict[`${this.selectedUsers[1]}~${this.selectedUsers[2]}`] = [];
    vennSetDict[this.selectedUsers.join("~")] = [];

    console.log(this.selectedUsers, gameDict);
    // { "game": users[] } --> { "user~ ... ~user": games[] }
    Object.keys(gameDict).forEach((game) => {
      // For some reason, you can add duplicate records for a game. Find uniqueness
      const vsKey: string = [... new Set(gameDict[game])].join("~");
      vennSetDict[vsKey].push(game);
    });

    const totalGames = Object.keys(gameDict).length;
    let seriesData: {}[] = [];
    Object.keys(vennSetDict).forEach((setName) => {
      const circleSize = 110 + (200 * (vennSetDict[setName].length / totalGames));
      let setEntry: any = {
        name: setName,
        value: vennSetDict[setName].length > 0 ? circleSize : 0,
        games: vennSetDict[setName].length,
        gameList: vennSetDict[setName]
      };

      const userCount = [...setName.matchAll(/~/g)];
      if(userCount.length > 0) {
        setEntry.sets = setName.split("~");
        setEntry.value = Math.max(setEntry.value - (userCount.length * 50), 0);
      }
      seriesData.push(setEntry);
    });

    // assemble chart and properties
    let root = am5.Root.new("VennDiagram");
    let series = root.container.children.push(
      am5venn.Venn.new(root, {
        categoryField: "name",
        valueField: "value",
        intersectionsField: "sets"
      })
    );

    series.hoverGraphics.setAll({
      strokeDasharray: [4, 4],
      stroke: am5.color(0x777777),
      strokeWidth: 4
    })
    series.slices.template.set("tooltipText", "{games}");
    
    series.slices.template.events.on("click", (e: any) => {
      console.log(e);
      console.log(e.target._dataItem.dataContext);
    });

    /*[{ name: "A", value: 10 },
    { name: "B", value: 8 },
    { name: "X", value: 2, sets: ["A", "B"] }]*/
    series.data.setAll(seriesData);
    
    this.root = root;
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

  ngOnDestroy() {
    // Clean up chart when the component is removed
    this.browserOnly(() => {
      if (this.root) {
        this.root.dispose();
      }
    });
  }
}
