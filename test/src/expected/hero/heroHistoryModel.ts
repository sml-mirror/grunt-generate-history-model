/*Codegen*/
// tslint:disable
/* eslint-disable */

import {Entity, Column, PrimaryColumn, ColumnOptions, Index, PrimaryGeneratedColumn} from 'typeorm';
import 'reflect-metadata';

@Entity('h_hero')
export class hHero {
    @PrimaryGeneratedColumn()
    public __id?: number;

    @Column()
    public __operation: string;

    @Column('timestamp with time zone')
    @Index('ind_hHero_changed_date')
    public __changedate: Date;
    @Column( 'integer' )
    public id: number;
    @Column('text')
    public name: string;
    @Column('text')
    @Index('index_data_test')
    public data: string;
    @Column( 'integer' )
    @Index('ind_hHero_detailId')
    public detailId: number;
    @Column('int', { 'array': true , 'nullable': true })
    public simpleArray: number[];
    @Column('text', { 'array': true , 'nullable': true })
    public simpleStringArray: string[];
}
