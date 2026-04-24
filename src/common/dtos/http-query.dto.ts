import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class HttpQueryDto {
	@IsOptional()
	@IsNumber()
	@Type(() => Number)
	@ApiProperty({
		description: 'Page number for pagination',
		required: false,
		example: 1,
	})
	page?: number = 1;

	@IsOptional()
	@IsNumber()
	@Type(() => Number)
	@ApiProperty({
		description: 'Number of items per page for pagination',
		required: false,
		example: 10,
	})
	limit?: number = 10;

	@IsOptional()
	@IsString()
	@Type(() => String)
	@ApiProperty({
		description: 'Sort order of the results',
		required: false,
		example: '-date_created',
	})
	sort?: string = '-date_created';

	@IsOptional()
	@IsString()
	@Type(() => String)
	@ApiProperty({
		description: 'Search term for filtering results',
		required: false,
		example: 'health',
	})
	q?: string;

	@IsOptional()
	@IsString()
	lang?: string = 'vi-VN';
}
