---
title: Module API
description: Build Slick modules that register services, middleware, console commands, and lifecycle hooks.
sidebar:
  order: 1
---

The `slick/module-api` package provides the interfaces and base classes for building Slick modules. Every feature in the framework — routing, ORM, JSON API, AMQP — is implemented as a module. This package is what you use to build your own.

## Installation

```bash
composer require slick/module-api
```

## What a module is

A module is a PHP class that the framework discovers automatically at bootstrap. It can:

- Register services in the DI container
- Load settings from configuration files
- Register PSR-15 middlewares in the HTTP stack
- Register Symfony Console commands
- Run logic when enabled or disabled

The entry point is `SlickModuleInterface`. In practice, you always extend `AbstractModule`, which implements all three module interfaces and provides no-op defaults for every method.

## Creating a module

```php
<?php

declare(strict_types=1);

namespace My\Acme;

use Slick\ModuleApi\Infrastructure\AbstractModule;

final class AcmeModule extends AbstractModule
{
    public function description(): ?string
    {
        return 'Provides awesome ACME features.';
    }
}
```

`AbstractModule` already implements `WebModuleInterface` and `ConsoleModuleInterface` — you do not need additional `implements` declarations. Override only the methods you need.

### Module name derivation

The module name is derived automatically from the class name by `AbstractModule::name()`:

| Class name | Module name |
|------------|-------------|
| `AcmeModule` | `acme` |
| `OtherAcmeModule` | `other_acme` |
| `JsonApiModule` | `json_api` |

Override `name()` to return a different value.

## Settings

`settings()` receives a `Dotenv` instance and returns a merged configuration array. The pattern is: define defaults, merge with a project-level file.

```php
<?php

declare(strict_types=1);

namespace My\Acme;

use Dotenv\Dotenv;
use Slick\ModuleApi\Infrastructure\AbstractModule;

use function Slick\ModuleApi\importSettingsFile;

final class AcmeModule extends AbstractModule
{
    public function settings(Dotenv $dotenv): array
    {
        $defaults = [
            'acme' => [
                'enabled_feature' => true,
                'api_key'         => 'test',
            ],
        ];

        return importSettingsFile(
            APP_ROOT . '/config/modules/acme.php',
            $defaults
        );
    }
}
```

`importSettingsFile(string $file, array $defaults): array` reads the file if it exists and deep-merges it over the defaults. If the file does not exist, it returns the defaults unchanged.

Settings from `config/settings.php` override any module-level key.

### Utility functions

The package provides four global functions in the `Slick\ModuleApi` namespace:

```php
use function Slick\ModuleApi\importSettingsFile;
use function Slick\ModuleApi\mergeArrays;
use function Slick\ModuleApi\constantExists;
use function Slick\ModuleApi\constantValue;
```

| Function | Signature | Description |
|----------|-----------|-------------|
| `importSettingsFile` | `(string $file, array $default = []): array` | Load and merge a settings file over defaults |
| `mergeArrays` | `(array $default, array $custom): array` | Deep-merge two arrays |
| `constantExists` | `(string $name): bool` | Check if a PHP constant is defined |
| `constantValue` | `(string $name, mixed $default = null): mixed` | Read a constant safely, returning a default if undefined |

Use `constantExists()` and `constantValue()` instead of raw `defined()` / `constant()` calls — they handle undefined constants without warnings.

## Services

`services()` returns an array of DI container definitions. Keys are interface names, values are definitions.

```php
use Slick\Di\Definition\ObjectDefinition;

public function services(): array
{
    return [
        AcmeInterface::class => ObjectDefinition::class,
    ];
}
```

## Middleware registration

Implement `middlewareHandlers()` to add PSR-15 middlewares to the HTTP stack.

```php
use Slick\ModuleApi\Infrastructure\FrontController\MiddlewareHandler;
use Slick\ModuleApi\Infrastructure\FrontController\MiddlewarePosition;
use Slick\ModuleApi\Infrastructure\FrontController\Position;

public function middlewareHandlers(): array
{
    return [
        new MiddlewareHandler(
            name:       'acme',
            position:   new MiddlewarePosition(Position::Before, 'dispatcher'),
            middleware: AcmeMiddleware::class,
        ),
    ];
}
```

### MiddlewareHandler

```php
new MiddlewareHandler(
    string $name,
    MiddlewarePosition $position,
    string|MiddlewareInterface|\Closure $middleware
);
```

The `$middleware` argument accepts a FQCN string (resolved via DI), a `MiddlewareInterface` instance, or a `\Closure`.

### MiddlewarePosition

```php
new MiddlewarePosition(Position $position, ?string $reference = null);
```

| Position | Reference required | Description |
|----------|--------------------|-------------|
| `Position::Top` | No | First in the stack |
| `Position::Bottom` | No | Last in the stack |
| `Position::Before` | Yes — middleware name | Insert before the named middleware |
| `Position::After` | Yes — middleware name | Insert after the named middleware |

:::caution
`Position::Before` and `Position::After` require a `$reference` argument. Omitting it throws `InvalidMiddlewarePosition`.
:::

`MiddlewarePosition` exposes two accessors:

```php
$position->position(): Position   // the enum case
$position->reference(): ?string   // the reference name, or null
```

### Implementing a custom handler

If you need programmatic control over middleware registration, implement `MiddlewareHandlerInterface` directly:

```php
use Slick\ModuleApi\Infrastructure\FrontController\MiddlewareHandlerInterface;

interface MiddlewareHandlerInterface
{
    public function name(): string;
    public function middlewarePosition(): MiddlewarePosition;
    public function handler(): string|callable|MiddlewareInterface;
}
```

### Inspecting the middleware stack

```bash
bin/console stack
```

## Console commands

Implement `configureConsole()` to register Symfony Console commands.

```php
use Symfony\Component\Console\Application;
use Psr\Container\ContainerInterface;

public function configureConsole(Application $cli, ContainerInterface $container): void
{
    $cli->add($container->get(MyCommand::class));
}
```

The `$container` argument gives you access to all registered DI services.

## Lifecycle hooks

`onEnable()` and `onDisable()` are called when a module is enabled or disabled via `bin/console`.

```php
public function onEnable(array $context = []): void
{
    $container = $context['container']; // ContainerInterface
    // run setup tasks
}

public function onDisable(array $context = []): void
{
    $container = $context['container'];
    $purge     = $context['purge'] ?? false; // true when --purge flag passed
    // run teardown tasks
}
```

The `purge` key is only present in `onDisable()` and is `true` when the operator ran `bin/console disable --purge <module>`.

## SlickModuleInterface reference

All module interfaces extend `SlickModuleInterface`:

```php
interface SlickModuleInterface
{
    public function name(): string;
    public function description(): ?string;
    public function services(): array;
    public function settings(Dotenv $dotenv): array;
    public function onEnable(array $context = []): void;
    public function onDisable(array $context = []): void;
}
```

`AbstractModule` provides a no-op default for every method. Override only what your module needs.

## Exception reference

| Exception | When thrown |
|-----------|-------------|
| `InvalidMiddlewarePosition` | `MiddlewarePosition` constructed with `Before`/`After` but no `$reference` |

All exceptions implement `ModuleApiException extends \Throwable` — catch it to handle any library exception generically.
