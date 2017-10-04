"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const options_1 = require("./model/options");
const classmetadata_1 = require("./model/classmetadata");
const fieldmetadata_1 = require("./model/fieldmetadata");
const filemetadata_1 = require("./model/filemetadata");
const ts_file_parser_1 = require("ts-file-parser");
const nunjucks_1 = require("nunjucks");
const path = require("path");
function createHistoryModelsInternal(prop) {
    var metadata = createMetadatas(prop);
    var resultTemplate = createFiles(metadata);
    return resultTemplate;
}
exports.createHistoryModelsInternal = createHistoryModelsInternal;
function createOptionsOfGrunt(obj) {
    var options = new options_1.Options();
    var files = new Array();
    for (var i = 0; i < obj.files.length; i++) {
        var file = new options_1.FileMapping();
        if (obj.files[i].src.length === 1) {
            file.source = obj.files[i].src[0];
        }
        else {
            file.source = obj.files[i].src[0];
        }
        file.destination = obj.files[i].dest;
        files.push(file);
    }
    options.files = files;
    if (obj.data.oneFile && obj.files.length) {
        options.allInOneFile = `${obj.files[0].orig.dest}/common.ts`;
    }
    return options;
}
exports.createOptionsOfGrunt = createOptionsOfGrunt;
function createMetadatas(properties) {
    var fs = require("fs");
    let generationFiles;
    generationFiles = new Array();
    var wasFiled = 0;
    var fileMet;
    var files = properties.files;
    for (var file of files) {
        if (properties.allInOneFile) {
            if (fileMet === undefined) {
                fileMet = new filemetadata_1.FileMetadata();
            }
            fileMet.filename = properties.allInOneFile;
            if (fileMet.classes === undefined) {
                fileMet.classes = new Array();
            }
        }
        else {
            fileMet = new filemetadata_1.FileMetadata();
            fileMet.filename = file.destination;
            fileMet.classes = new Array();
        }
        var stringFile = fs.readFileSync(file.source, "utf-8");
        var jsonStructure = ts_file_parser_1.parseStruct(stringFile, {}, file.source);
        jsonStructure.classes.forEach(cls => {
            let classMet = new classmetadata_1.ClassMetadata();
            classMet.name = cls.name;
            classMet.fields = new Array();
            cls.decorators.forEach(dec => {
                if (dec.name === "GenerateHistory") {
                    classMet.generateHistory = true;
                }
            });
            if (classMet.generateHistory === false) {
                return;
            }
            cls.fields.forEach(fld => {
                let fldMetadata = new fieldmetadata_1.FieldMetadata();
                if (fld.type.base !== undefined) {
                    fldMetadata.name = fld.name;
                    var skobes = "[]";
                    fldMetadata.isArray = true;
                    fldMetadata.type = fld.type.base.typeName;
                    var curBase = fld.type.base;
                    while (curBase.base !== undefined) {
                        curBase = curBase.base;
                        fldMetadata.type = curBase.typeName;
                        skobes += "[]";
                    }
                    fldMetadata.type += skobes;
                }
                else {
                    fldMetadata.name = fld.name;
                    fldMetadata.type = fld.type.typeName;
                }
                let isDbColumn = false, isIgnoredInHistory = false;
                fld.decorators.forEach(dec => {
                    if (dec.name === "IgnoredInHistory") {
                        isIgnoredInHistory = true;
                    }
                    if (dec.name === "Column") {
                        isDbColumn = true;
                    }
                    if (dec.name === "HistoryIndex") {
                        fldMetadata.generateIndex = true;
                    }
                });
                if (!isDbColumn || isIgnoredInHistory) {
                    fldMetadata.ignoredInHistory = true;
                }
                classMet.fields.push(fldMetadata);
            });
            if (fileMet.classes === null) {
                fileMet.classes = [];
            }
            fileMet.classes.push(classMet);
        });
        if (properties.allInOneFile && wasFiled === 0) {
            generationFiles.push(fileMet);
            wasFiled++;
        }
        if (!properties.allInOneFile) {
            generationFiles.push(fileMet);
        }
    }
    return generationFiles;
}
function createFiles(metadata) {
    let viewsFolder = path.resolve(__dirname, "view/");
    nunjucks_1.configure(viewsFolder, { autoescape: true, trimBlocks: true });
    let res = [];
    for (var i = 0; i < metadata.length; i++) {
        var mdata = metadata[i];
        mdata.classes = mdata.classes.filter((item) => item.generateHistory);
        var c = nunjucks_1.render("historyTemplateCommon.njk", { metafile: mdata });
        if (c && c.trim()) {
            var fs = require("fs");
            var mkdirp = require("mkdirp");
            var getDirName = require("path").dirname;
            mkdirp.sync(getDirName(metadata[i].filename));
            fs.writeFileSync(metadata[i].filename, c, "utf-8");
            res.push(c);
        }
    }
    return res;
}
//# sourceMappingURL=createHistoryModels.js.map