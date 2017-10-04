"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createHistoryModels_1 = require("./createHistoryModels");
function makeHistory(grunt) {
    grunt.registerMultiTask("generateHistoryModel", function () {
        var options = createHistoryModels_1.createOptionsOfGrunt(this);
        createHistoryModels_1.createHistoryModelsInternal(options);
    });
}
module.exports = makeHistory;
//# sourceMappingURL=generateHistoryModel.js.map