---
layout: page
hide_hero: true
menubar_toc: true
toc_title: Configuration management
title: Configuration management
---

# Configuration management
The `slick/configuration` component provides an easy-to-use solution for managing configuration files in your PHP applications. It features a straightforward interface that allows you to define custom configuration drivers. By default, it leverages PHP arrays for configuration, eliminating the need for parsers and enhancing performance.

## Install
This package is already installed if you use the [default Slick template](/documentation/getting-started/) and is used for configuration management across all modules.

{% include note.html type="info" content="
When using the [default Slick template](/documentation/getting-started/), you can define your custom settings in the `config/settings.php` file. This file serves as the master settings file and will be merged with any module settings, overriding them as necessary. In your services, you can specify `ConfigurationInterface` as a dependency, as it is instantiated with the settings from both your custom file and settings from all enabled modules.
" %}

If you are not using the Slick template, you need to install it with `composer`:

```shell
composer require slick/configuration
```

## Getting started
To create a `ConfigurationInterface`, use the `Slick\Configuration` factory class. This class simplifies and streamlines the creation process.

### Creating a configuration
Lets start by creating a configuration file:
```php
// config/settings.php
namespace settings;

$settings = [];
$settings['application'] = [
    'version' => 'v1.0.0',
    'environment' => 'develop'
];
return $settings;
```

{% include note.html type="info" content="
We are using plain PHP arrays for configuration files. Don’t forget to add the return statement at the end of the file so that the defined array could be assigned when initializing the driver.
" %}

Now we will use the `Slick\Configuration\Configuration` factory o create our `Slick\Configuration\ConfigurationInterface`:

```php
use Slick\Configuration\Configuration;

$settings = Configuration::get('settings');
```

### Retrieving values

To retrieve settings values, use the `ConfigurationInterface::get()` method as shown below:
```php
print_r($settings->get('application'));

# the output form above is:
# Array (
#    [version] => v1.0.0,
#    [environment] => develop
# )
```

You can set any level of nesting in your configuration array. However, adding more levels can make it harder to manage. Refer to the example below:
```php
$value = $settings->get('application')['version'];
// OR
$appSettings = $settings->get('application');
$value = $appSettings['version'];
```

To simplify you ca use a “dot notation” to reach a deeper level.
```php
$value = $settings->get('application.version');
```

### Default values
You can specify a default value to be returned if a key is not found in the configuration driver. By default, `NULL` is returned when a key is missing, but you can override this by providing a default value in the `ConfigurationInterface::get()` method as shown below:
```php
$value = $settings->get('application.rowsPerPage', 10);
print $value;

# the output from above is:
# 10
```

## Configuration chain
Starting from v1.2.0, `Slick\Configuration` can combine multiple configuration drivers within a single configuration interface. This enables you to include higher-priority configuration sources, such as environment variables, which will also be checked when retrieving a configuration value.

### Priority configuration chain

Version 1.2.0 introduces the `ConfigurationChainInterface`, which allows clients to retrieve values from a combined chain of `ConfigurationInterface` objects rather than relying on a single configuration source.

Additionally, it introduces the `PriorityConfigurationChain`, which implements `ConfigurationChainInterface` and is the default return value for the `Configuration::initialize()` and `Configuration::get()` factory methods.

In this chain, priorities are determined by integer values that dictate the order in which keys are searched. Lower values are checked first.

### Combined configuration
Here's an example. Below is a PHP file containing an associative array with configuration settings:
```php
// config/settings.php
namespace settings;

$settings = [];
$settings['application'] = [
    'version' => 'v1.0.0',
    'environment' => 'develop'
];
return $settings;
```

Next, we'll create a combined configuration that includes both an `Environment` driver and a `Php` driver, using the values from the file we just created:
```php
use Slick\Configuration\Configuration;

$settings = Configuration::get([
    [null, Configuration::DRIVER_ENV, 10],
    ['settings', Configuration::DRIVER_PHP, 20]
]);
```

This configuration setup will prioritize the `Environment` driver as the first configuration source. If a value is not found there, it will then check the `Php` driver.

Assuming we have defined an environment variable `APPLICATION_VERSION=v1.2.3`, let's retrieve that value from the configuration chain:
```php
print_r($settings->get('application.version'));

# the output form above is:
# v1.2.3
```
You can combine any number of configuration drivers into a single chain and set their priorities to control the order of the search.

## .ENV support

Starting with `Slick/Webstack` v2.x, the [default Slick template](/documentation/getting-started/) and its [Module API](/modules/module-api.html) support `.env` files. While you can use the `Environment` driver to retrieve environment settings, the `.env` approach offers greater flexibility in environments where setting environment variables directly is challenging, such as in Docker containers or Kubernetes pods. This allows you to define settings with values sourced from a `.env` file in your project's root directory. Let's look at the example bellow:

```.env
DATABASE_URL=mysql://user:pass@localhost:3306/database?charset=UTF-8&timezone=UTC
```

In your `config/settings.php` you can use the environment `DATABASE_URL` as follows:

```php
// config/settings.php
namespace settings;

$settings = [];
// other settings
$settings['databases'] => [
    'default' => [
        'url' => $_ENV['DATABASE_URL'];
    ]
];

return $settings;

```

{% include note.html type="warning" content="
You should never store sensitive credentials in your code. Storing [configuration in the environment](https://www.12factor.net/config) is one of the tenets of a [twelve-factor app](https://www.12factor.net/). Anything that is likely to change between deployment environments – such as database credentials or credentials for 3rd party services – should be extracted from the code into environment variables.

The `.env` file is generally kept out of version control since it can contain sensitive API keys and passwords. 
" %}

For more information on using `.env` files, please refer to the [PHP dotenvpackage  by Vance Lucas & Graham Campbell](https://github.com/vlucas/phpdotenv), which is utilized by Slick.