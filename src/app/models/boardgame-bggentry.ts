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
        let newEntry: BoardgameBggEntry = {
            title: xml.name[0]._,
            thumbnailUrl: xml.thumbnail[0],
            yearPublished: xml.yearpublished[0],
            wantToPlay: xml.status[0].$.wanttoplay === "1",
            own: xml.status[0].$.own === "1",
            objectId: xml.$.objectid,
            collId: xml.$.collid
        };
        return newEntry;
    }
}