import * as path from "path";
import { Module } from "@nestjs/common";
import { EnumType } from "./enum/enumType";

@Module({
  imports: [
    EnumType,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
