import {GenerateHistory, IgnoredInHistory, HistoryIndex} from "../../../../src/index";
import {Column} from "typeorm";

@GenerateHistory()
export class Hero {
    @IgnoredInHistory()
    @Column()
    public id?: number;
    @Column()
    public name: string;
    public data: string;
    @HistoryIndex()
    @Column()
    public detailId?: number;
    @Column({"type": "integer", "array": true})
    public simpleArray: number[];
}