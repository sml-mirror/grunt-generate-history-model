import {parseStruct, ImportNode, ArrayType, BasicType} from "ts-file-parser";
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

const configname = "genconfig.json";

export function createHistoryModelsInternal(): string [] {
    let config: Config = JSON.parse(fs.readFileSync(configname, "utf8"));
    const possibleFiles = getAllFiles(config.check.folders);
    const  metadata = createMetadatas(possibleFiles);
    const resultTemplate = createFiles(metadata);
    return resultTemplate;
 }
export function createOptionsOfGrunt(obj: IGrunt): Options {
    const options = new Options();
    const files = new Array<FileMapping>();
    for (let i = 0; i <  obj.task.current.files.length; i++) {
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
    for (let file of files) {
        fileMet = new FileMetadata();
        fileMet.classes = [];
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
            classMet.entityName = `h${temp.join("")}`;
            classMet.fields = [];
            cls.decorators
                .filter(dec => dec.name === "GenerateHistory")
                .forEach(dec => {
                    let options = dec.arguments[0].valueOf() as GenerateHistoryOptions;
                    const {name} = cls;
                    const {historyPath} = options;
                    const filename = `${historyPath}/${name[0].toLowerCase()}${name.substring(1)}.ts`;
                    fileMet.filename = filename;
                    classMet.generateHistory = true;
                });
            if (!classMet.generateHistory) {
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
            const typeWithoutArray = field.type.replace(/\[\]/g, "");
            const importType = originImports.find(_import => _import.clauses.includes(typeWithoutArray));
            if (!!importType) {
                const dirNameOfFile = path.dirname(file.filename);
                const modulePath = importType.absPathNode.join("/");
                const pathtoModuleFromSourceFilePath = path.relative(dirNameOfFile, modulePath)
                    .split("\\")
                    .join("/");
                const alreadyExistInFileImports = typeImports.find(typeImport => typeImport.name === field.type);
                if (!alreadyExistInFileImports) {
                    typeImports.push({
                        name: typeWithoutArray,
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

const getAllFiles = (folders: string[] = []) => {
    const tsRegExp = /.+\.ts$/;
    const returnFiles: string[] = [];

    folders.forEach(folderPath => {
        const files = fs.readdirSync(folderPath);
        files.forEach(file => {
            const endPath = `${folderPath}/${file}`;
            const matches = tsRegExp.exec(endPath);
            const isAnyMatches = matches && matches.length;
            const isPathIdDirectory = fs.statSync(endPath).isDirectory();
            if (isPathIdDirectory) {
                const subFiles = getAllFiles([endPath]);
                returnFiles.push(...subFiles);
            } else if (isAnyMatches) {
                returnFiles.push(matches[0]);
            }
        });
    });
    return returnFiles;
};