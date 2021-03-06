import {And, TagsFilter} from "../../Logic/Tags";
import {TagRenderingConfigJson} from "./TagRenderingConfigJson";
import Translations from "../../UI/i18n/Translations";
import {FromJSON} from "./FromJSON";
import ValidatedTextField from "../../UI/Input/ValidatedTextField";
import {Translation} from "../../UI/i18n/Translation";
import {Utils} from "../../Utils";

/***
 * The parsed version of TagRenderingConfigJSON
 * Identical data, but with some methods and validation
 */
export default class TagRenderingConfig {

    readonly render?: Translation;
    readonly question?: Translation;
    readonly condition?: TagsFilter;

    readonly freeform?: {
        readonly  key: string,
        readonly    type: string,
        readonly   addExtraTags: TagsFilter[];
    };

    readonly multiAnswer: boolean;

    readonly mappings?: {
        readonly if: TagsFilter,
        readonly ifnot?: TagsFilter,
        readonly then: Translation
        readonly hideInAnswer: boolean | TagsFilter
    }[]
    readonly roaming: boolean;

    constructor(json: string | TagRenderingConfigJson, conditionIfRoaming: TagsFilter, context?: string) {

        if (json === "questions") {
            // Very special value
            this.render = null;
            this.question = null;
            this.condition = null;
        }

        if (json === undefined) {
            throw "Initing a TagRenderingConfig with undefined in " + context;
        }
        if (typeof json === "string") {
            this.render = Translations.T(json);
            this.multiAnswer = false;
            return;
        }

        this.render = Translations.T(json.render);
        this.question = Translations.T(json.question);
        this.roaming = json.roaming ?? false;
        const condition = FromJSON.Tag(json.condition ?? {"and": []}, `${context}.condition`);
        if (this.roaming && conditionIfRoaming !== undefined) {
            this.condition = new And([condition, conditionIfRoaming]);
        } else {
            this.condition = condition;
        }
        if (json.freeform) {
            this.freeform = {
                key: json.freeform.key,
                type: json.freeform.type ?? "string",
                addExtraTags: json.freeform.addExtraTags?.map((tg, i) =>
                    FromJSON.Tag(tg, `${context}.extratag[${i}]`)) ?? []
            }
            if (ValidatedTextField.AllTypes[this.freeform.type] === undefined) {
                throw `Freeform.key ${this.freeform.key} is an invalid type`
            }
        }

        this.multiAnswer = json.multiAnswer ?? false
        if (json.mappings) {
            this.mappings = json.mappings.map((mapping, i) => {

                if (mapping.then === undefined) {
                    throw `${context}.mapping[${i}]: Invalid mapping: if without body`
                }
                if (mapping.ifnot !== undefined && !this.multiAnswer) {
                    throw `${context}.mapping[${i}]: Invalid mapping: ifnot defined, but the tagrendering is not a multianswer`
                }
                let hideInAnswer: boolean | TagsFilter = false;
                if (typeof mapping.hideInAnswer === "boolean") {
                    hideInAnswer = mapping.hideInAnswer;
                } else if (mapping.hideInAnswer !== undefined) {
                    hideInAnswer = FromJSON.Tag(mapping.hideInAnswer, `${context}.mapping[${i}].hideInAnswer`);
                }
                const mp = {
                    if: FromJSON.Tag(mapping.if, `${context}.mapping[${i}].if`),
                    ifnot: (mapping.ifnot !== undefined ? FromJSON.Tag(mapping.ifnot, `${context}.mapping[${i}].ifnot`) : undefined),
                    then: Translations.T(mapping.then),
                    hideInAnswer: hideInAnswer
                };
                if (this.question) {
                    if (hideInAnswer !== true && !mp.if.isUsableAsAnswer()) {
                        throw `${context}.mapping[${i}].if: This value cannot be used to answer a question, probably because it contains a regex or an OR. Either change it or set 'hideInAnswer'`
                    }

                    if (hideInAnswer !== true && !(mp.ifnot?.isUsableAsAnswer() ?? true)) {
                        throw `${context}.mapping[${i}].ifnot: This value cannot be used to answer a question, probably because it contains a regex or an OR. Either change it or set 'hideInAnswer'`
                    }
                }

                return mp;
            });
        }

        if (this.question && this.freeform?.key === undefined && this.mappings === undefined) {
            throw `${context}: A question is defined, but no mappings nor freeform (key) are. The question is ${this.question.txt} at ${context}`
        }

        if (this.freeform && this.render === undefined) {
            throw `${context}: Detected a freeform key without rendering... Key: ${this.freeform.key} in ${context}`
        }

        if (this.question !== undefined && json.multiAnswer) {
            if ((this.mappings?.length ?? 0) === 0) {
                throw `${context} MultiAnswer is set, but no mappings are defined`
            }

            let allKeys = [];
            let allHaveIfNot = true;
            for (const mapping of this.mappings) {
                if (mapping.hideInAnswer) {
                    continue;
                }
                if (mapping.ifnot === undefined) {
                    allHaveIfNot = false;
                }
                allKeys = allKeys.concat(mapping.if.usedKeys());
            }
            allKeys = Utils.Dedup(allKeys);
            if (allKeys.length > 1 && !allHaveIfNot) {
                throw `${context}: A multi-answer is defined, which generates values over multiple keys. Please define ifnot-tags too on every mapping`
            }

        }
    }

    /**
     * Gets the correct rendering value (or undefined if not known)
     * @constructor
     */
    public GetRenderValue(tags: any): Translation {
        if (this.mappings !== undefined && !this.multiAnswer) {
            for (const mapping of this.mappings) {
                if (mapping.if === undefined) {
                    return mapping.then;
                }
                if (mapping.if.matchesProperties(tags)) {
                    return mapping.then;
                }
            }
        }


        if (this.freeform?.key === undefined) {
            return this.render;
        }

        if (tags[this.freeform.key] !== undefined) {
            return this.render;
        }
        return undefined;
    }


}