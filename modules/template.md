---
layout: page
hide_hero: true
menubar_toc: true
toc_title: Template engine
title: Template engine
category: modules
---

# Template engine

The `slick/template` module serves as a straightforward wrapper for integrating the template
engine of your choice. It provides easy-to-use interfaces that let you develop custom PHP
template engines. Additionally, it includes an implementation of the Twig template engine,
known for being flexible, fast, and secure.

{% include note.html type="info" content="
This module is designed for integration into a Slick web application. However, it can be used in any project that requires template processing. It features a generic interface that supports the implementation of other template engines, such as Smarty, Plates, or Blade.
" %}

## Install

To use `slick/template` in your application, you need to install it via Composer. To complete the module setup, you also need to enable it. This ensures that all necessary files and configurations for processing templates are properly set up.

```shell
composer require slick/template
```

```shell
bin/console enable template
```

### Standalone example
As mentioned, this Slick module can be used in any PHP project managed with Composer. Here’s an example of how to create a template engine and use it in your services:

```php
use Slick\Template\Engine\TwigTemplateEngine;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;

$loader = new FilesystemLoader([dirname(__DIR__) . '/templates']);
$templateEngine = new TwigTemplateEngine(new Environment($loader, ['debug' => true]));

$output = $templateEngine->parse('index.html.twig')->process(["foo" => "bar"]);

```
{% include note.html type="info" content="
This example illustrates how the default `TemplateEngineInterface` is implemented within the Slick module system. It uses the [Twig template engine](https://twig.symfony.com/), so you should consult Twig's documentation for detailed information. Use this library only if you plan to utilize the `TemplateEngineInterface` API in your project.
" %}

## Template language

This templating language enables you to create concise, readable templates that are more designer-friendly and, in many ways, more powerful than PHP templates. Check out the following template example. Even if you're seeing this language for the first time, you'll likely understand most of it:

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Slick web application</title>
    </head>
    <body>
        <h1>{% raw %}{{ page.title }}{% endraw %}</h1>
{% raw %}
        {% if app.user %}
            Hello {{ app.user.name }}!
        {% endif %}

        {# ... #}
{% endraw %}        
    </body>
</html>
```
The syntax of this templating language is built on three main constructs:

- `{% raw %}{{ ... }}{% endraw %}`: Displays the content of a variable or the result of an expression.
- `{% raw %}{% ... %}{% endraw %}`: Executes logic such as conditionals or loops.
- `{# ... #}`: Adds comments to the template (unlike HTML comments, these are not included in the rendered page).

You can't run PHP code directly within these templates, but the language provides tools to handle logic within templates. For instance, filters can modify content before rendering, like the `upper` filter that converts content to uppercase:

```twig
{% raw %}{{ title|upper }}{% endraw %}
```

This templating engine is fast in production environments (because templates are compiled into PHP and automatically cached) while remaining convenient in development (as templates are recompiled automatically whenever they are changed).

## Creating templates

The template engine essentially renders dynamic values into template files that contain placeholders, producing the final output. In a web application, these templates are typically HTML files, but they aren't limited to just HTML. For a quick overview of the process, check out the following example. Start by creating a new file in the `templates/` directory of your project root to store the template file:

```twig
{% raw %}{# templates/user/notifications.html.twig #}
<h1>Hello {{ user.name }}!</h1>
<p>You have {{ notifications|length }} new notifications.</p>{% endraw %}
```

Next, create the controller that will use the template engine to render an HTML response:

```php
// src/UserInterface/User/NotificationController.php
namespace App\UserInterface\User;

use Psr\Http\Message\ResponseInterface;
use Slick\Template\UserInterface\TemplateMethods;
use Slick\WebStack\Domain\Security\Attribute\IsGranted;
use Slick\WebStack\Domain\Security\AuthorizationCheckerInterface;
use Symfony\Component\Routing\Attribute\Route;

final class NotificationController
{
    use TemplateMethods;

    #[Route(path: '/user/notifications', name: 'user_notifications')]
    #[IsGranted("IS_AUTHENTICATED")]
    public function handle(AuthorizationCheckerInterface $auth): ResponseInterface
    {
        $notifications = ["...", "..."];
        $user = $auth->authenticatedUser();

        return $this->render('user/notifications.html.twig', [
            // Pass the values to be rendered in an array
            'user' => $user,
            'notifications' => $notifications
        ])
    }
}
```
### Template Location
After enabling the `slick/template` module in a Slick application, the `templates/` directory is automatically configured. When the template engine renders a template, it will search within that directory. For example, to render `user/index.html.twig`, it will look for the file at `<your-project-root>/templates/user/index.html.twig`.

You can change this directory in the `config/modules/template.php` settings file and add additional template directories as needed.

### Variables
A common requirement for templates is to display the values passed from the controller or service. Variables often contain objects and arrays rather than simple strings, numbers, or boolean values. To address this, the template engine offers quick access to complex variables. Consider the following template:

```twig
{% raw %}<p>{{ user.name }} added this comment on {{ comment.publishedAt|date }}</p>{% endraw %}
```

The `user.name` notation indicates that you want to display a specific piece of information (`name`) stored within a variable (`user`). Whether `user` is an array or an object, or whether `name` is a property or a method, doesn't matter.

When using the `foo.bar` notation, the template engine attempts to retrieve the value of the variable in the following order:
1. `$foo['bar']` (array element)
2. `$foo->bar` (object with a public property)
3. `$foo->bar()` (object with a public method)
4. `$foo->getBar()` (object with a getter method)
5. `$foo->isBar()` (object with an "is" method)
6. `$foo->hasBar()` (object with a "has" method)
7. If none of these exist, it returns `null` (or throws a runtime error if the `strict_variables` option is enabled).

### Assigning Variables

You can assign values to variables within code blocks using the `set` tag:

```twig
{% raw %}{% set foo = 'foo' %}
{% set foo = [1, 2] %}
{% set foo = {'foo': 'bar'} %}{% endraw %}
```

### The App global variable
Slick automatically creates a context object that is injected into every template as a variable called `app`. This object provides access to various application information:
```twig
{% raw %}<p>User name: {{ app.user.name ?? 'Anonymous user' }}</p>
{% if app.settings.app.env == "develop" %}
    <p>Request method: {{ app.request.method }}</p>
    <p>Slick Version: {{ slickVersion }}</p>
{% endif %}
{% endraw %}
```

Available `app` properties:

| Property       | Description                                                                 |
|----------------|-----------------------------------------------------------------------------|
| `app.user`     | The current `UserInterface` object, or `null` if the user is not authenticated.  |
| `app.request`  | The `ServerRequestInterface` object containing request data.                |
| `app.settings` | All module and application settings as a `ConfigurationInterface` object.   |

#### Other constants:

| Property         | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| `slickVersion`   | The current Slick framework version                                         |
| `poweredBySlick` | A "Powered by Slick" stamp                                                  |

### Filters

Variables can be modified using filters, which are separated from the variable by a pipe symbol (`|`) and can have optional arguments in parentheses. Multiple filters can be chained together, with the output of one filter being passed to the next.

```twig
{% raw %}{{ name|striptags|title }}
{{ list|join(', ') }}{% endraw %}
```

### Control structure

A control structure manages the flow of a program, including conditionals (`if`, `elseif`, `else`), loops, and constructs like blocks. These structures are used within `{% raw %}{% ... %}{% endraw %}` blocks.

For example, to display a list of users stored in a variable called `users`, you would use the `for` tag:
```twig
<h1>Members</h1>
<ul>
    {% raw %}{% for user in users %}
        <li>{{ user.username|e }}</li>
    {% endfor %}{% endraw %}
</ul>
```

The `if` tag can be used to test an expression:

```twig
{% raw %}{% if users|length > 0 %}
<ul>
    {% for user in users %}
        <li>{{ user.username|e }}</li>
    {% endfor %}
</ul>
{% endif %}{% endraw %}
```
### Linking to pages

Instead of manually writing the link URLs, use the `path()` function to generate URLs based on the route configuration.
Later, if you need to change the URL of a specific page, you only have to update the routing configuration. The templates will automatically generate the new URL.

Consider the following controller class:
```php
// src/UserInterface/HomePageController.php
namespace App\UserInterface;

use Psr\Http\Message\ResponseInterface;
use Slick\Template\UserInterface\TemplateMethods;
use Symfony\Component\Routing\Attribute\Route;

final class HomePageController
{
    use TemplateMethods;

    #[Route(path: '/', name: 'home')]
    public function home(): ResponseInterface
    {
        return $this->render('homepage.html.twig');
    }

    #[Route(path: '/about/{tab}', name: 'about')]
    public function about(?string $tab): ResponseInterface
    {
        return $this->render('about.twig', compact('tab'));
    }
}
```

Use the `path()` function to create links to these pages by passing the route name as the first argument and the route parameters as the optional second argument.

```twig
{% raw %}<a href="{{ path('home') }}">Homepage</a>

{# ... #}

<ul class="tabs">
    <li id="info" class="{{ tab == "info" ? "active" }}">
        <a href="{{ path('about', {"tab": "info"}) }}">Information</a>
    </li>

    <li id="posts" class="{{ tab == "posts" ? "active" }}">
        <a href="{{ path('about', {"tab": "posts"}) }}">Posts</a>
    </li>
</ul>{% endraw %}
```

### Available functions and filters
Slick provides functions and filters to assist with text manipulation.

<dl>
    <dt><strong>truncate</strong> <small>filter</small></dt>
    <dd>
        Truncates a given string to a specified length and appends a terminator.
        <h6>parameters:</h6>
        - <em>$length</em> <code>int</code> The maximum length of the truncated string. Default is 75.<br />
        - <em>$termination</em> <code>string</code> The terminator to append to the truncated string. Default is "...".<br />
        <h6>examples:</h6>
        <code>{% raw %}{{ post.lead|truncate(125, "...more") }}{% endraw %}</code>
        <br />&nbsp;
    </dd>

    <dt><strong>wordwrap</strong> <small>filter</small></dt>
    <dd>
        Wrap a string into lines of a specified length.
        <h6>parameters:</h6>
        - <em>$length</em> <code>int</code> The number of characters at which the string will be wrapped. Default is 75.<br />
        - <em>$break</em> <code>string</code> The character used to break the lines. Default is "\n".<br />
        <h6>examples:</h6>
        <code>{% raw %}{{ post.body|truncate(250)|nl2br }}{% endraw %}</code>
        <br />&nbsp;
    </dd>

    <dt><strong>generateWords</strong> <small>function</small></dt>
    <dd>
        Generate random words using IpsumLorenGenerator.
        <h6>parameters:</h6>
        - <em>$count</em> <code>int</code> The number of words to generate. Default is 1.<br />
        <h6>examples:</h6>
        <code>{% raw %}{{ generateWords(2) }}{% endraw %}</code>
        <br />&nbsp;
    </dd>

    <dt><strong>generateSentences</strong> <small>function</small></dt>
    <dd>
        Generates a specified number of sentences using IpsumLorenGenerator.
        <h6>parameters:</h6>
        - <em>$count</em> <code>int</code> The number of sentences to generate. Default is 1.<br />
        <h6>examples:</h6>
        <code>{% raw %}{{ generateSentences() }}{% endraw %}</code>
        <br />&nbsp;
    </dd>

    <dt><strong>generateParagraphs</strong> <small>function</small></dt>
    <dd>
        Generates a specified number of paragraphs using IpsumLorenGenerator.
        <h6>parameters:</h6>
        - <em>$count</em> <code>int</code> The number of paragraphs to generate. Default is 1.<br />
        <h6>examples:</h6>
        <code>{% raw %}{{ generateParagraphs(3)|nl2br }}{% endraw %}</code>
        <br />&nbsp;
    </dd>
</dl>

### Including other templates

The `include` function is useful for including a template and returning the rendered content of that template within the current one:

```twig
{% raw %}{{ include('sidebar.html') }}{% endraw %}
```
By default, included templates share the same context as the template that includes them. This means any variable defined in the main template will also be accessible in the included template.

```twig
{% raw %}{% for box in boxes %}
    {{ include('render_box.html') }}
{% endfor %}{% endraw %}
```

You can also pass variables to included templates. Here’s an example:

```twig
{% raw %}{% for box in boxes %}
    {{ include('render_box.html', {"name": user.name}) }}
{% endfor %}{% endraw %}
```

### Template Inheritance

One of the most powerful features of this implementation of template engine is template inheritance. This allows you to create a base "skeleton" template that includes the common elements of your site and defines blocks that child templates can override.

Although this might sound complex, it is quite simple. It’s easiest to understand with an example.

Let’s define a base template, `base.html.twig`, which outlines a basic HTML structure for a two-column page:

```twig
<!DOCTYPE html>
<html>
    <head>
        {% raw %}{% block head %}
            <link rel="stylesheet" href="style.css" />
            <title>{% block title %}{% endblock %} - My Webpage</title>
        {% endblock %}
    </head>
    <body>
        <div id="content">{% block content %}{% endblock %}</div>
        <div id="footer">
            {% block footer %}
                &copy; Copyright 2024 by <a href="http://domain.invalid/">you</a>.
            {% endblock %}{% endraw %}
        </div>
    </body>
</html>
```

In this example, the block tags define four sections that child templates can customize. The block tag simply indicates to the template engine that these sections can be overridden by child templates.

Here’s what a child template might look like:
```twig
{% raw %}{% extends "base.html.twig" %}

{% block title %}Index{% endblock %}
{% block head %}
    {{ parent() }}
    <style type="text/css">
        .important { color: #336699; }
    </style>
{% endblock %}
{% block content %}
    <h1>Index</h1>
    <p class="important">
        Welcome to my awesome homepage.
    </p>
{% endblock %}{% endraw %}
```

The `extends` tag is crucial here. It tells the template engine that this template "extends" another template. When processing this template, the system first locates the parent template. Note that the `extends` tag should be the first tag in the template.

Since the child template does not define the `footer` block, it uses the value from the parent template. 

You can also render the contents of a parent block by using the `parent()` function, which returns the results of
the block from the parent template:

```twig
{% raw %}{% block sidebar %}
    <h3>Table Of Contents</h3>
    ...
    {{ parent() }}
{% endblock %}{% endraw %}
```

{% include note.html content="
Please note that this is just a brief overview of the core features related to template construction. This overview covers only the basics. The full list of features is available in the [Twig template documentation](https://twig.symfony.com/doc/templates.html), as Twig is the default implementation in this Slick module and all features are inherited from it.
" %}

## Using the built-in template
To help you get started with your templates, `slick/template` provides a `base.html.twig` template that you can use as the foundation for your web application. This base template comes pre-configured with a CSS/JS framework and a theme for that framework.

The available frameworks are [Bulma](https://bulma.io/) and [Bootstrap](https://getbootstrap.com/).

It also includes themes from [Bulmaswatch](https://jenil.github.io/bulmaswatch/) for `bulma` and [Bootswatch](https://bootswatch.com/) for `bootstrap`. Each framework also comes with an icon collection: `bulma` uses [FontAwesome icons](https://fontawesome.com/v5/search), while `bootstrap` uses [Bootstrap Icons](https://icons.getbootstrap.com/).

When you first enable the module, it defaults to the `bulma` framework with the `sandstone` theme. You can view the [Sandstone Bulma theme](https://jenil.github.io/bulmaswatch/sandstone/) to see its appearance.

You can change the framework and theme settings in the `config/modules/template.php` configuration file.

The following Twig file serves as a reference for all the block tags defined in the provided `base.html.twig`:

```twig
{% raw %}<!doctype html>
<html lang="en" class="{% block html_class %}{% endblock %}">
<head>
    {% block html_head %}
    <title>{% block html_title %}Slick web page{% endblock %}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1">
    <meta name="description" content="{% block html_head_description %}Slick template using {{ app.settings.get('template.framework') }} framework{% endblock %}">

    <link rel="shortcut icon" type="image/ico" href="/favicon.ico" >

    {% block html_head_stylesheets %}
        {# CSS for framework, theme and icons #}
    {% endblock %}

    {% endblock %}
</head>
<body class="{% block body_class %}{% endblock %}">
{% block html_body %}
    {% block page_header %}

    {% endblock %}
    {% block page_hero %}

    {% endblock %}
    {% block page_content %}

    {% endblock %}
    {% block page_footer %}

    {% endblock %}
{% endblock %}

{% block body_closure %}
    {# Javascript for framework #}

{% endblock %}
</body>
</html>{% endraw %}
```

## Module configuration
As with other Slick modules, you can modify all configuration settings for `slick/template` in its dedicated settings
file located at `config/modules/template.php`.

The default settings file typically looks like this:
```php
// config/modules/template.php

/**
 * This file is part of template module
 */

return [
    'paths' => [dirname(__DIR__, 2) . '/templates'],
    'options' => [
        'debug' => isset(\$_ENV["APP_ENV"]) ? \$_ENV["APP_ENV"] == 'develop' : false,
    ],
    'framework' => 'boostrap',
    'theme' => 'lumen'
];
```

### Template paths
You can specify multiple directories for storing template files. The `paths` configuration entry is an array that holds a list of directory paths. The template engine will search through all these directories when processing a given template.

It's also possible to use namespaced templates, allowing you to group templates under different namespaces, each with its own template path. To set this up, add the namespace as a key in the `paths` entry, as shown in the following example:
```php
// config/modules/template.php

/**
 * This file is part of template module
 */

return [
    'paths' => [
        dirname(__DIR__, 2) . '/templates', // <- general path
        "admin" => dirname(__DIR__, 2) . '/admin_templates' // <- namespaced path
    ],
    ...
];
```

You can then reference the template like this:
```php
public function home(): ResponseInterface
{
    return $this->render('@admin/index.html.twig');
}
```

### Engine options
These options are reserved for configuring the underlying template engine. In the default setup of this module, Twig is the implemented template engine, so you can pass any of the [Twig configuration settings](https://twig.symfony.com/doc/api.html#environment-options) here.

{% include note.html type="info" content="
The `debug` option has an enhanced feature: when set to `true`, it enables the `DebugExtension`, allowing you to debug template variables using the `dump()` function.
" %}

### Framework and theme
This implementation includes a built-in `base.html.twig` template designed to accelerate your development process. You can set the `framework` and `theme` options to customize the framework and theme being used.

For more details, please refer to the [Using the built-in template](#using-the-built-in-template) section of this page.

### Load extensions
You can extend the template engine by implementing the `EngineExtensionInterface`. To add extensions, use the `extensions` entry
in the `config/modules/template.php` file. Simply include the class name so that the services container can create the extension
with all its dependencies.
```php
// config/modules/template.php

/**
 * This file is part of template module
 */

return [
    'paths' => [dirname(__DIR__, 2) . '/templates'],
    ...
    'extensions' => [
        MyCustomEngineExtension::class
    ]
];
```

## Implementing an engine extension
Implementing an extension involves two key aspects: the underlying template engine and the `EngineExtensionInterface`.
Here’s how to add an extension to the default Twig implementation of the template engine.

The extension will introduce a global variable that provides the application version, making it accessible across all templates.

Start by creating the Twig extension as follows:
```php
// src/Infrastructure/twig/AppVersionTwigExtension.php
namespace App\Infrastructure\Twig;

use Twig\Extension\AbstractExtension;
use Twig\Extension\GlobalsInterface;

final class AppVersionTwigExtension extends AbstractExtension implements GlobalsInterface
{
    public function getGlobals(): array
    {
        return ['app_version' => 'v1.3.2'];
    }
}
```
Now, implement the `EngineExtensionInterface`:

```php
// src/Infrastructure/AppVersionExtension.php
namespace App\Infrastructure;

use Slick\Template\Engine\TwigTemplateEngine;
use Slick\Template\EngineExtensionInterface;

final class AppVersionExtension implements EngineExtensionInterface
{
    public function update(TemplateEngineInterface $engine): void
    {
        if ($engine instanceof TwigTemplateEngine) {
            $engine->sourceEngine()->addExtension(new Twig\AppVersionTwigExtension());
        }
    }

    public function appliesTo(TemplateEngineInterface $engine): bool
    {
        return $engine instanceof TwigTemplateEngine;
    }
}
```
The implementation is straightforward. The EngineExtensionInterface::appliesTo() method checks if the extension can be applied to the current TemplateEngineInterface instance. Then, EngineExtensionInterface::update() retrieves the underlying template engine and adds the actual extension to it.

To use the extension, add the following to the `config/modules/template.php`:
```php
// config/modules/template.php

/**
 * This file is part of template module
 */

use App\Infrastructure\AppVersionExtension;

return [
    'paths' => [dirname(__DIR__, 2) . '/templates'],
    ...
    'extensions' => [
        AppVersionExtension::class
    ]
];
```

## Implementing a template engine

You can integrate your own template engine or create a wrapper for another engine you prefer. In this example, we'll
implement a simple engine that uses PHP's `str_replace()` function to display scalar values passed as data to the
`TemplateEngineInterface::process()` method. The keys in the data array will serve as placeholders. For instance,
in the data array `["foo" => "bar"]`, the key `foo` will be mapped to a `%foo%` placeholder in the template.

{% include note.html type="danger" content="
Keep in mind that this is a simple example meant to demonstrate how to create a template engine using this Slick library.
It **SHOULD NOT** be used in any of your projects or environments.
" %}

Let's create the template engine as follows:
```php
// src/Infrastructure/TemplateEngine/SimpleTampleteEngine.php

namespace App\Infrastructure\TemplateEngine;

use Slick\Template\TemplateEngineInterface;

final class SimpleTampleteEngine implements TemplateEngineInterface
{
    private string $content = '';

    public function __construct(private string $path)
    {}

    public function parse(string $source): self
    {
        $this->content = file_get_contents("{$this->path}/$source");
        return $this;
    }

    public function process(array $data = array()): string
    {
        $placeholders = [];
        foreach ($data as $name => $value) {
            $placeholders["%$name"] = is_scalar($value) ? $value : (string) $value;
        }

        return str_replace(array_keys($placeholders), array_values($placeholders), $this->content);
    }

    public function sourceEngine(): object
    {
        return $this;
    }
}
```
To set this template engine as the default for your Slick application, add the `config/services/template.php` file as follows:
```php
// config/services/template.php
namespace config\services;

use App\Infrastructure\TemplateEngine\SimpleTampleteEngine;
use Slick\Di\Definition\ObjectDefinition;
use Slick\Template\TemplateEngineInterface;

$services = [];

$services[TemplateEngineInterface::class] = ObjectDefinition
    ::create(SimpleTampleteEngine::class)
    ->with(dirname(__DIR__) . '/templates');

return $services;
```

{% include note.html type="info" content="
If you are not using this library with the Slick framework, you'll need to configure your dependency container with
an instance of it or create it manually. Refer to the following example:
```php
$templateEngine = new SimpleTampleteEngine(dirname(__DIR__) . '/templates');
echo $template->source('index.html')->process([\"foo\" => \"bar\"]);
```
" %}

Following the flow, let's create the template:

```html
<h1>Test page</h1>
<p><strong>Foo: <strong>%foo</p>
```

and finaly, in the controller:

```php
// src/UserInterface/HomePageController.php
namespace App\UserInterface;

use Psr\Http\Message\ResponseInterface;
use Slick\Template\UserInterface\TemplateMethods;
use Symfony\Component\Routing\Attribute\Route;

final class HomePageController
{
    use TemplateMethods;

    #[Route(path: '/', name: 'home')]
    public function home(): ResponseInterface
    {
        return $this->render('index.html', ["foo" => "bar"]);
    }
}
```

## Conclusion

This documentation has provided an overview of how to utilize and extend the template engine within the `slick/template` module. By following the examples and guidelines outlined, you should now have a solid understanding of how to integrate, configure, and customize the template engine to suit your application's needs. Whether you're working with the built-in options or implementing your own extensions, the flexibility of `slick/template` allows for a wide range of templating solutions. Remember to refer to the specific sections as needed, and don't hesitate to explore further customization to make the most out of this powerful templating library.