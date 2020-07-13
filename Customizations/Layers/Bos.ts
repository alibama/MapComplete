import {LayerDefinition} from "../LayerDefinition";
import {Quests} from "../../Quests";
import {And, Or, Tag} from "../../Logic/TagsFilter";
import {AccessTag} from "../Questions/AccessTag";
import {OperatorTag} from "../Questions/OperatorTag";
import {TagRenderingOptions} from "../TagRendering";
import {NameQuestion} from "../Questions/NameQuestion";
import {NameInline} from "../Questions/NameInline";
import {DescriptionQuestion} from "../Questions/DescriptionQuestion";

export class Bos extends LayerDefinition {

    constructor() {
        super();
        this.name = "bos";
        this.icon = "./assets/tree_white_background.svg";

        this.overpassFilter = new Or([
                new Tag("natural", "wood"),
                new Tag("landuse", "forest"),
                new Tag("natural", "scrub")
            ]
        );


        this.newElementTags = [
            new Tag("landuse", "forest"),
            new Tag("fixme", "Toegevoegd met MapComplete, geometry nog uit te tekenen")
        ];
        this.maxAllowedOverlapPercentage = 10;

        this.minzoom = 13;
        this.style = this.generateStyleFunction();
        this.title = new NameInline("bos");
        this.elementsToShow = [
            new NameQuestion(),
            new AccessTag(),
            new OperatorTag(),
            new DescriptionQuestion("bos")
        ];

    }


    private generateStyleFunction() {
        const self = this;
        return function (properties: any) {
            let questionSeverity = 0;
            for (const qd of self.elementsToShow) {
                if (qd.IsQuestioning(properties)) {
                    questionSeverity = Math.max(questionSeverity, qd.Priority());
                }
            }

            let colormapping = {
                0: "#00bb00",
                1: "#00ff00",
                10: "#dddd00",
                20: "#ff0000"
            };

            let colour = colormapping[questionSeverity];
            while (colour == undefined) {
                questionSeverity--;
                colour = colormapping[questionSeverity];
            }

            return {
                color: colour,
                icon: undefined
            };
        };
    }

}