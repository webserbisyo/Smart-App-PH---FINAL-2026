import { Global, Inject, Module, type BeforeApplicationShutdown } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JobsService } from './jobs.service.js';

// ScheduleModule.forRoot() is imported here and nowhere else; each area adds its own @Cron methods.
@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule implements BeforeApplicationShutdown {
  constructor(@Inject(JobsService) private readonly jobs: JobsService) {}

  beforeApplicationShutdown(): void {
    this.jobs.stop();
  }
}
