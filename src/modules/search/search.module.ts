import { Module } from '@nestjs/common';
import { FollowsModule } from '../follows/follows.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
    imports: [
        FollowsModule
    ],
    providers: [SearchService],
    controllers: [SearchController]
})
export class SearchModule { }
