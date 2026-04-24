import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [UploadService],
  controllers: [UploadController]
})
export class UploadModule { }
