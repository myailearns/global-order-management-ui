import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'localDateTime',
  standalone: true,
})
export class LocalDateTimePipe implements PipeTransform {
  transform(
    value: string | number | Date | null | undefined,
    locale?: string,
    options?: Intl.DateTimeFormatOptions
  ): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat(
      locale,
      options || {
        dateStyle: 'medium',
        timeStyle: 'short',
      }
    ).format(parsed);
  }
}
