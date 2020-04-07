/*Codegen*/
// tslint:disable
/* eslint-disable */

import {Entity, Column, PrimaryColumn, ColumnOptions, Index, PrimaryGeneratedColumn} from 'typeorm';
import 'reflect-metadata';
import { EnumType } from '../../../src/model/enum/enumType';
import { SecondEnumType } from '../../../src/model/enum/enumType';
import { ThirdEnumType } from '../../../src/model/enum/otherEnumType';

@Entity('h_hero')
export class hHero {
    @PrimaryGeneratedColumn()
    public __id?: number;

    @Column()
    public __operation: string;

    @Column('timestamp with time zone')
    @Index('ind_hHero_changed_date')
    public __changedate: Date;
    @Column('integer' )
    public id: number;
    @Column('text')
    public name: string;
    @Column('text')
    @Index('index_data_test')
    public data: string;
    @Column('integer' )
    @Index('ind_hHero_detailId')
    public detailId: number;
    @Column('int', { 'array': true , 'nullable': true })
    public simpleArray: number[];
    @Column('text', { 'array': true , 'nullable': true })
    public simpleStringArray: string[];
    @Column('smallint')
    public enuma: EnumType;
    @Column('smallint')
    public enuma1: SecondEnumType;
    @Column('smallint',{ 'array': true , 'nullable': true })
    public enuma2: ThirdEnumType[];
    @Column()
    public enuma3: EnumType;
}
