---
title: JSON API
description: Implement the JSON:API 1.1 specification in Slick using the slick/json-api module.
---

# JSON API Module

The `slick/json-api` library implements the JSON:API 1.1 specification as a Slick module. It supports content negotiation, error handling, pagination, and resource operations (fetching, creating, updating, and deleting).

## What's {json:api}

The [JSON:API specification](https://jsonapi.org/) defines a consistent structure for API requests and responses. Key features include resource-based data modeling, standardized error handling, and support for pagination, filtering, sorting, and relationship management.

## Installation

```shell
composer require slick/json-api
```

```shell
bin/console enable json-api
```

## Document Encoder

The `DocumentEncoder` interface converts data into a valid JSON:API response.

### Creating an Encoder

```php
<?php
declare(strict_types=1);

use Slick\JSONAPI\Document\Converter\PHPJson;
use Slick\JSONAPI\Document\Encoder\DefaultEncoder;
use Slick\JSONAPI\Document\Factory\DefaultFactory;
use Slick\JSONAPI\Object\SchemaDiscover\AttributeSchemaDiscover;

$discover = new AttributeSchemaDiscover();
$factory = new DefaultFactory($discover);
$converter = new PHPJson();

$encoder = new DefaultEncoder($discover, $factory, $converter);
```

Configure and encode data:

```php
<?php
declare(strict_types=1);

use Slick\JSONAPI\JsonApi;
use Slick\JSONAPI\Object\Links;

$encoder
    ->withJsonapi(new JsonApi(JsonApi::JSON_API_11))
    ->withLinkPrefix("https://example.com")
;

echo $encoder->encode([
    "type" => "index",
    "meta" => ["description" => "Sample page"],
    "links" => [Links::LINK_SELF => '/api'],
]);
```

Response:

```json
{
    "jsonapi": { "version": "1.1" },
    "data": {
        "type": "index",
        "id": null,
        "links": { "self": "https://example.com/api" },
        "meta": { "description": "Sample page" }
    }
}
```

### Array Data

The simplest way to encode data is using arrays that mirror the JSON:API structure:

```php
<?php
declare(strict_types=1);

$post = [
    "type" => "posts",
    "id" => 34,
    "attributes" => [
        "title" => "Example post",
        "body" => "Lorem ipsum dolor sit amet...",
    ],
];

echo $encoder->encode($post);
```

## Mapping with Attributes

Map objects to JSON:API output using PHP attributes.

### #[AsResourceObject]

Marks a class as a JSON:API resource:

```php
<?php
declare(strict_types=1);

use Slick\JSONAPI\Object\SchemaDiscover\Attributes\AsResourceObject;

#[AsResourceObject(type: "users")]
class User
{
    // ...
}
```

**Properties:**

| Property             | Description                                                                                 |
|----------------------|---------------------------------------------------------------------------------------------|
| `type`               | The document's data type. Optional if set via `ResourceIdentifier`.                         |
| `meta`               | Meta information for the data section. Optional.                                            |
| `links`              | Key/URL pairs for the data block. Optional.                                                 |
| `isCompound`         | If `true`, adds an `included` section with related resources. Defaults to `false`.          |
| `generateIdentifier` | If `true`, generates an identifier when data lacks one. Defaults to `false`.                |
| `documentMeta`       | Meta information for the document's meta block. Optional.                                   |
| `documentLinks`      | Links for the document's links block. Optional.                                             |

### #[ResourceIdentifier]

Designates a property as the resource identifier:

| Property    | Description                                                                                    |
|-------------|------------------------------------------------------------------------------------------------|
| `type`      | The resource type (typically plural entity name).                                              |
| `className` | A fully qualified class name instantiated with the identifier value.                           |
| `required`  | If `true`, returns an error when converting a document without this identifier. Default: `false`. |

### #[ResourceAttribute]

Marks a property as part of the `attributes` section:

| Property    | Description                                                                                                  |
|-------------|--------------------------------------------------------------------------------------------------------------|
| `name`      | Attribute name. Defaults to the property name.                                                               |
| `className` | A fully qualified class name instantiated with the attribute value.                                          |
| `required`  | If `true`, returns an error when converting a document without this attribute. Default: `false`.             |
| `factory`   | A static method to generate this property using the attribute value.                                         |
| `getter`    | A getter method called instead of directly accessing the property value.                                     |
| `format`    | If the value has a `format()` method, calls `class::format()` with this argument to retrieve the value.     |

### #[RelationshipIdentifier]

Used when a resource document holds a relationship identifier:

```php
<?php
declare(strict_types=1);

use Slick\JSONAPI\Object\SchemaDiscover\Attributes\AsResourceObject;
use Slick\JSONAPI\Object\SchemaDiscover\Attributes\RelationshipIdentifier;
use Slick\JSONAPI\Object\SchemaDiscover\Attributes\ResourceIdentifier;

#[AsResourceObject()]
class ChangeUserGroupCommand
{
    #[ResourceIdentifier(type: "users", required: true)]
    private string $userId;

    #[RelationshipIdentifier(name: "group", required: true, type: "groups")]
    private string $groupId;

    // constructor and methods...
}
```

Expected request body:

```json
{
    "data": {
        "type": "users",
        "id": "3233",
        "relationships": {
            "group": {
                "data": { "type": "groups", "id": "21" }
            }
        }
    }
}
```

**Properties:**

| Property    | Description                                                                                                  |
|-------------|--------------------------------------------------------------------------------------------------------------|
| `name`      | The relationship name. Defaults to the property name.                                                        |
| `className` | A fully qualified class name instantiated with the relationship identifier value.                            |
| `type`      | The relationship data type. The document type must match if set.                                             |
| `required`  | If `true`, returns an error when the attribute is missing. Default: `false`.                                 |

### #[AsResourceCollection]

Marks a class as a collection of resources. The class must implement `IteratorAggregate` or another PHP iterable interface. Each object in the iterable must have a schema attribute like `AsResourceObject`.

## Document Decoder

Decode a JSON:API resource document into an object using attributes mapping.

### Creating a Decoder

```php
<?php
declare(strict_types=1);

use Slick\JSONAPI\Document\Decoder\DefaultDecoder;
use Slick\JSONAPI\Object\SchemaDiscover\AttributeSchemaDiscover;
use Slick\JSONAPI\Validator\SchemaValidator;

$discover = new AttributeSchemaDiscover();
$validator = new SchemaValidator();

$decoder = new DefaultDecoder($discover, $validator);
```

### Decoding a Request

Given this DTO:

```php
<?php
declare(strict_types=1);

use Slick\JSONAPI\Object\SchemaDiscover\Attributes\AsResourceObject;
use Slick\JSONAPI\Object\SchemaDiscover\Attributes\RelationshipIdentifier;
use Slick\JSONAPI\Object\SchemaDiscover\Attributes\ResourceIdentifier;

#[AsResourceObject()]
final readonly class ChangeUserGroupCommand
{
    public function __construct(
        #[ResourceIdentifier(type: "users", required: true)]
        private string $userId,
        #[RelationshipIdentifier(name: "group", required: true, type: "groups")]
        private string $groupId,
    ) {}

    public function userId(): string { return $this->userId; }
    public function groupId(): string { return $this->groupId; }
}
```

Parse a PSR-7 request and decode it:

```php
<?php
declare(strict_types=1);

use Slick\Http\Message\Server\Request;
use Slick\JSONAPI\Document\HttpMessageParser;

$request = new Request();
$parser = new HttpMessageParser();

$document = $parser->parse($request);
$decoder->setRequestedDocument($document);

$command = $decoder->decodeTo(ChangeUserGroupCommand::class);
```

The `Content-Type` header must be `application/vnd.api+json` for the message to be correctly parsed.

## Custom Schema Class

For full control over encoding and decoding, create a custom `ResourceSchema` class:

```php
<?php
declare(strict_types=1);

namespace App\Domain;

use Slick\JSONAPI\Object\SchemaDiscover\Attributes\AsResourceObject;
use App\Infrastructure\JsonApi\UserSchema;

#[AsResourceObject(schemaClass: UserSchema::class)]
class User
{
    // User properties and methods...
}
```

```php
<?php
declare(strict_types=1);

namespace App\Infrastructure\JsonApi;

use App\Domain\User;
use Slick\JSONAPI\Object\AbstractResourceSchema;
use Slick\JSONAPI\Object\ResourceSchema;

final class UserSchema extends AbstractResourceSchema implements ResourceSchema
{
    public function type($object): string
    {
        return "users";
    }

    public function isCompound(): bool
    {
        return true;
    }

    /** @param User $object */
    public function identifier($object): ?string
    {
        return (string) $object->accountId();
    }

    /**
     * @param User $object
     * @return array<string, mixed>|null
     */
    public function attributes($object): ?array
    {
        return [
            "name" => $object->name(),
        ];
    }

    /**
     * @param User $object
     * @return array<string, mixed>|null
     */
    public function relationships($object): ?array
    {
        return [
            "group" => [
                "data" => $object->group(),
                "links" => ['related' => true],
            ],
        ];
    }
}
```

## Conclusion

The `slick/json-api` module offers a robust implementation of the JSON:API 1.1 specification with support for content negotiation, error handling, pagination, and resource management. Use array-based encoding for simple cases, PHP attributes for automatic mapping, or custom schema classes for full control over complex resource structures.
