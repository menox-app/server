import { Controller, Get, Query, Req } from '@nestjs/common';
import { SearchService } from './search.service';
import { Public } from '@/common/decorators/public.decorator';
import { SearchDto } from './dtos/search.dto';

@Controller('search')
export class SearchController {
    constructor(
        private readonly searchService: SearchService
    ) { }

    @Public()
    @Get()
    async search(@Query() dto: SearchDto, @Req() req) {
        const userId = req.user?.id || null;
        return this.searchService.search(dto, userId);
    }

}
