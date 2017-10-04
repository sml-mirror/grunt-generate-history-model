"use strict";
import {createHistoryModelsInternal, createOptionsOfGrunt} from "./createHistoryModels";

function makeHistory(grunt: any) {
  grunt.registerMultiTask("generateHistoryModel", function(){
        var options = createOptionsOfGrunt(this);
        createHistoryModelsInternal(options);
    }
);
}
module.exports = makeHistory;



