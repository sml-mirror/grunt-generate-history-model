
export class FieldMetadata {
    public name: string;
    public type: string;
    public generateIndex: boolean = false;
    public ignoredInHistory: boolean = false;
    public isArray: boolean = false;
    public nullable: boolean = false;
}