
import {Options, FileMapping} from "./model/options";
import {ClassMetadata} from "./model/classmetadata";
import {FieldMetadata} from "./model/fieldmetadata";
import {FileMetadata} from "./model/filemetadata";
import {IExtensionGruntFilesConfig} from "./model/extensionFileConfig";
import {parseStruct} from "ts-file-parser";
import {ArrayType, BasicType} from "ts-file-parser";
import {render, renderString, configure} from "nunjucks";
import * as path from "path";

export function createHistoryModelsInternal(prop: Options): string [] {
    var  metadata = createMetadatas(prop);
    var resultTemplate = createFiles(metadata);
    return resultTemplate;
 }
export function createOptionsOfGrunt(obj: IGrunt): Options {
     var options = new Options();
     var files = new Array<FileMapping>();
     for (var i = 0; i <  obj.task.current.files.length; i++) {
         var file = new FileMapping();
         if ( obj.task.current.files[i].src.length === 1) {
             file.source =  obj.task.current.files[i].src[0];
         } else {
            file.source =  obj.task.current.files[i].src[0];
         }
         file.destination =  obj.task.current.files[i].dest;
         files.push(file);
     }
    options.files = files;
    if ( obj.task.current.data.oneFile &&  obj.task.current.files.length) {
        var fileConfig = obj.task.current.files[0] as IExtensionGruntFilesConfig;
        options.allInOneFile = `${fileConfig.orig.dest}/common.ts`;
     }

     return options;
 }

function createMetadatas(properties: Options) {
    var fs = require("fs");
    let generationFiles: FileMetadata[];
    generationFiles = new Array<FileMetadata>();
    var wasFiled = 0;
    var fileMet;
    var files = properties.files;
    for (var file of files) {
        if (properties.allInOneFile) {
            if (fileMet === undefined) {
            fileMet = new FileMetadata();
            }
            fileMet.filename = properties.allInOneFile;
            if (fileMet.classes === undefined) {
            fileMet.classes = new Array<ClassMetadata>();
            }
        } else  {
            fileMet = new FileMetadata();
            fileMet.filename = file.destination;
            fileMet.classes = new Array<ClassMetadata>();
        }
        var stringFile = fs.readFileSync(file.source, "utf-8");
        var jsonStructure = parseStruct(stringFile, {}, file.source);
        jsonStructure.classes.forEach(cls => {
            let classMet = new ClassMetadata();
            classMet.name = cls.name;
            classMet.fields = new Array<FieldMetadata>();
            cls.decorators.forEach(dec => {
                if (dec.name === "GenerateHistory") {
                    classMet.generateHistory = true;
                }
            });
            if (classMet.generateHistory === false) {
                return;
            }
            cls.fields.forEach(fld => {
                let fldMetadata = new FieldMetadata();
                if ((<ArrayType>fld.type).base !== undefined) {
                    fldMetadata.name = fld.name;
                    var skobes = "[]";
                    fldMetadata.isArray = true;
                    fldMetadata.type = (<BasicType>(<ArrayType>fld.type).base).typeName;
                    var curBase = (<ArrayType>fld.type).base;
                    while ((<ArrayType>curBase).base !== undefined) {
                        curBase = (<ArrayType>curBase).base;
                        fldMetadata.type = (<BasicType>curBase).typeName;
                        skobes += "[]";
                    }
                    fldMetadata.type += skobes;
                } else {
                    fldMetadata.name = fld.name;
                    fldMetadata.type = (<BasicType>fld.type).typeName;
                }

                let isDbColumn = false, isIgnoredInHistory = false;
                fld.decorators.forEach(dec => {
                    if (dec.name === "IgnoredInHistory") {
                        isIgnoredInHistory = true;
                    }

                    if (dec.name === "Column" || dec.name === "PrimaryGeneratedColumn"  || dec.name === "PrimaryColumn") {
                        isDbColumn = true;
                        dec.arguments.forEach(arg => {
                            if (arg) {
                                if (typeof(arg) === "string" && dec.arguments[0] === arg) {
                                    fldMetadata.typeInDecorator = arg;
                                }
                                if (arg["nullable"] && arg["nullable"] === true) {
                                    fldMetadata.nullable = true;
                                }
                                if (arg["name"]) {
                                    fldMetadata.name = arg["name"];
                                }
                            }
                        });
                    }
                    if (dec.name === "HistoryIndex") {
                        fldMetadata.generateIndex = true;
                    }
                    if (dec.name === "JoinColumn" && isIgnoredInHistory === false) {
                        isDbColumn = true;
                        fldMetadata.name = `${fldMetadata.name}id`;
                        fldMetadata.type = "number";
                        fldMetadata.nullable = true;
                        dec.arguments.forEach(arg => {
                            if (arg["name"]) {
                                fldMetadata.name = arg["name"];
                            }
                        });
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
function  createFiles(metadata: FileMetadata[]): string[] {
    let viewsFolder = path.resolve(__dirname, "view/");
    configure(viewsFolder, {autoescape: true, trimBlocks : true});
    let res: string [] = [];
    for ( var i = 0; i < metadata.length; i++ ) {
        var mdata = metadata[i];
        mdata.classes = mdata.classes.filter((item) => item.generateHistory);
        var c = render("historyTemplateCommon.njk", {metafile: mdata});
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
