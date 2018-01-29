import {Entity, Column, PrimaryColumn, ColumnOptions, Index, PrimaryGeneratedColumn} from "typeorm";
import "reflect-metadata";
  
@Entity()
export class hHero {
    @PrimaryGeneratedColumn()
    public __id?: number;

    @Column()
    public __operation: string;

    @Column('timestamp with time zone')
    public __changedate: Date;
   @Column( 'integer' )
    public id: number;
   @Column( 'string')
    public name: string;
   @Column( 'integer' )
    @Index()
    public detailId: number;
    @Column('int', { 'array': true })
    public simpleArray: number[];
}
