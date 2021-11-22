import {parseStruct, ImportNode, ArrayType, BasicType, ClassModel, FieldModel} from "ts-file-parser";
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
import { SearchingDecorators } from "./enum/typeormDecorators";
import { configFileName, otherDBTimeType, postgresTimeType } from "./constants";

const mkdirp = require("mkdirp");
const getDirName = path.dirname;

export function createHistoryModelsInternal(): string [] {
    let config = <Config>JSON.parse(fs.readFileSync(configFileName, "utf8"));
    const possibleFiles = getAllfiles(".", [], config.check.folders);
    const  metadata = createMetadatas(possibleFiles);
    const resultTemplate = createFiles(metadata, config.database);
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

const createEntityNameForHistory = (classname: string) => {
    return classname.split("").map(symb => {
        if (symb.toUpperCase() === symb) {
            symb = `_${symb.toLowerCase()}`;
        }
        return symb;
    });
};

const createFieldMetadataForClass = (fld: FieldModel, classname: string) => {
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
    let isDbColumn = false;
    let isIgnoredInHistory = false;
    fld.decorators.forEach(dec => {
        switch (dec.name) {
            case SearchingDecorators.IgnoredInHistory: {
                isIgnoredInHistory = true;
                break;
            }
            case SearchingDecorators.Column:
            case SearchingDecorators.PrimaryGeneratedColumn:
            case SearchingDecorators.PrimaryColumn: {
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
                break;
            }
            case SearchingDecorators.HistoryIndex: {
                fldMetadata.generateIndex = true;
                if (dec.arguments[0]) {
                    fldMetadata.indexName = dec.arguments[0].toString();
                }
                break;
            }

            case SearchingDecorators.JoinColumn: {
                if (isIgnoredInHistory) {
                    break;
                }
                isDbColumn = true;
                fldMetadata.name = `${fldMetadata.name}id`;
                fldMetadata.type = "number";
                fldMetadata.nullable = true;
                dec.arguments.forEach(arg => {
                    if (arg["name"]) {
                        fldMetadata.name = arg["name"];
                    }
                });
                break;
            }

            default:
                break;
        }
    });
    if (fldMetadata.generateIndex && !fldMetadata.indexName) {
        fldMetadata.indexName = `ind_h${classname}_${fldMetadata.name}`;
    }
    if (!isDbColumn || isIgnoredInHistory) {
        fldMetadata.ignoredInHistory = true;
    }

    return fldMetadata;
};

const createFileMetadata = (file: string) => {
        const fileMet = new FileMetadata();
        fileMet.classes = [];
        let stringFile = fs.readFileSync(file, "utf-8");
        let jsonStructure = parseStruct(stringFile, {}, file);
        jsonStructure.classes.forEach(cls => {
            let classMet = new ClassMetadata();
            classMet.name = cls.name;
            let temp = createEntityNameForHistory(cls.name);
            classMet.entityName = `h${temp.join("")}`;
            classMet.fields = [];
            const generateHistoyDecorator = cls.decorators.find(dec => dec.name === SearchingDecorators.GenerateHistory);
            if (!generateHistoyDecorator) {
                return;
            }
            let  options = <GenerateHistoryOptions>generateHistoyDecorator.arguments[0].valueOf();
            const classNameToSet = cls.name[0].toLowerCase() + cls.name.substring(1);
            fileMet.filename = `${options.historyPath}/${classNameToSet}.ts`;
            classMet.generateHistory = true;
            cls.fields.forEach(fld => {
                const fldMetadata = createFieldMetadataForClass(fld, classMet.name);
                classMet.fields.push(fldMetadata);
            });

            if (fileMet.classes === null) {
                fileMet.classes = [];
            }
            fileMet.classes.push(classMet);
        });
        fileMet.imports = addTypeImports(fileMet, jsonStructure._imports);
        return fileMet;
};

function createMetadatas(files: string[]) {
    let generationFiles: FileMetadata[] = [];
    for (let file of files) {
        const fileMet = createFileMetadata(file);
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
            if (!importType) {
                return;
            }
            const dirNameOfFile = path.dirname(file.filename);
            const modulePath = importType.absPathNode.join("/");
            const pathtoModuleFromSourceFilePath = path.relative(dirNameOfFile, modulePath)
                .split("\\")
                .join("/");
            const alreadyExistInFileImports = typeImports.find(typeImport => typeImport.name === field.type);
            if (alreadyExistInFileImports) {
                return;
            }
            typeImports.push({
                name: typeWithoutArray,
                path: pathtoModuleFromSourceFilePath,
            });
        });
    });

    return typeImports;
}

function  createFiles(metadata: FileMetadata[], database: string = "postgres"): string[] {
    let viewsFolder = path.resolve(__dirname, "view/");
    configure(viewsFolder, {autoescape: true, trimBlocks : true});
    let res: string [] = [];
    for ( var i = 0; i < metadata.length; i++ ) {
        var mdata = metadata[i];
        mdata.classes = mdata.classes.filter((item) => item.generateHistory);
        const timeType = database === "postgres"
            ? postgresTimeType
            : otherDBTimeType;
        var c = render("historyTemplateCommon.njk", {metafile: mdata, timeType});
        if (c && c.trim()) {
            mkdirp.sync(getDirName(metadata[i].filename));
            fs.writeFileSync(metadata[i].filename, c, "utf-8");
            res.push(c);
        }
    }
    return res;
}

function getAllfiles(path: string, resultPathes: string[], checkingFolders: string[]) {
    const tmpResult = [...resultPathes];
    fs.readdirSync(path).forEach(f => {
        let pth =  path + `/${f}`;
        checkingFolders.forEach(_folder => {
            if (fs.statSync(pth).isDirectory()) {
                if ( (_folder.length >= pth.length && _folder.includes(pth)) || (pth.length >= _folder.length && pth.includes(_folder)) ) {
                    tmpResult.push(...getAllfiles(pth , resultPathes, checkingFolders));
                }
            } else {
                let tsRegExp = /.+\.ts$/;
                let matches = tsRegExp.exec(pth);
                if ( matches && matches.length > 0 && resultPathes.indexOf(matches[0]) === -1) {
                    tmpResult.push( matches[0]);
                }
            }
        });
    });

    return tmpResult;
  }
