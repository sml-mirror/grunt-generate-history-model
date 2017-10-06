import {createHistoryModelsInternal} from "../src/tasks/createHistoryModels";
import {Options} from "./tasks/model/options";


export function createHistoryModels(options: Options): string [] {
    return createHistoryModelsInternal(options);
}


export function GenerateHistory() {
    return function(){
        var f;
    };
}
export function IgnoredInHistory() {
    return function(){
        var f;
};
}
export function HistoryIndex() {
    return function(){
        var f;
};
}
