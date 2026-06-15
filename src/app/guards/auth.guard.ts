import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn) { router.navigate(['/login']); return false; }
  if (auth.mustChangePassword) { router.navigate(['/change-password']); return false; }
  return true;
};

export const roleGuard = (...roles: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (roles.includes(auth.role)) return true;
  router.navigate(['/']);
  return false;
};
