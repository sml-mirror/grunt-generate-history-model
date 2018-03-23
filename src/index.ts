import {createHistoryModelsInternal} from "./tasks/createHistoryModels";
import {Options} from "./tasks/model/options";
import { GenerateHistoryOptions } from "./tasks/model/generateHistoryOptions";


export function createHistoryModels(): string [] {
    return createHistoryModelsInternal();
}


export function GenerateHistory(options: GenerateHistoryOptions): Function {
    return function() {
        var f;
    };
}
export function IgnoredInHistory(): Function {
    return function() {
        var f;
};
}
export function HistoryIndex(indexName?: string): Function {
    return function() {
        var f;
};
}
