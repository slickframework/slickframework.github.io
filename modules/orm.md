---
layout: page
hide_hero: true
menubar_toc: true
toc_title: ORM (doctrine)
title: ORM (doctrine)
category: modules
---

# ORM (doctrine)
`Slick/Orm` is a lightweith module that will provide Migrations, Database Abstraction (DBA), and Object-Relational Mapping (ORM) features utilizing the [doctrine/migrations](https://www.doctrine-project.org/projects/migrations.html) and [doctrine/orm](https://www.doctrine-project.org/projects/orm.html) packages.

{% include note.html type="info" content="
This module is designed to integrate **Doctrine ORM** and **Doctrine Migrations** into a Slick application. This page provides all the necessary information to complete that setup. For detailed documentation, please refer to the [Doctrine ORM documentation](https://www.doctrine-project.org/projects/doctrine-orm/en/current/reference/basic-mapping.html) and the [Doctrine Migrations documentation](https://www.doctrine-project.org/projects/doctrine-migrations/en/current/reference/migration-classes.html).
" %}

## Install
To use `Slick/Orm` in your application, you need to install it via Composer. To complete the module setup, you also need to enable it. This ensures that all necessary files and configurations for migrations and ORM entity managers are properly set up.

```shell
composer require slick/orm
```

```shell
bin/console enable orm
```
After enabling the module the list of modules should be like is shown bellow:
```shell
bin/console modules
```
{% include console-output.html content='
![Console output with ORM enabled.](/assets/img/console-outputs/console.modules-orm-enabled.png "Console output with ORM enabled")
' %}

## ORM configuration
When you enable the module for the first time, a `config/modules/orm.php` file is automatically generated with the basic settings needed to start working with Doctrine ORM. This includes configuring an `EntityManager` as a dependency, ready to be injected into your services.

### Default configuration
By default, an SQLite database is set up and will be stored in the `data/database.sqlite` file in your project root. The module will also scan the `/src/Domain` folder of your project for [Doctrine attributes](https://www.doctrine-project.org/projects/doctrine-orm/en/current/reference/attributes-reference.html) in your entity classes. The configuration file will look like this:
```php
/**
 * This file is part of orm module configuration.
 */
 
 use Slick\Orm\Infrastructure\Persistence\ManagerSettings;

return [
    "databases" => [
        "default" => [
            "url" => isset($_ENV["DATABASE_URL"]) ? $_ENV["DATABASE_URL"] : 'pdo-sqlite:///data/database.sqlite',
            "devMode" => getenv("APP_ENV") === "develop",
            'entityPaths' => ["/src/Domain"],
            'implDriver' => ManagerSettings::ATTRIBUTE_DRIVER_IMPL
        ]
    ],
    "types" => [
    ]
];
```
#### Database connection string
In most cases, you'll need to configure a different database for your application. To do this, edit your `.env` file, uncomment the `DATABASE_URL` entry, and add your database connection details. Keep in mind that database URLs often contain sensitive information, so they should not be included in your codebase. For more details on environment configuration, refer to the [Slick .env support](/documentation/configuration.html#env-support) page.

```.env
# Data base DSN for the default connection.
# This will be used in the config/modules/orm.php settings file.

DATABASE_URL=pdo-mysql://user:pass@localhost:3306/database?charset=utf8
```
Change the `DATABASE_URL` as shown above.

#### Entity class files locations
By default, the `/src/Domain` folder is scanned for entity metadata. However, you can change this folder or add additional ones. For instance, if you have entity classes in both `src/Entities` and `src/Models`, you can update your `config/modules/orm.php` configuration as follows:

```php
return [
    "databases" => [
        "default" => [
            "url" => isset($_ENV["DATABASE_URL"]) ? $_ENV["DATABASE_URL"] : 'pdo-sqlite:///data/database.sqlite',
            "devMode" => getenv("APP_ENV") === "develop",
            'entityPaths' => ["/src/Entities", "/src/Models"], // <- change this
            ...
        ]
    ],
    ...
];
```

{% include note.html type="warning" content="
For all specified `entityPaths`, the metadata driver implementation must be consistent. You cannot mix `ManagerSettings::ATTRIBUTE_DRIVER_IMPL` with `ManagerSettings::XML_DRIVER_IMPL` within a single entity manager—only one driver can be used at a time.
" %}

#### Metadata driver
You can specify witch metadata implementation driver you want to use. Possible values are `ManagerSettings::ATTRIBUTE_DRIVER_IMPL` for [attibutes driver](https://www.doctrine-project.org/projects/doctrine-orm/en/current/reference/attributes-reference.html) and `ManagerSettings::XML_DRIVER_IMPL` for [xml driver](https://www.doctrine-project.org/projects/doctrine-orm/en/current/reference/xml-mapping.html).
Remember that you can only use one driver implementation with an entity manager configuration or database connection.
```php
return [
    "databases" => [
        "default" => [
            "url" => isset($_ENV["DATABASE_URL"]) ? $_ENV["DATABASE_URL"] : 'pdo-sqlite:///data/database.sqlite',
            "devMode" => getenv("APP_ENV") === "develop",
            'entityPaths' => ["/src/Domain"],
            'implDriver' => ManagerSettings::XML_DRIVER_IMPL,
            ...
        ]
    ],
    ...
];
```
{% include note.html type="info" content="
All metadata drivers function equally in terms of performance. Once a class's metadata is read from its source (whether attributes, XML, etc.), it is stored in an instance of the `Doctrine\ORM\Mapping\ClassMetadata` class, which is then cached in the metadata cache. If you are not using a metadata cache (which is not recommended), the `ManagerSettings::XML_DRIVER_IMPL` driver is the fastest option.
" %}

#### Multiple database connections
You can set up multiple connections, each with its own `EntityManager`. To do this, you'll need to add new entries under the `databases` key. Here's an example:
```php
return [
    "databases" => [
        "default" => [
            "url" => isset($_ENV["DATABASE_URL"]) ? $_ENV["DATABASE_URL"] : 'pdo-sqlite:///data/database.sqlite',
            'entityPaths' => ["/src/Domain"]
            ...
        ],
        "sales" => [
            "url" => 'pdo-pgsql://user:pass@localhost:5432/sales',
            'entityPaths' => ["/src/Sales/Domain"]
            ...
        ]
    ],
    ...
];
```

{% include note.html type="warning" content="
While it's possible to have multiple connections, there are some limitations:

- **Separate Entity Class Locations:** Each connection must have a distinct location for its entity classes.
- **Custom Aliases Required:** You'll need to create new aliases for the `EntityManager` and `Connection` of any connections other than the `default`.
- **Custom Service Definitions:** Services that rely on `EntityManagerInterface` or `Connection` dependencies must be defined in a custom services file.
- **No Cross-Connection Relationships:** Entities from different connections cannot have relationships with each other.
- **Manual Persistence Required:** Changes made in the `EntityManager` of connections other than the `default` will not be automatically persisted. You'll need to manually control when to persist data.
" %}

{% include note.html type="info" content="
It is recommended that additional databases serve as unique sources for the data they contain, with most transactions occurring primarily on the `default` database connection. Connection names should clearly reflect the specific purpose or area of your application they pertain to. Keep in mind that using multiple database connections within a single application should be considered an exception rather than the norm.
" %}

### ORM configuration reference
Here’s a breakdown of the configuration properties for the module:


| Property | Default Value | Description |
|----------|---------------|-------------|
| `url` | `pdo-sqlite:///data/database.sqlite` | The Database URL or DSN. For more details, refer to the [Doctrine DBAL documentation on connecting using a URL](https://www.doctrine-project.org/projects/doctrine-dbal/en/4.0/reference/configuration.html#connecting-using-a-url). |
| `entityPaths` | `["src/Domain"]` | A list of directories where `Entity` classes will be scanned. |
| `implDriver`               | `ManagerSettings::ATTRIBUTE_DRIVER_IMPL`  | The implementation driver used to create entity metadata. Possible values include `ManagerSettings::ATTRIBUTE_DRIVER_IMPL` and `ManagerSettings::XML_DRIVER_IMPL`.                             |
| `devMode`                  | `false`                                   | Determines if the application is in development mode. This can be set directly or by defining the environment variable `APP_ENV=develop`, which will automatically set this to `true`.        |
| `proxiesDir`               | `/tmp/Proxies`                            | The directory where Doctrine will generate entity proxy class files.                                                                                                                          |
| `proxiesNamespace`         | `App\Persistence\Proxies`                 | The namespace used for generated entity proxy classes.                                                                                                                                        |
| `autoGenerateProxyClasses` | `true`                                    | Specifies whether Doctrine should automatically generate proxy class files. If set to `false`, proxies must be generated through a console command.                                            |
| `cache`                    | `null`                                    | A service alias or interface that implements *PSR-6* `CacheItemInterface`.                                                                                                                    |
| `SQLLogger`                | `null`                                    | A service alias or interface that implements *PSR-3* `LoggerInterface`.                                                                                                                       |


### Adding custom types
Doctrine allows you to create custom mapping types, which can be useful if you need a specific type that isn't provided by default or if you want to replace the existing implementation of a mapping type.

To create a new mapping type, subclass `Doctrine\DBAL\Types\Type` and implement or override the necessary methods to suit your needs.
Here is an example:
```php
// src/Infrastructure/Persistence/DoctrineEmail.php
namespace App\Infrastructure\Persistence;

use App\Domain\User\Email;
use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\StringType;

final class DoctrineEmail extends StringType
{
    public function convertToDatabaseValue(mixed $value, AbstractPlatform $platform): ?string
    {
        return is_null($value) ? null : (string) $value;
    }

    public function convertToPHPValue(mixed $value, AbstractPlatform $platform): ?Email
    {
        return is_null($value) ? null : new Email($value);
    }

    public function getSQLDeclaration(array $column, AbstractPlatform $platform): string
    {
        $column["length"] = 255;
        return parent::getSQLDeclaration($column, $platform);
    }
}
```
The example above converts an `Email` object to plain text when persisting it to the database and converts the text back into an `Email` object when retrieving it. This custom type extends `Doctrine\DBAL\Types\StringType`, which is a subclass of `Doctrine\DBAL\Types\Type`.

To register your custom type with Doctrine, you need to add it to the list of types used by Doctrine. Edit the `config/modules/orm.php` settings file and add the following entry to the `types` array:
```php
use App\Infrastructure\Persistence\DoctrineEmail;
use Slick\Orm\Infrastructure\Persistence\ManagerSettings;

return [
    "databases" => [
        "default" => [
            "url" => ...
        ]
    ],
    "types" => [
        "Email" => DoctrineEmail::class
    ]
];
```

After this you can use the `Email` as a property type.
```php
namespace App\Domain;

use App\Domain\User\Email;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'users')]
class User
{

    #[ORM\Id]
    #[ORM\Column(name: 'id', type: 'integer')]
    #[ORM\GeneratedValue]
    private int|null $userId = null;

    #[ORM\Column]
    private string $name

    #[ORM\Column(type: 'Email', unique: true, nullable: false)]
    private Email $email

    ...
}

```
### Using the Entity Manager and DBAL Connection
When the `slick/orm` module is enabled, it automatically adds the `EntityManager` and `Connection` for the default database connection to the dependency injection container, making them ready for use. Below is an example of a `UserRepository` that utilizes the `EntityManager` as a dependency:

```php
namespace App\Infrastructure\Persistence;

use App\Domain\User;
use App\Domain\UserRepository;
use Doctrine\ORM\EntityManagerInterface;

final readonly class DoctrineUserRepository implements UserRepository
{

    public function __construct(private EntityManagerInterface $entityManager) // add the dependency
    {}

    public function withId(int $userId): User
    {
        $user = $this->entityManager->find(User::class, $userId); // used here
        if ($user instanceOf User::class) {
            return $user;
        }

        throw new RuntimeException("User not found.");
    }
}
```

The same principle applies to the DBAL `Connection`:
```php
namespace App\Infrastructure\Persistence;

use App\Domain\UserList;
use Doctrine\DBAL\Connection;

final readonly class DoctrineUsersList implements \IteratorAggergate, UserList
{
    private array $data = [];

    public function __construct(private Connection $connection) // add the dependency
    {
        $sql = "SELECT * FROM users";

        $stmt = $$this->connection->query($sql);
        while (($row = $stmt->fetchAssociative()) !== false) {
            $this->data = row;
        }
    }

    ...
        
} 
``` 

## ORM Console commands
`slick/orm` console is configured with the [Doctrine console command](https://www.doctrine-project.org/projects/doctrine-orm/en/current/reference/tools.html#command-overview).

Here is a break down of the available console commands:
- `dbal:import` Import SQL file(s) directly to Database.
- `dbal:run-sql` Executes arbitrary SQL directly from the command line.
- `orm:clear-cache:metadata` Clear all metadata cache of the various cache drivers.
- `orm:clear-cache:query` Clear all query cache of the various cache drivers.
- `orm:clear-cache:result` Clear result cache of the various cache drivers.
- `orm:generate-proxies` Generates proxy classes for entity classes.
- `orm:run-dql Executes` arbitrary DQL directly from the command line.
- `orm:schema-tool:create` Processes the schema and either create it directly on EntityManager Storage Connection or generate the SQL output.
- `orm:schema-tool:drop` Processes the schema and either drop the database schema of EntityManager Storage Connection or generate the SQL output.
- `orm:schema-tool:update` Processes the schema and either update the database schema of EntityManager Storage Connection or generate the SQL output.

{% include note.html type="info" content="
Remember that the commands shown above will only work with the `default` database connection.
" %}

## Migrations
The primary purpose of using `doctrine/migrations` in a project is to manage and apply database schema changes in a controlled and versioned way. This tool allows developers to track, share, and implement database updates consistently across different environments, ensuring that the schema stays in sync with the application’s codebase. Additionally, it provides the ability to easily roll back changes when necessary, making it essential for maintaining database integrity and supporting team collaboration.

### Default configuration
When enabling the `slick/orm` module, the `config/migrations.json` settings file is generated with default configurations. Additionally, the `lib/Migrations` directory is created, as specified in the settings file, and is designated as the location for migration classes. Below is the JSON output of the default migrations settings file:

```json
{
    "table_storage": {
        "table_name": "doctrine_migration_versions",
        "version_column_name": "version",
        "version_column_length": 192,
        "executed_at_column_name": "executed_at",
        "execution_time_column_name": "execution_time"
    },
    "migrations_paths": {
        "App\\Migrations": "..\/lib\/Migrations"
    },
    "all_or_nothing": true,
    "transactional": true,
    "check_database_platform": true,
    "organize_migrations": "none",
    "connection": null,
    "em": null
}
```

{% include note.html type="info" content="
For more information and guidance on setting up `doctrine/migrations`, please refer to the [Doctrine Migrations configuration documentation](https://www.doctrine-project.org/projects/doctrine-migrations/en/current/reference/configuration.html).
" %}

### Console commands

Here is a break down of the available console commands:

- `migrations:diff` Generate a migration by comparing your current database to your mapping information.
- `migrations:dump-schema` Dump the schema for your database to a migration.
- `migrations:execute` Execute one or more migration versions up or down manually.
- `migrations:generate` Generate a blank migration class.
- `migrations:latest` Outputs the latest version
- `migrations:list` Display a list of all available migrations and their status.
- `migrations:migrate` Execute a migration to a specified version or the latest available version.
- `migrations:rollup` Rollup migrations by deleting all tracked versions and insert the one version that exists.
- `migrations:status` View the status of a set of migrations.
- `migrations:sync-metadata-storage` Ensures that the metadata storage is at the latest version.
- `migrations:version` Manually add and delete migration versions from the version table.

{% include note.html type="info" content="
Remember that the commands shown above will only work with the `default` database connection.
" %}