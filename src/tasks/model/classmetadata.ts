
import {FieldMetadata} from "./fieldmetadata";

export class ClassMetadata {
    public name: string;
    public entityName: string;
    public fields: FieldMetadata[];
    public generateHistory: boolean = false;
}