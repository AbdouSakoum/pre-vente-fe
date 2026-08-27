import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError(err => {
      const skipLogout = req.url.includes('/auth/login') || req.url.includes('/auth/change-password');
      if (err.status === 401 && !skipLogout) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('must_change_password');
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
