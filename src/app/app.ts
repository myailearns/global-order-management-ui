import { Component } from '@angular/core';
import { GomShellComponent } from './shared/components/layout/gom-shell.component';

@Component({
  selector: 'app-root',
  imports: [GomShellComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
