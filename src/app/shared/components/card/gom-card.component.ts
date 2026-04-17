import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'gom-lib-card, [gomLibCard]',
  standalone: true,
  templateUrl: './gom-card.component.html',
  styleUrls: ['./gom-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gom-card',
    '[class.gom-card--content-gutter]': 'contentGutter()',
    '[class.gom-card--content-gap]': 'contentGap()',
  },
})
export class GomCardComponent {
  contentGutter = input(true, { transform: booleanAttribute });
  contentGap = input(true, { transform: booleanAttribute });
}
