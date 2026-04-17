import { Component, OnInit, inject } from '@angular/core';
import { AuthSessionService } from './core/auth/auth-session.service';
import { GomShellComponent } from './shared/components/layout/gom-shell.component';

@Component({
  selector: 'app-root',
  imports: [GomShellComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly authSession = inject(AuthSessionService);

  ngOnInit(): void {
    this.authSession.refreshStoredSession().subscribe();
  }
}
