import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { I18nService } from './app/core/i18n/i18n.service';

bootstrapApplication(App, appConfig)
  .then((appRef) => {
    appRef.injector.get(I18nService).init();
  })
  .catch((err) => console.error(err));
