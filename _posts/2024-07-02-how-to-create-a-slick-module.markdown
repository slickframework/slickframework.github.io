---
layout: post
title:  "How to create a Slick module"
date:   2024-07-02 10:30:00 +0000
categories: howtos
author: Filipe Silva
hero_image: /assets/img/browser-bar.png
hero_darken: true
menubar_toc: true
image: /assets/img/browser-bar.png
---

A module is typically a package or library that provides specific functionality. You can develop a module if you want to add some kind of functionality to your application and you planned to reuse this module in other aplications.

In this _how to_ guide, we will create a module that introduces an HTTP middleware to append the necessary CORS headers to all incoming requests.

## A word about CORS
Cross-Origin Resource Sharing (CORS) is a security feature implemented in web browsers to control how resources on a web page can be requested from another domain outside the domain from which the resource originated.

CORS allows servers to specify who can access their resources and how. This is essential for web applications that need to interact with APIs hosted on different domains.

### Why is CORS Important?
Without CORS, modern web browsers block requests made to a different domain than the one that served the web page, to prevent malicious websites from accessing sensitive data. CORS enables safe and secure cross-domain data sharing.

### How Does CORS Work?
CORS relies on HTTP headers to determine if a cross-origin request is allowed. Here’s a brief overview of the process:

1. **Preflight Request:** Before the actual request, the browser sends an OPTIONS request to the server to check if the CORS policy allows the actual request. The server responds with headers indicating whether the request is permitted.

2. **Actual Request:** If the preflight request is successful, the browser sends the actual request with the appropriate method (GET, POST, etc.).

### Key HTTP Headers in CORS

| Header                           | Propose                                                     |
|----------------------------------|-------------------------------------------------------------|
| Access-Control-Allow-Origin      | Specifies which origins can access the resource. It can be a specific domain or a wildcard (*) |
| Access-Control-Allow-Methods     | Lists the HTTP methods (GET, POST, etc.) that are allowed |
| Access-Control-Allow-Headers     | Indicates which HTTP headers can be used during the actual request. |
| Access-Control-Allow-Credentials | Indicates whether the browser should include credentials (like cookies) in the request |

## What will it do?
This module will load a settings file where you can specify the headers to use when responding to incoming requests. You can configure it to accept any origin by using (*), use the request origin, or hard-code the allowed domains. Additionally, you can specify the list of methods and headers to include. An HTTP middleware will then decorate the response object from the HTTP stack, adding the necessary headers.

Note that it will not set the `Access-Control-Allow-Credentials` header.

## Module file structure
Like any PHP project created with *Composer*, this module should have a basic `src` folder and a `composer.json` file with the necessary settings. You can use the `composer init` command to bootstrap the project and set up these components:

```shell
composer init
```

Add the package name, description, and desired namespace for PSR-4 autoload. In this guide, we will use the `Slick\Cors` namespace.

## Defining the module
To define a module, create a class following the convention described in the [Module API documentation](/modules/module-api.html#slick-module-interface) by suffixing the class name with `Module`. We will call this module `cors`, so in the namespace root, create a class named `CorsModule` as follows:

```php
// src/CorsModule.php
namespace Slick\Cors;

use Slick\ModuleApi\Infrastructure\AbstractModule;
use Slick\ModuleApi\Infrastructure\FrontController\WebModuleInterface;

final class CorsModule extends AbstractModule implements WebModuleInterface
{
    public function description(): ?string
    {
        return "Enables Cross-Origin Resource Sharing (CORS) for secure and flexible API interactions.";
    }
}
````
The above code is the minimum needed to specify a slick module.

## Enabling your module
To test and run our module, we need to create a separate project using the Slick template. Run the following command to accomplish this:

```shell
composer create-project slick/webapp ./sandbox
```

Then we need to change our `composer.json` file to load the module:
```json
{
    ...
    "require": {
        "php": ">=8.3",
        "slick/webstack": "^2"
    },
    "autoload": {
        "psr-4": {
            "App\\": "./src",
            "Slick\\Cors\\": "../cors/src" // path to local pakage
        }
    },
    ...
}
```

{% include note.html type="info" content="
If you are using Docker to run your `sandbox` project, you need to add the volume for the module so that it is available when `composer` autoload searches for it.
" %}

Now you can list all available modules in your `sandbox` project by running `bin/console modules`, and the following output should be displayed:

```shell
bin/console modules
```

{% include console-output.html content='
![Console output when listing cors module.](/assets/img/console-outputs/console-cors.png "List all modules")
' %}

{% include note.html type="warning" content="
If you don’t see the `cors` module in the list, it is likely not included for autoloading. Run `composer dump-autoload`, and it should be listed as shown.   
" %}

Now enable the module by running:

```shell
bin/console enable cors
```
{% include console-output.html content='
![Console output when cors module is enabled.](/assets/img/console-outputs/console-cors-enabled.png "Modules list when cors is enabled")
' %}

## Implementation
As we have created and enabled our module in a sandbox project, let's implement it. This implementation is straightforward. We will create a default settings file with the values to use in the response CORS headers. In the module class, we will attempt to find a custom `cors.php` settings file and merge it with the default values. Lastly, we will create an HTTP middleware that will decorate the response with the necessary headers using the merged values.

### Placing the settings files
You can specify settings to be available throughout your project when defining a module. [The Module API](/modules/module-api.html#module-settings) assists with the import and merge operation using the handy `importSettingsFile()` function. By convention, all module settings should be placed in the `config/modules/*.php` directory of your project. Let's add the settings setup to our module:

```php
// src/CorsModule.php
namespace Slick\Cors;

use Dotenv\Dotenv;
use Slick\ModuleApi\Infrastructure\AbstractModule;
use Slick\ModuleApi\Infrastructure\FrontController\WebModuleInterface;
use function Slick\ModuleApi\importSettingsFile;

final class CorsModule extends AbstractModule implements WebModuleInterface
{
    private static array $defaultConfig = [
        'cors' => [
            'origin' => '*',
            'methods' => 'GET, POST, PATCH, PUT, HEAD, DELETE, OPTIONS',
            'headers' => 'origin, x-requested-with, content-type, authorization',
            'credentials' => 'true'
        ]
    ];

    // code...

    public function settings(Dotenv $dotenv): array
    {
        $file = APP_ROOT . '/config/modules/cors.php';
        return importSettingsFile($file, self::$defaultConfig);
    }
}
```

{% include note.html type="info" content="
When using the [default template of Slick](/getting_started.html), a constant named `APP_ROOT` is created and made available to the entire application. If you need to use it in different environments or test cases, you SHOULD verify if it is defined. If it’s not, you should define it in any bootstrap form of your environment.
" %}

### Adding the middleware component
Slick uses the [PSR-15 middleware component](https://www.php-fig.org/psr/psr-15/#12-middleware) to process HTTP requests and create the resulting response, as defined by [PSR-7 HTTP message interfaces](https://www.php-fig.org/psr/psr-7). Our module will add a [middleware component](https://www.php-fig.org/psr/psr-15/#22-psrhttpservermiddlewareinterface) that will append the necessary headers to the created response.

In order to use the configuration settings we have set, we need to require the `Slick\Configuration` component. We also need to make use of `Slick\Http` component to deal with requests and responses:
```shell
composer require slick/configuration slick/http -W
```

```php
// src/Infrastructure/CorsMiddleware.php
namespace Slick\Cors\Infrastructure;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slick\Configuration\ConfigurationInterface;

final readonly class CorsMiddleware implements MiddlewareInterface
{
    public function __construct(private ConfigurationInterface $config)
    {
    }

    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        $response = $handler->handle($request);
        return $response
            ->withHeader('Access-Control-Allow-Origin', $this->config->get('cors.origin'))
            ->withHeader('Access-Control-Allow-Methods', $this->config->get('cors.methods'))
            ->withHeader('Access-Control-Allow-Headers', $this->config->get('cors.headers'))
            ->withHeader('Access-Control-Allow-Credentials', $this->config->get('cors.credentials'))
        ;
    }
}
```

As you can see, this is a very basic implementation of our CORS middleware: it gets the processed response and adds the necessary headers using the default values merged with any custom ones.

### `OPTIONS` don't need a body
As we already know, browsers will perform a [preflight request](howtos/2024/07/02/how-to-create-a-slick-module.html#how-does-cors-work), so we should verify if it's a request with the `OPTIONS` method. If so, we need to create a response with a 200 status code, without a body, and add the CORS headers:

```php
// src/Infrastructure/CorsMiddleware.php
namespace Slick\Cors\Infrastructure;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slick\Configuration\ConfigurationInterface;
use Slick\Http\Message\Response;

final readonly class CorsMiddleware implements MiddlewareInterface
{
    // code...

    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        $response = strtoupper($request->getMethod()) === 'OPTIONS'
            ? new Response(200)
            : $handler->handle($request);

        return $this->addHeaders($response);
    }

    private function addHeaders(ResponseInterface $response): ResponseInterface
    {
        return $response
            ->withHeader('Access-Control-Allow-Origin', $this->config->get('cors.origin'))
            ->withHeader('Access-Control-Allow-Methods', $this->config->get('cors.methods'))
            ->withHeader('Access-Control-Allow-Headers', $this->config->get('cors.headers'))
            ->withHeader('Access-Control-Allow-Credentials', $this->config->get('cors.credentials'))
        ;
    }
}
```

## Placing the middleware
Let's go back to our module setup class to place our middleware in the HTTP handler stack. We need to add CORS headers to any responses created by an HTTP request handler in our stack, so we need to place the middleware at the top of the stack. This way, it can handle the `OPTIONS` request or modify the response created by a middleware or handler further down the stack. The [Module API](/modules/module-api.html#middleware-position) provides a mechanism to set up the HTTP middleware, where you specify the class name of the middleware and its position in the stack.

```php
// src/CorsModule.php
namespace Slick\Cors;

use Dotenv\Dotenv;
use Slick\Cors\Infrastructure\CorsMiddleware;
use Slick\ModuleApi\Infrastructure\AbstractModule;
use Slick\ModuleApi\Infrastructure\FrontController\MiddlewareHandler;
use Slick\ModuleApi\Infrastructure\FrontController\MiddlewarePosition;
use Slick\ModuleApi\Infrastructure\FrontController\Position;
use Slick\ModuleApi\Infrastructure\FrontController\WebModuleInterface;
use function Slick\ModuleApi\importSettingsFile;

final class CorsModule extends AbstractModule implements WebModuleInterface
{
    // code...

    public function middlewareHandlers(): array
    {
        $position = new MiddlewarePosition(Position::Top);

        return [
            new MiddlewareHandler(
                'cors',
                $position,
                CorsMiddleware::class
            )
        ];
    }
}
```

To check the module placement in the sandbox project, run the following command:
```shell
bin/console stack
```
{% include console-output.html content='
![Console output for cors stack placement.](/assets/img/console-outputs/console-cors-stack.png "Console output for cors stack placement")
' %}


## Testing the module
With everything in place, we can test our module in the sandbox project. We will create a controller that generates an example JSON response, allowing us to test the module and verify the headers in the response.

```php
// src/UserInterface/HomrPageController.php
namespace App\UserInterface;

use Psr\Http\Message\ResponseInterface;
use Slick\Http\Message\Response;
use Symfony\Component\Routing\Attribute\Route;

final class HomePageController
{
    #[Route('/', name: 'homepage')]
    public function handle(): ResponseInterface
    {
        return new Response(
            200,
            json_encode(["check" => "Ok"]),
            ['Content-Type' => 'application/json']
        );
    }
}
```

We can use `curl` command to check the call to the `homepage` of our snadbox web application and verify the CORS headers:

```shell
curl -v http://127.0.0.1:8080
```
{% include console-output.html content='
![Console cors curl output.](/assets/img/console-outputs/console-curl-cors.png "Console cors curl output")
' %}

## Conclusion
In this guide, we successfully created and implemented a CORS middleware module for the Slick Framework. By following these steps, we developed a robust and configurable module that enhances the security and flexibility of cross-origin API interactions. To reuse this functionality, simply publish the module to a Git repository and add that repository to your `composer.json`.