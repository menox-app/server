import { HttpQueryDto } from "@/common/dtos/http-query.dto";
import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class GetCommentsDto extends HttpQueryDto {
    @ApiProperty({ example: 'b2b5b860-42fc-528e-9d5e-77f7c5d4f9f2', required: false })
    @IsOptional()
    @IsUUID()
    parent_id?: string;   
}