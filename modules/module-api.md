---
layout: page
hide_hero: true
menubar_toc: true
toc_title: Module API
title: Module API
category: modules
---

# Module API
`Slick` is a modular framework where nearly all features are implemented as modules. Some modules are enabled by default and cannot be disabled, while others may need to be enabled to set up their dependencies in the dependency container, console commands, HTTP middlewares, and default settings.

This module provides the API needed to create a Slick module.

## Slick Module interface

This is the base interface and the minimum implementation required for a module. You need to specify what needs to be done when enabling and disabling the module, including any services and default settings. Additionally, it is necessary to provide a module name and description to be displayed when the user lists [available modules](/documentation/modules.html#available-modules).

The system will search for PHP classes suffixed with `Module` to link with during the request bootstrap process. For example, let's create a simple module called `acme` that will perform some tasks:

```php
namespace My\Acme;

use Slick\ModuleApi\Infrastructure\AbstractModule;
use Slick\ModuleApi\Infrastructure\SlickModuleInterface;

final readonly class AcmeModule extends AbstractModule implements SlickModuleInterface
{

    public function description(): string
    {
        return "Provides awesome ACME features.";
    }
}

```
That's the mininal needed to define a slick module.

{% include note.html type="info" content="
The module name is determined by the class name when you extend the `AbstractModule` class. It separates the CamelCase class name by the uppercase letters, converts them to lowercase, and joins them with an underscore (`_`).

| Class name      | Module name |
|-----------------|-------------|
| AcmeModule      | acme        |
| OtherAcmeModule | other_acme  |

" %}

### Module settings
The `SlickModuleInterface::settings()` method is called during the request bootstrap when the application is configuring global settings. You can use this method to provide default configuration settings for your module. The helper functions `importSettingsFile()` and `mergeArrays()` can be used to merge default settings with settings from a specific file.

Let's assume you want the user to have a dedicated settings file for your module. By convention, these files should be placed in the `config/modules` directory of your application.

```php
namespace My\Acme;

use Slick\ModuleApi\Infrastructure\AbstractModule;
use Slick\ModuleApi\Infrastructure\SlickModuleInterface;

final readonly class AcmeModule extends AbstractModule implements SlickModuleInterface
{
    use function Slick\ModuleApi\importSettingsFile;

    // ...

    /**
     * @return array<string, mixed> 
     */
    public function settings(): array
    {
        $file = APP_ROOT . '/config/modules/acme.php';
        $default = [
            "enabled_feature" => true,
            "logging" => false,
            "key" => "test"
        ];
        return importSettingsFile($file, $default);
    }
}

```
This strategy allows you to define default configuration settings for your module, which can also be overridden by the applications using it.

{% include note.html type="info" content="
When using the [default template of Slick](/getting_started.html), a constant named `APP_ROOT` is created and made available to the entire application. If you need to use it in different environments or test cases, you SHOULD verify if it is defined. If it’s not, you should define it in any bootstrap form of your environment.
" %}

{% include note.html type="info" content="
It is possible to define a `config/settings.php` file in a Slick application for application-wide settings. If any keys from the `config/modules/*.php` files are also present in `config/settings.php`, the values in `config/settings.php` will take precedence, as it has higher priority than the module-specific configuration files.
" %}

### Module services

Services are typically interface implementations that can be used as dependencies in a given controller or command. Modules can define these services so that the dependency injection container can create and inject them when needed.

You can also have a default list of services and use the helper functions `importSettingsFile()` and `mergeArrays()` to retrieve and merge service definitions:

```php
namespace My\Acme;

use Slick\ModuleApi\Infrastructure\AbstractModule;
use Slick\ModuleApi\Infrastructure\SlickModuleInterface;

final readonly class AcmeModule extends AbstractModule implements SlickModuleInterface
{
    use function Slick\ModuleApi\importSettingsFile;

    // ...

    /**
     * @return array<string, mixed> 
     */
    public function services(): array
    {
        $file = APP_ROOT . '/config/modules/acme.php';
        $default = [
            AcmeInterface::class => ObjectDefinition
        ];
        return importSettingsFile($file, $default);
    }
}
```

{% include note.html type="info" content="
Services should be defined according to the dependency injection container definitions. If you are unsure how to define these services, please refer to the [dependency injection container definitions documentation](/documentation/dependency-injection.html#definitions).
" %}

## Web application module
Web applications are managed using a PSR-15 HTTP middleware stack request handler. Therefore, the main goal is to add middlewares that can handle requests and provide the features your module offers.

Similarly, you can define an associative array of middlewares to be added during the request bootstrap process. The key difference is that you need to specify the position where you want each middleware to be.

Let's imagine our Acme module will add a middleware that adds a special `X-Test: acme` header to the dispatched response. First, create the middleware.

```php
namespace My\Acme\Infrastructure\Http;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

class AcmeMiddleware implements MiddlewareInterface
{
    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        $response = $handler->handle($request);
        return $response->withHeader("X-Test", "acme");
    }
}
```
{% include note.html type="info" content="
The dependency injection container will be used to create and/or retrieve the middleware instance. If your middleware requires any dependencies, simply add them to [the services array of your module](#module-services) class so they will be available when the middleware needs to be created.
" %}

Now we need to configure the middleware in the HTTP handler stack so that all requests pass through our middleware:

```php
namespace My\Acme;

use My\Acme\Infrastructure\Http\AcmeMiddleware;
use Slick\ModuleApi\Infrastructure\AbstractModule;
use Slick\ModuleApi\Infrastructure\FrontController\MiddlewareHandler;
use Slick\ModuleApi\Infrastructure\FrontController\MiddlewareHandlerInterface;
use Slick\ModuleApi\Infrastructure\FrontController\MiddlewarePosition;
use Slick\ModuleApi\Infrastructure\FrontController\Position;
use Slick\ModuleApi\Infrastructure\FrontController\WebModuleInterface;


final readonly class AcmeModule extends AbstractModule implements WebModuleInterface;
{    
    ...

    /**
     * @return array<MiddlewareHandlerInterface>
     */
    public function middlewareHandlers(): array
    {
        return [
            new MiddlewareHandler(
                'acme',
                new MiddlewarePosition(Position::Top),
                AcmeMiddleware::class
            )
        ];
    }
}
```

The above code creates a `MiddlewareHandler` that will hold the necessary configuration for placing an instance of our middleware in the HTTP handler stack. We need to provide a name, a position, and the middleware class name.

### Middleware position
The following table describes the possible position values you have to to define where the middleware will be placed during the application bootstrap process:

| Position         | Description                                       | Needs reference? |
|------------------|---------------------------------------------------|:----------------:|
| Position::Top    | Place middleware in the beginning of the stack    | No               |
| Position::Bottom | Place middleware in the end of the stack          | No               |
| Position::Before | Place middleware before the one given in refernce | Yes              |
| Position::After  | Place middleware after the one given in refernce  | Yes              |

A `reference` should be provided when using the `Position::Before` and `Position::After` arguments to determine the exact position for placing the middleware. If the reference is not found in the stack, the middleware will be placed at the top or bottom, respectively.

```php
    ...

    public function middlewareHandlers(): array
    {
        // With a reference middleware name
        $position = new MiddlewarePosition(Position::Before, 'dispatcher');

        return [
            new MiddlewareHandler(
                'acme',
                $position,
                AcmeMiddleware::class
            )
        ];
    }
```
Use the following console command to view the current HTTP handler stack configuration:

```shell
bin/console stack
```

{% include console-output.html content='
![Console output of HTTP handler stack.](/assets/img/console-outputs/console-stack-output.png "HTTP handler stack list")
' %}

### Middleware instance

When retrieving the middleware instance during the application bootstrap process, it is verified if the provided instance is a `string` (which will be used as a key to retrieve the middleware from the dependency injection container), a `callable` (which will be executed), or an object that should be an instance of the `MiddlewareInterface`.


## Console application module

Slick uses the [Symfony Console component](https://symfony.com/doc/current/components/console.html) to create a command-line interface for its applications. Your module can add commands to be available when the `bin/console` application runs:

```php
namespace My\Acme;

use My\Acme\UserInterface\Console\AcmeCommand;
use Slick\Di\ContainerInterface;
use Slick\ModuleApi\Infrastructure\AbstractModule;
use Slick\ModuleApi\Infrastructure\Console\ConsoleModuleInterface;

final readonly class AcmeModule extends AbstractModule implements ConsoleModuleInterface
{
    ...

    public function configureConsole(Application $cli, ContainerInterface $container): void
    {
        $cli->addCommand($container->get(AcmeCommand::class));
    }
}
```

{% include note.html type="info" content="
A `Symfony Console` application is already set up for you when using the [default Slick template](/getting_started.html). To create your commands and add them to the console, please refer to the [Symfony Console component documentation](https://symfony.com/doc/current/components/console.html#creating-a-console-application).
" %}


## `OnEnable` and `OnDisable` events
In some cases, you may need to perform operations such as copying a file or creating a class or directory, which are only done once you enable a given module. In other cases, you may need to clean up files that are no longer needed when a module is disabled or perform tasks on both enable and disable actions.

Slick will call `SlickModuleInterface::onEnable()` and `SlickModuleInterface::onDisable()` when these operations are performed, allowing you to properly configure your module.

These methods share a similar signature and are called with an associative array context argument. In the context, you have a `ContainerInterface` instance under the `container` key. In the `SlickModuleInterface::onDisable()` method, the context also includes a `purge` flag under the `purge` key. This flag is set when the user disables the module with the `--purge` option, allowing you to perform a more thorough cleanup of your module setup.