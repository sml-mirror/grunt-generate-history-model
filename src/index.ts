import {createHistoryModelsInternal} from "../src/tasks/createHistoryModels";
import {Options} from "./tasks/model/options";


export function createHistoryModels(options: Options): string [] {
    return createHistoryModelsInternal(options);
}


export function GenerateHistory(): any {
    return function(){
        var f;
    };
}
export function IgnoredInHistory(): any {
    return function(){
        var f;
};
}
export function HistoryIndex(): any {
    return function(){
        var f;
};
}
