import {TagsFilter} from "../Tags";
import * as $ from "jquery"
import * as OsmToGeoJson from "osmtogeojson";
import Bounds from "../../Models/Bounds";

/**
 * Interfaces overpass to get all the latest data
 */
export class Overpass {
    private _filter: TagsFilter
    public static testUrl: string = null

    constructor(filter: TagsFilter) {
        this._filter = filter
    }

    
    private buildQuery(bbox: string): string {
        const filters = this._filter.asOverpass()
        let filter = ""
        for (const filterOr of filters) {
            filter += 'nwr' + filterOr + ';'
        }
        const query =
            '[out:json][timeout:25]' + bbox + ';(' + filter + ');out body;>;out skel qt;'
        return "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query)
    }
    
    queryGeoJson(bounds: Bounds, continuation: ((any, date: Date) => void), onFail: ((reason) => void)): void {

        let query = this.buildQuery("[bbox:" + bounds.south + "," + bounds.west + "," + bounds.north + "," + bounds.east + "]")

        if (Overpass.testUrl !== null) {
            console.log("Using testing URL")
            query = Overpass.testUrl;
        }
        $.getJSON(query,
            function (json, status) {
                if (status !== "success") {
                    console.log("Query failed")
                    onFail(status);
                }

                if (json.elements === [] && json.remarks.indexOf("runtime error") > 0) {
                    console.log("Timeout or other runtime error");
                    onFail("Runtime error (timeout)")
                    return;
                }
                // @ts-ignore
                const geojson = OsmToGeoJson.default(json);
                const osmTime = new Date(json.osm3s.timestamp_osm_base);
                continuation(geojson, osmTime);
            }).fail(onFail)
    }
}
