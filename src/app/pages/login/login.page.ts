import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ButtonComponent } from '../../ui/atoms/button.component';
import { LogoComponent } from '../../ui/atoms/logo.component';

/** Página de inicio de sesión del panel. */
@Component({
  selector: 'cs-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, LogoComponent],
  template: `
    <div class="cs-auth auth">
      <section class="cs-auth-side side">
        <cs-logo variant="white" [height]="86"></cs-logo>
        <h2>Reserva de Canchas</h2>
        <p>Gestiona canchas, auditorios y recursos deportivos de la Caja en un solo lugar.</p>
        <span class="cs-eyebrow">Comfasucre · de todos</span>
      </section>

      <section class="cs-auth-form form">
        <div class="form-inner">
          <cs-logo variant="color" [height]="72"></cs-logo>
          <h1>Iniciar sesión</h1>
          <p class="text-muted">Ingresa con tu usuario administrador.</p>

          <div *ngIf="error()" class="cs-alert cs-alert-danger">{{ error() }}</div>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <label class="cs-label" for="username">Usuario o correo</label>
            <input id="username" class="cs-input" formControlName="username" autocomplete="username"
                   placeholder="admin" />

            <label class="cs-label mt-2" for="password">Contraseña</label>
            <input id="password" type="password" class="cs-input" formControlName="password"
                   autocomplete="current-password" placeholder="••••••••" />

            <cs-button class="mt-3" type="submit" [block]="true" [loading]="loading()"
                       [disabled]="form.invalid">
              Entrar
            </cs-button>
          </form>
          <div class="cs-brand-bar cs-brand-bar--thin mt-3"></div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .auth { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; }
    .side {
      background: var(--cs-gradient-diagonal, linear-gradient(135deg, #19559b, #1fb5e5 55%, #94bd1f));
      color: #fff; display: flex; flex-direction: column; justify-content: center;
      gap: 1rem; padding: 3rem;
    }
    .side h2 { color: #fff; font-size: 2rem; margin: 0; }
    .side p { max-width: 420px; opacity: .92; }
    .side .cs-eyebrow { color: rgba(255,255,255,.75); margin-top: 1rem; }
    .form { display: grid; place-items: center; padding: 2rem; }
    .form-inner { width: 100%; max-width: 380px; }
    .form-inner h1 { margin: 1.25rem 0 .25rem; }
    form { display: flex; flex-direction: column; }
    @media (max-width: 820px) {
      .auth { grid-template-columns: 1fr; }
      .side { display: none; }
    }
  `],
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo iniciar sesión');
      },
    });
  }
}
