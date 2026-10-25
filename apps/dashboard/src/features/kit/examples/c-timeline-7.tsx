import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
} from '@smartapp/ui/components/reui/timeline';

import { cn } from 'cn';

const roadmapItems = [
  {
    date: 'Dec 15, 2025',
    content: (
      <>
        <span className="text-muted-foreground">Completed</span> Beta Program
      </>
    ),
    color: 'bg-success',
  },
  {
    date: 'Nov 01, 2025',
    content: (
      <>
        <span className="text-muted-foreground">Completed</span> Usability Testing
      </>
    ),
    color: 'bg-member',
  },
  {
    date: 'Oct 15, 2025',
    content: (
      <>
        <span className="text-muted-foreground">Initiated</span> Design Phase
      </>
    ),
    color: 'bg-highlight',
  },
  {
    date: 'Aug 01, 2024',
    content: (
      <>
        <span className="text-muted-foreground">Completed</span> Requirements Gathering
      </>
    ),
    color: 'bg-info',
  },
  {
    date: 'Jul 15, 2024',
    content: (
      <>
        <span className="text-muted-foreground">Started</span> Project Kickoff
      </>
    ),
    color: 'bg-destructive',
  },
];

export function Pattern() {
  return (
    <div className="w-full max-w-xs">
      <Timeline defaultValue={0} className="gap-2.5">
        {roadmapItems.map((item, index) => (
          <TimelineItem
            key={index}
            step={index + 1}
            className="group-orientation-vertical/timeline:not-last:pb-0"
          >
            <TimelineHeader className="flex items-center gap-2.5">
              <TimelineSeparator className="" />
              <TimelineIndicator className={cn('size-2 border-none', item.color)} />
              <TimelineDate className="mb-0 text-xs font-semibold text-muted-foreground/60 uppercase">
                {item.date}
              </TimelineDate>
            </TimelineHeader>
            <TimelineContent className="text-sm font-medium text-foreground">
              {item.content}
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </div>
  );
}
