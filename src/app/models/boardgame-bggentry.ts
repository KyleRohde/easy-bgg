export interface BoardgameBggEntry {
    title: string;
    thumbnailUrl: string;
    yearPublished: string;
    wantToPlay: boolean;
    own: boolean;
    objectId: string;
    collId: string;
}

export class BoardgameBggEntryParser {
    public static fromBggXml(xml: any) {
        let thumbnail:string = "assets/no-thumbnail.png";
        let year:string = "--";

        if(xml.thumbnail) {
            thumbnail = xml.thumbnail[0];
        }
        if(xml.yearpublished) {
            year = xml.yearpublished[0];
        }

        let newEntry: BoardgameBggEntry = {
            title: xml.name[0]._,
            thumbnailUrl: thumbnail,
            yearPublished: year,
            wantToPlay: xml.status[0].$.wanttoplay === "1",
            own: xml.status[0].$.own === "1",
            objectId: xml.$.objectid,
            collId: xml.$.collid
        };
        return newEntry;
    }

    public static fromBggXmlSimple(xml: any) {
        let thumbnail:string = "assets/no-thumbnail.png";

        if(xml.thumbnail) {
            thumbnail = xml.thumbnail[0];
        }

        let newEntry: any = {
            title: xml.name[0]._,
            thumbnailUrl: thumbnail
        }
        
        return newEntry;
    }
}