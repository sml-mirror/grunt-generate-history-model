import {createHistoryModelsInternal} from "./tasks/createHistoryModels";
import {Options} from "./tasks/model/options";


export function createHistoryModels(options: Options): string [] {
    return createHistoryModelsInternal(options);
}


export function GenerateHistory(): Function {
    return function(){
        var f;
    };
}
export function IgnoredInHistory(): Function {
    return function(){
        var f;
};
}
export function HistoryIndex(): Function {
    return function(){
        var f;
};
}
