# Grunt plugin for code generation view models by models description

[![Build Status](https://travis-ci.org/AbatapCompany/grunt-generate-view-model.svg?branch=master)](https://travis-ci.org/AbatapCompany/grunt-generate-view-model)

This repository provides a grunt plugin for code generation view models by models description.

# Установка

  npm install grunt-generate-history-model
  
# Как начать использовать
* Установить typeorm.

  npm install typeorm
  
* Создайте gencofig.json в корневом катологе.
```json
{
    "check":
        {
            "folders":[
                "./models"
            ]
        }
}
```
Свойство "folders" показывает, для каких папок ,на этом уровне и ниже, нужны,возможно, модели для логирования.
* Установите декораты на нужные модели.
```typescripts
import { InnerClass } from "./innerClass";
import { GenerateHistory, IgnoredInHistory, HistoryIndex } from "grunt-generate-history-model";
import { Column } from "typeorm";

@GenerateHistory({
    "historyPath":"./generated/models"
})
export class Class {

    @Column('text', {'nullable': true })
    public property1: string;
    @Column('integer', {'nullable': true })
    @HistoryIndex()
    public indexProperty: number;
    @Column('text', {'nullable': true })
    @IgnoredInHistory()
    public ignoredProperty: any;
}
```
* В package.json добавьте инициализирующую команду в свойство "script":
```json
  "scripts": {
    "generation": "generateHistory"
  }
  ```
  где "generateHistory" - строка для запуска плагина.
  
* npm run generation

* после завершения работы плагина по пути,указанному в декораторе GenerateHistory,появятся файлы с расширением ".ts" :

history model
```typescript
import {Entity, Column, PrimaryColumn, ColumnOptions, Index, PrimaryGeneratedColumn} from 'typeorm';
import 'reflect-metadata';

@Entity('h_class')
export class hClass {
    @PrimaryGeneratedColumn()
    public __id?: number;

    @Column()
    public __operation: string;

    @Column('timestamp with time zone')
    @Index('ind_hClass_changed_date')
    public __changedate: Date;
   @Column('text', {'nullable': true})
    public property1: string;
   @Column('integer', {'nullable': true})
    @Index('ind_hClass_indexProperty')
    public indexProperty: number;
}
```
# Декораторы

В этом плагине используются 3 декоратора: 1 для классов и 2 для свойств.

## Декораторы для классов
### GenerateHistory
Основной декоратор для создания моделей логирования
```shell
+-------------+--------------+-------------------------------------------------------+
|                        @GenerateHistory                                            |
+------------------------------------------------------------------------------------+
|   property  |  Mandatory   |                      definition                       |
+-------------+--------------+-------------------------------------------------------+
| options     | true         | options, which used to creare history                 |- complex object
+-------------+--------------+-------------------------------------------------------+

+-------------+--------------+-------------------------------------------------------+
|                        options                                                     |
+------------------------------------------------------------------------------------+
|   property  |  Mandatory   |                      definition                       |
+-------------+--------------+-------------------------------------------------------+
| historyPath | true         | path,where history class will create                  |
+-------------+--------------+-------------------------------------------------------+
```
```typescript
@GenerateHistory({'historyPath':'./generated/models'})
```

## Декораторы для свойств
### HistoryIndex
Декоратор,который используется для создания декоратора Index у свойства в модели логирования.
```typescript
@HistoryIndex()
```
### IgnoredInHistory
Декоратор,который используется,что бы свойство не было перенесено в модель логирования.

```typescript
@IgnoreViewModel()
```
## Связь с  декораторами typeORM
### Column 
* Все поля с декораторм Column ,если не отмечены декоратором IgnoredInHistory, создаются и в модели логирования.
* Если декоратор Column имеет свойство nullable,то это свойство переносится и в модель логирования.
### Join Column
* Если поле имеет составной тип и декоратор JoinColumn то создается поле с типом number и именем,которое описано в декораторе
