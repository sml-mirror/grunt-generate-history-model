import {GenerateHistory, IgnoredInHistory, HistoryIndex} from "../../../../src/index";
import {Column, PrimaryGeneratedColumn} from "typeorm";

@GenerateHistory()
export class Hero {
    @PrimaryGeneratedColumn()
    public id?: number;
    @Column("text")
    public name: string;
    @HistoryIndex("index_data_test")
    @Column("text")
    public data: string;
    @HistoryIndex()
    @Column()
    public detailId?: number;
    @Column({"type": "integer", "array": true, "nullable": true})
    public simpleArray: number[];
    public columnWithoutDatabase: string;
}