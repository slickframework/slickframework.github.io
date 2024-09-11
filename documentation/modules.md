---
layout: page
hide_hero: true
menubar_toc: true
toc_title: Modules system
title: Modules system
---

# Modules
`Slick` is a modular framework where nearly all features are implemented as modules. Some modules are enabled by default and cannot be disabled, while others may need to be enabled to set up their dependencies in the dependency container, console commands, HTTP middlewares, and default settings. It is always possible to override container services and settings for these modules.

## What's a module?
A module is typically a package that provides specific functionality. Whether you need to develop a web application or a command line tool, modules enable you to extend the framework's capabilities by adding command line commands, HTTP middleware handlers, and configuring the dependency container and default settings to work with.



## Available modules
You can always check witch modules are installed and witch are enabled.

```shell
bin/console modules
```

Here is an example of what output should be:

{% include console-output.html content='
![Console output when enabling security module.](/assets/img/console-outputs/module-list.png "Enable security module")
' %}

So, in the above output you can see what modules are available and from those what are the enebled ones.

## Enable a module
Enabling a module is easy. Just run the following command with the module name you want to enable:

```shell
bin/console enable orm
```
In the above case, the `orm` module will be enabled. When a module is enabled, the system sets up all necessary files needed to use the module's resources, such as console commands, services, HTTP middlewares, and settings. Note that this module setup occurs on every request during the bootstrap process.

## Disable a module
There is also a command to disable a module. 
```shell
bin/console disable orm
```
When disabled, a module will not be loaded during request bootstrap. As a result, all associated console commands, services, HTTP middlewares, and settings will not be loaded.

{% include note.html type="warning" content="
Disabling a module only removes its link with the application bootstrap. All the files associated with it will remain. If you want to disable the module and remove its configuration files, you should use the `--purge` option.
```shell
bin/console disable orm --purge
```
" %}

{% include note.html type="danger" content="
Enabling or disabling modules assumes that the Composer package is installed. If it is not installed, the operation will not execute and will output a \"Module not installed...\" error.
" %}

# See also
- [How to create a slick module](/howtos/2024/07/02/how-to-create-a-slick-module.html)
- [Module API](/modules/module-api.html)