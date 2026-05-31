import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Preregistration } from './preregistration.entity';
import { PreregistrationsService } from './preregistrations.service';
import { PreregistrationsController } from './preregistrations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Preregistration])],
  providers: [PreregistrationsService],
  controllers: [PreregistrationsController],
})
export class PreregistrationsModule {}
