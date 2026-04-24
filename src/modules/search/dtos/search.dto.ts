import { HttpQueryDto } from "@/common/dtos/http-query.dto";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";

export enum SearchType {
    USER = 'user',
    POST = 'post',
    ALL = 'all'
}

export class SearchDto extends HttpQueryDto {
    @IsEnum(SearchType)
    @IsOptional()
    @ApiProperty({
        enum: SearchType,
        default: SearchType.ALL,
        required: false,
        description: 'Type of search'
    })
    type: SearchType;
}