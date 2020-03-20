import {parseStruct, ImportNode} from "ts-file-parser";
import {ArrayType, BasicType} from "ts-file-parser";
import {render, configure} from "nunjucks";
import * as path from "path";
import * as fs from "fs";

import {Options, FileMapping} from "./model/options";
import {ClassMetadata} from "./model/classmetadata";
import {Import} from "./model/import";
import {FieldMetadata} from "./model/fieldmetadata";
import {FileMetadata} from "./model/filemetadata";
import { Config } from "./model/config";
import { GenerateHistoryOptions } from "./model/generateHistoryOptions";

const mkdirp = require("mkdirp");
const getDirName = path.dirname;

export function createHistoryModelsInternal(): string [] {
    let possibleFiles: string[] = [];
    let config = <Config>JSON.parse(fs.readFileSync("genconfig.json", "utf8"));
    getAllfiles(".", possibleFiles, config.check.folders);
    var  metadata = createMetadatas(possibleFiles);
    var resultTemplate = createFiles(metadata);
    return resultTemplate;
 }
export function createOptionsOfGrunt(obj: IGrunt): Options {
     var options = new Options();
     var files = new Array<FileMapping>();
     for (var i = 0; i <  obj.task.current.files.length; i++) {
         const file = new FileMapping();
         file.source =  obj.task.current.files[i].src[0];
         file.destination =  obj.task.current.files[i].dest;
         files.push(file);
     }
    options.files = files;
     return options;
 }

function createMetadatas(files: string[]) {
    let generationFiles: FileMetadata[];
    generationFiles = new Array<FileMetadata>();
    let fileMet: FileMetadata;
    for (var file of files) {
        fileMet = new FileMetadata();
        fileMet.classes = new Array<ClassMetadata>();
        var stringFile = fs.readFileSync(file, "utf-8");
        var jsonStructure = parseStruct(stringFile, {}, file);
        jsonStructure.classes.forEach(cls => {
            let classMet = new ClassMetadata();
            classMet.name = cls.name;
            let temp = cls.name.split("").map(symb => {
                if (symb.toUpperCase() === symb) {
                    symb = `_${symb.toLowerCase()}`;
                }
                return symb;
            });
            classMet.entityName = "h" + temp.join("");
            classMet.fields = new Array<FieldMetadata>();
            cls.decorators.forEach(dec => {
                if (dec.name === "GenerateHistory") {
                    let  options = <GenerateHistoryOptions>dec.arguments[0].valueOf();
                    fileMet.filename = options.historyPath + "/" + cls.name[0].toLowerCase() + cls.name.substring(1) + ".ts";
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
                    let skobes = "[]";
                    fldMetadata.isArray = true;
                    fldMetadata.type = (<BasicType>(<ArrayType>fld.type).base).typeName;
                    var curBase = (<ArrayType>fld.type).base;
                    while ((<ArrayType>curBase).base !== undefined) {
                        curBase = (<ArrayType>curBase).base;
                        fldMetadata.type = (<BasicType>curBase).typeName;
                        skobes += skobes;
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
                                    fldMetadata.typeInDecorator = dec.arguments[0].toString();
                                }
                                if (arg && arg["type"]) {
                                    fldMetadata.typeInDecorator = arg["type"];
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
                        if (dec.arguments[0]) {
                            fldMetadata.indexName = dec.arguments[0].toString();
                        }
                    }
                    if (dec.name === "JoinColumn" && !isIgnoredInHistory) {
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
                if (fldMetadata.generateIndex && !fldMetadata.indexName) {
                    fldMetadata.indexName = `ind_h${classMet.name}_${fldMetadata.name}`;
                }
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
        fileMet.imports = addTypeImports(fileMet, jsonStructure._imports);
        generationFiles.push(fileMet);
    }
    return generationFiles;
}
function addTypeImports(file: FileMetadata, originImports: ImportNode[]) {
    const typeImports: Import[] = [];

    file.classes.forEach(fileClass => {
        fileClass.fields.forEach( field => {
            const importType = originImports.find(_import => _import.clauses.includes(field.type));
            if (!!importType) {
                const dirNameOfFile = path.dirname(file.filename);
                const modulePath = importType.absPathNode.join('/');
                const pathtoModuleFromSourceFilePath = path.relative(dirNameOfFile, modulePath)
                    .split("\\")
                    .join('/');
                const alreadyExistInFileImports = typeImports.find(typeImport => typeImport.name === field.type);
                if (!alreadyExistInFileImports) {
                    typeImports.push({
                        name: field.type,
                        path: pathtoModuleFromSourceFilePath,
                    });
                }
            }
        });
    });

    return typeImports;
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
            mkdirp.sync(getDirName(metadata[i].filename));
            fs.writeFileSync(metadata[i].filename, c, "utf-8");
            res.push(c);
        }
    }
    return res;
}

function getAllfiles(path: string, resultPathes: string[], checkingFolders: string[]) {
    fs.readdirSync(path).forEach(f => {
        let pth =  path + `/${f}`;
        checkingFolders.forEach(_folder => {
            if (fs.statSync(pth).isDirectory()) {
                if ( (_folder.length >= pth.length && _folder.includes(pth)) || (pth.length >= _folder.length && pth.includes(_folder)) ) {
                    getAllfiles(pth , resultPathes, checkingFolders);
                }
            } else {
                let tsRegExp = /.+\.ts$/;
                let matches = tsRegExp.exec(pth);
                if ( matches && matches.length > 0 && resultPathes.indexOf(matches[0]) === -1) {
                    resultPathes.push( matches[0]);
                }
            }
        });
    });
  }
