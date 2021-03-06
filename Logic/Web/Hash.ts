import {UIEventSource} from "../UIEventSource";
import {Utils} from "../../Utils";

export default class Hash {

    public static hash: UIEventSource<string> = Hash.Get();

    /**
     * Gets the current string, including the pound sign
     * @constructor
     */
    public static Current(): string {
        if (Hash.hash.data === undefined || Hash.hash.data === "") {
            return ""
        } else {
            return "#" + Hash.hash.data;
        }
    }

    private static Get(): UIEventSource<string> {
        if (Utils.runningFromConsole) {
            return new UIEventSource<string>(undefined);
        }
        const hash = new UIEventSource<string>(window.location.hash.substr(1));
        hash.addCallback(h => {
            if (h === "undefined") {
                console.warn("Got a literal 'undefined' as hash, ignoring")
                h = undefined;
            }

            if (h === undefined || h === "") {
                window.location.hash = "";
                return;
            }

            window.location.hash = "#" + h;
        });


        window.onhashchange = () => {
            let newValue = window.location.hash.substr(1);
            if (newValue === "") {
                newValue = undefined;
            }
            hash.setData(newValue)
        }

        return hash;
    }

}