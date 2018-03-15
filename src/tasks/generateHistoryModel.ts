"use strict";
import {createHistoryModelsInternal, createOptionsOfGrunt} from "./createHistoryModels";

function makeHistory(grunt: IGrunt) {
  grunt.registerMultiTask("generateHistoryModel", function() {
        var options = createOptionsOfGrunt(grunt);
        createHistoryModelsInternal();
    }
);
}
module.exports = makeHistory;



