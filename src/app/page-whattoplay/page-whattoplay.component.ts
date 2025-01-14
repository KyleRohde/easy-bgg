import { Component, Inject, NgZone, PLATFORM_ID } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { interval, map, takeWhile, lastValueFrom } from 'rxjs';
import { BoardgameBggEntryParser as bggParser, SimpleBggEntry } from '../models/boardgame-bggentry';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgIf, NgFor, isPlatformBrowser } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
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
    MatButtonToggleModule,
    MatButtonModule,
    MatTooltip,
    MatIconModule
  ],
  templateUrl: './page-whattoplay.component.html',
  styleUrl: '../../styles/page-whattoplay.scss'
})
export class PageWhattoplayComponent {
  usersLoaded: { [key: string]: SimpleBggEntry[] } = {};
  selectedUsers: string[] = [];
  gameTiles: SimpleBggEntry[] = [];
  tileTitle: string = "";
  formFields: FormGroup;
  refetch: number = 0;
  hasRetried: boolean = false;
  lockInput: boolean = false;
  badUserCount: boolean = false;
  showTestUsers: boolean = false;

  private root!: am5.Root;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object, private zone: NgZone) {
    this.formFields = new FormGroup({
      username: new FormControl({ value: "", disabled: false})
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
      this.lockFields(true);
      if(!Object.keys(this.usersLoaded).includes(newUser)) {
        let xmlParsed: any = await this.fetchData(newUser);
        
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
          this.lockFields(false);
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
          this.lockFields(false);
          return;
        }
        
        this.usersLoaded[newUser] = userGamesList;
        this.formFields.setValue({username: ""});
        this.lockFields(false);
      }
      else {
        // TODO: show toast for duplicate user
        this.lockFields(false);
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

  // test: lukashi, itzbharath, mexo
  generateDiagram() {
    if(this.selectedUsers.length < 2 || this.selectedUsers.length > 4) {
      // TODO: error toast
      console.log("Please select 2, 3, or 4 users");
      return;
    }

    // clean up existing diagram if exists
    this.browserOnly(() => {
      if (this.root) {
        this.root.dispose();
        this.gameTiles = [];
        this.tileTitle = "";
      }
    });

    let gamesDistinct: { [key: string]: SimpleBggEntry } = {};

    // { "user": games[] } --> { "game": users[] }
    let gameDict: { [key: string]: string[] } = {};
    this.selectedUsers.forEach((val: string) => {
      this.usersLoaded[val].forEach((game: SimpleBggEntry) => {
        if(gameDict[game.objectId] === null || gameDict[game.objectId] === undefined) {
          gameDict[game.objectId] = [val];
        }
        else {
          gameDict[game.objectId].push(val);
        }

        gamesDistinct[game.objectId] = game;
      });
    });

    let vennSetDict: { [key: string]: string[] } = {};
    // Diagram HTML layers need to be added in a specific order
    // Singletons first -> pairs -> etc for higher set overlaps
    for(let x = 1; x <= this.selectedUsers.length; x++) {
      let newLayers: any = this.assembleLayers(x, this.selectedUsers, "");
      vennSetDict = {
        ...vennSetDict,
        ...newLayers
      };
    }

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
      if(vennSetDict[setName].length > 0) {
        let setEntry: any = {
          name: setName,
          value: 410 + Math.floor(200 * (vennSetDict[setName].length / totalGames)),
          games: vennSetDict[setName].length,
          gameList: vennSetDict[setName]
        };
        
        const userCount = [...setName.matchAll(/~/g)];
        if(userCount.length > 0) {
          setEntry.sets = setName.split("~");
          setEntry.value = setEntry.value - (userCount.length * 100);
        }
        seriesData.push(setEntry);
      }
    });
    console.log(seriesData);

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
      let newGameTiles: SimpleBggEntry[] = [];
      e.target._dataItem.dataContext.gameList.forEach((game: string) => newGameTiles.push(gamesDistinct[game]));
      newGameTiles.sort((g1, g2) => g1.title.toUpperCase() > g2.title.toUpperCase() ? 1 : 0);
      this.gameTiles = newGameTiles;

      if(!e.target._dataItem.dataContext.sets) {
        this.tileTitle = `Want to Play List for ${e.target._dataItem.dataContext.name}`
      }
      else {
        this.tileTitle = `Common Want-to-Play Games for ${e.target._dataItem.dataContext.sets.join(" & ")}`;
      }
    });

    /*[{ name: "A", value: 10 },
    { name: "B", value: 8 },
    { name: "X", value: 2, sets: ["A", "B"] }]*/
    series.data.setAll(seriesData);
    
    this.root = root;

    this.selectedUsers = [];
  }

  private assembleLayers(joinNum: number, userList: string[], currSetName: string): { [key: string]: string[] } {
    let returnSetDict: { [key: string]: string[] } = {};
    for(let x = 0; x < userList.length; x++) {
      if(joinNum > 1) {
        let recur = this.assembleLayers(joinNum - 1, userList.slice(x + 1), `${currSetName}${userList[x]}~`);
        returnSetDict = {
          ...returnSetDict,
          ...recur
        }
      }
      else {
        returnSetDict[`${currSetName}${userList[x]}`] = [];
      }
    }

    return returnSetDict;
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

  toggleUser(selectedUsers: string[]) {
    this.selectedUsers = selectedUsers;
    if(selectedUsers.length === 1 || selectedUsers.length > 4) {
      this.badUserCount = true;
    }
    else {
      this.badUserCount = false;
    }
  }

  toggleTestUsers() {
    this.showTestUsers = !this.showTestUsers;
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
