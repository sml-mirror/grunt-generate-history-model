import {GenerateHistory, IgnoredInHistory, HistoryIndex} from "../../../../src/index";
import {Column, PrimaryGeneratedColumn} from "typeorm";

@GenerateHistory()
export class Hero {
    @PrimaryGeneratedColumn()
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