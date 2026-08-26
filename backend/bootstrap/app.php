<?php

use App\Http\Middleware\EnsureMfaEnrolled;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\SecurityHeaders;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->throttleApi();

        // This is an API-only app (no named 'login' route exists — it's an
        // SPA route, not a Laravel one). Left at Laravel's default, the auth
        // middleware tries to redirect any *non*-JSON-expecting unauthenticated
        // request (a plain browser navigation — exactly what a PDF download
        // link is, unlike the SPA's own XHR calls) to route('login'), which
        // throws RouteNotFoundException instead of the intended 401. Forcing
        // a null redirect here means an expired/invalid session on a PDF
        // link now correctly reaches the AuthenticationException render
        // handler below (clean JSON 401) instead of crashing with a 500.
        $middleware->redirectGuestsTo(null);

        $middleware->append(SecurityHeaders::class);

        // Unset by default — a Laravel app with no reverse proxy in front of it
        // (e.g. this app's own `php artisan serve` in local dev) must NOT trust
        // X-Forwarded-* headers, since anyone could spoof them to fake their IP
        // or scheme. Set to the proxy's IP(s) (comma-separated) or '*' once a
        // real reverse proxy sits in front — see deployment.md § 4 — otherwise
        // isSecure()/ip() detection (and this middleware's own HSTS header)
        // silently misbehave behind one.
        if ($trustedProxies = env('TRUSTED_PROXIES')) {
            $middleware->trustProxies(at: $trustedProxies === '*' ? '*' : explode(',', $trustedProxies));
        }

        // A suspended/inactive user's existing session previously kept
        // working indefinitely — LoginRequest only ever checked UserStatus
        // once, at the moment of login. This re-checks on every
        // authenticated request and kills the session the moment status
        // stops being Active. No-ops for guests.
        $middleware->appendToGroup('api', EnsureUserIsActive::class);

        // Phase 15 — mandatory MFA. Reads $request->user(), so it needs
        // auth:sanctum (route-group middleware) to have already resolved a
        // user; no-ops for guest routes (login, the MFA challenge endpoint
        // itself) since $request->user() is null there.
        $middleware->appendToGroup('api', EnsureMfaEnrolled::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error($e->getMessage(), 422, $e->errors());
            }
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error('Unauthenticated.', 401);
            }
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error($e->getMessage() ?: 'This action is unauthorized.', 403);
            }
        });

        $exceptions->render(function (ModelNotFoundException $e, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error('Resource not found.', 404);
            }
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error('Resource not found.', 404);
            }
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error($e->getMessage() ?: 'An error occurred.', $e->getStatusCode());
            }
        });
    })->create();
