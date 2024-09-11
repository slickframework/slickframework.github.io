---
layout: page
hide_hero: true
menubar_toc: true
toc_title: Dependency injection
title: Dependency injection
---

# Dependency injection

`slick/di` is a lightweight dependency injection container for PHP 8.2+.

It aims to be very efficient, minimizing the guesswork and magic often associated with dependency containers.

It also allows you to nest containers, which can be very useful if you have several reusable packages in your applications. This feature enables you to define containers with default dependencies in those packages, which can later be overridden and used in your application.

## Install
This package is already installed if you use the [default template of Slick](/documentation/getting-started/) and is used for dependency injection across all modules.

If you are not using the Slick template, you need to install it with `composer`:

```shell
composer require slick/di
```

## Introduction
Dependency injection is a widely discussed concept on the web, and you have likely used it without knowing its name. Simply put, the following line of code illustrates what it is:

```php
$volvo = new Car(new Engine());
```
In the example above, `Engine` is a dependency of `Car`, and `Engine` was injected into `Car`. If you are not familiar with dependency injection, please read [Fabien Potencier’s excellent series on the topic](http://fabien.potencier.org/what-is-dependency-injection.html).

Dependency injection and dependency injection containers are two different things. Dependency injection is a design pattern that implements inversion of control for resolving dependencies. In contrast, a dependency injection container is a tool that helps you create, reuse, and inject dependencies.

A dependency container can also be used to store object instances that you create and values that you may need to use repeatedly. Configuration settings are a good example of this.

## Basic usage
To create a dependency container, we need to create at least a `services.php` file with all our dependency definitions:

```php
use Slick\Di\Definition\ObjectDefinition;

/**
 * Dependency injection object definition example
 */
return [
    'config' => [
        'color' => 'blue',
        'gear' => 'manual'
    ],
    'engineService' => ObjectDefinition::create(Engine::class)
        ->with('@config')
        ->call('setMode')->with('simple')
];
```
Now, to build the dependency container, we need to use the `ContainerBuilder` factory class as follows:

```php
use Slick\Di\ContainerBuilder;
use Slick\Di\DefinitionLoader\FileDefinitionLoader;

$definitionsFile = __DIR__ . '/services.php';
$container = (new ContainerBuilder())
    ->load(new FileDefinitionsLoader($definitionsFile))
    ->getContainer();
```

With that, we are ready to create and inject dependencies using our container:

```php
class Car
{
    /**
 * @var EngineInterface
 */
    protected $engine;

    public function __construct(EngineInterface $engine)
    {
        $this->engine = $engine;
    }

}

$myCar = $container->make(Car::class);
```

## Definitions
### What’s a definition?
Definitions are entries in an array that instruct the container on how to create the corresponding object instance or value.

{% include note.html content="
Every container *MUST* have a definition list (associative array) in order to be created, and you *SHOULD* always use the `Slick\Di\ContainerBuilder` to create your container.
" %}

Let's create our `dependencies.php` file that will contain our dependency definitions:

```php
/**
 * Dependency injection definitions file
 */
$services['timezone'] = 'UTC';
$services['config'] = function() {
    return Configuration::get('config');
};

return $services;
```

{% include note.html type="info" content="
Why use PHP arrays for container definitions?

The answer is straightforward. If you use other markup/styles like `.ini` or `.yaml` to define container settings, you would need to parse those configurations before applying them. Using PHP arrays eliminates the need for parsing and allows the code to be executed directly, thereby enhancing performance.
" %}

### Value definition

A scalar or value definition is used as it is. The following example illustrates a value definition:
```php
/**
 * Dependency injection value definition example
 */
$services['timezone'] = 'UTC';

return $services;
```

Value definitions are useful for storing application-wide constants.

### Factory definition

With a factory definition, we can compute and/or control the creation of objects or values:

```php
/**
 * Dependency injection callable definition example
 */
$services['general.config'] = function() {
    return Configuration::get('config');
}

return $services;
```

It is possible to have the container instance available within the closure by defining it as an input argument. See the following example:

```php
/**
 * Dependency injection callable definition example
 */
$services['general.config'] = function(ContainerInterface $container) {
    $foo = $container->get('foo');
    return Configuration::get('config')->get('bar', $foo);
}

return $services;
```

### Alias definition

An alias definition is a shortcut for another defined entry.
The alias points to an entry key and is always prefixed with an `@`.

```php
/**
 * Dependency injection alias definition example
 */
$services['config'] = '@general.config';

return $services;
```

### Object definition

Objects are what make dependency containers very handy and enjoyable to use!
Let's take a look at an object definition inside our dependencies.php file.

```php
namespace Services;

use Services\SearchService;
use Slick\Configuration\Configuration:
use Slick\Di\Definition\ObjectDefinition;

/**
 * Dependency injection object definition example
 */
$services['siteName'] => 'Example site';
$services['config'] => function() {
    return Configuration::get('config');
};

// Object definition
$services['search.service'] = ObjectDefinition::create(SearchService::class)
    ->with('@config')
    ->call('setMode')->with('simple')
    ->call('setSiteName')->with('@siteName')
    ->assign(20)->to('rowsPerPage')
;

return $services;
```


Defining how an object is instantiated is a key feature of a dependency container. For example, `'search.service'` is an object definition for creating a `SearchService`. It uses a fluent API that simplifies describing the necessary steps to create a service or object.

{% include note.html type="info" content="
If you want to reference the container itself you can use the `@container` tag in the object definition file.
" %}

## Loading services
### Loading a file
Loading a definitions file is the simplest way to create a dependency container. You create a `FileDefinitionLoader` instance with the file you want to load and instruct the `ContainerBuilder` to load it. See the following example:

```php
use Slick\Di\ContainerBuilder;
use Slick\Di\DefinitionLoader\FileDefinitionLoader;

$definitionsFile = __DIR__ . '/services.php';
$container = (new ContainerBuilder())
    ->load(new FileDefinitionsLoader($definitionsFile))
    ->getContainer();
```

### Loading files from a directory

Loading services from a directory is similar to loading them from a file. You simply specify the directory you want to load, and all *.php files within that directory will be loaded.

```php
use Slick\Di\ContainerBuilder;
use Slick\Di\DefinitionLoader\DirectoryDefinitionLoader;

$builder = new ContainerBuilder();
$builder->load(new DirectoryDefinitionLoader('./config/services'))

$container = $builder->getContainer();

$foo = $container->get(SomeImplementation::class);

```
{% include note.html type="warning" content="
Please note that files are loaded in the order they appear in the file system. If a key is defined in multiple files, the definition from the last loaded file will take precedence.
" %}


### Autoloding from source directory

You can instruct the ContainerBuilder to scan a specified source directory for interface implementations, eliminating the need to define these services in a services.php file manually. 

```php
use Slick\Di\ContainerBuilder;
use Slick\Di\DefinitionLoader\AutowireDefinitionLoader;

$builder = new ContainerBuilder();
$builder->load(new AutowireDefinitionLoader('./src'))

$container = $builder->getContainer();

$foo = $container->get(SomeImplementation::class);
```

Each class that implements an interface will be automatically registered as a service, with an entry created using the interface's class name and an object definition.

{% include note.html type="warning" content="
If an interface has multiple implementations, the container will encounter an ambiguity and will throw an error. This is because it cannot determine which implementation to inject automatically.
" %}

### Chaining loading
It’s possible to have multiple calls to `ContainerBuilder::load`, allowing you to load multiple definitions from different definition file sources.

 ```php
use Slick\Di\ContainerBuilder;
use Slick\Di\DefinitionLoader\AutowireDefinitionLoader;
use Slick\Di\DefinitionLoader\DirectoryDefinitionLoader;

$builder = new ContainerBuilder();
$builder->load(new AutowireDefinitionLoader('./src/Infrastructure'));
$builder->load(new AutowireDefinitionLoader('./src/UserInterface'));
$builder->load(new DirectoryDefinitionLoader('./config/services'));

$container = $builder->getContainer();

$foo = $container->get(SomeImplementation::class);
```

{% include note.html type="warning" content="
Be aware that the order in which you load the definitions is important. In the case of duplicate keys across different loaded sources, the last loaded source will be used and will override the previous ones.
" %}

## Container "make" factory
The Slick dependency container has a special method called `Container::make()` that acts as a factory for your services. When you call `Container::make()`, you need to pass the service class name you want to create and optional constructor arguments. The container will merge the passed arguments with any missing ones, using its registered dependencies to create the service. It will then add the instance as a service to be reused.

Let's see an example:

```php
/**
 * Defined service
 */
$services[Configuration::class] = function() {
    return Configuration::get('config');
}

$services['env'] = 'dev';
```

```php
// service class
class Service
{
    public function __construct(string $env, Configuration $conf)
    {}
    ...
}
```
You can create an instance of `Service::class` using the container like this:

```php
$service = $container->make(Service::class);
```

In the example above, only the `$env` constructor argument value is passed. When creating the service, the container will use the `Configuration::class` definition set in the services file.

This method is also used as a fallback when `Container::get()` does not find any definition, attempting to create the service even if it is not explicitly defined.

### `#Autowire` setter
The purpose of this attribute is to guide the container in calling methods marked with the `#Autowire` attribute when creating an object from a given class. The container will analyze the types of the method's arguments and attempt to resolve the appropriate dependencies. You can also specify the dependencies to inject, following the order of the arguments in the method's signature. If a dependency is not available and the argument is nullable, a `null` value will be assigned.

```php
use Slick\Di\Definition\Attributes\Autowire;

class Controller
{

    #[Autowire]
    public function withTemplate(TemplateEngine $template): void
    {
        $this->template = $template;
    }
}
```

When `Controller` is created, a call to `Controller::withTemplate()` will be made with the resolved `TemplateEngine` dependency.

