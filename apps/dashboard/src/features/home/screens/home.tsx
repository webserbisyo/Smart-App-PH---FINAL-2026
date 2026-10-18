import { words } from '@smartapp/core';
import { PageHeader } from '@smartapp/ui/compositions/page-header';

export function HomeScreen() {
  return (
    <>
      <PageHeader title={words.screens.home.title} description={words.screens.home.description} />
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        <p className="text-sm">{words.screens.home.description}</p>
      </div>
    </>
  );
}
