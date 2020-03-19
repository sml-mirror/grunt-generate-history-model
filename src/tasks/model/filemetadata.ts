import {ClassMetadata} from "./classmetadata";
import { Import } from "./import";

export class FileMetadata {
    public filename: string;
    public imports: Import[];
    public classes: ClassMetadata[];
}