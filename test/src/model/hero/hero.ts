import {GenerateHistory, IgnoredInHistory, HistoryIndex} from "../../../../src/index";
import {Column} from "typeorm";

@GenerateHistory()
export class Hero {
    @IgnoredInHistory()
    @Column()
    public id?: number;
    @Column()
    public name: string;
    @Column()
    public data: string;
    @HistoryIndex()
    @Column()
    public detailId?: number;
    @Column("int", { "isArray": true })
    public simpleArray: number[];
}