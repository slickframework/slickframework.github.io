---
layout: page
hide_hero: true
menubar_toc: true
toc_title: JSON API
title: JSON API
category: modules
---

# JSON API Module

The `slick/json-api` library implements the JSON:API 1.1 specification and a Slick module. It supports a wide range of features, including content negotiation, error handling, pagination, and resource operations like fetching, creating, updating, and deleting.

## What's {json:api}

The [JSON:API is a standardized specification](https://jsonapi.org/) for building APIs using JSON as the data format. It defines a consistent structure for requests and responses, making it easier for developers to interact with APIs in a predictable way. Key features of the JSON:API specification include resource-based data modeling, standardized error handling, and support for pagination, filtering, sorting, and relationship management between resources. By enforcing conventions for URL structures, HTTP methods, and response formats, JSON:API reduces duplication and streamlines the development of APIs, promoting efficiency and best practices.

## Installation
To integrate `slick/json-api` into your application, install it via Composer. After installation, enable the module to configure and prepare all required container dependencies.

```shell
composer require slick/json-api
```

```shell
bin/console enable json-api
```

## Document Encoder
A key feature of this library is converting data into a valid JSON:API response. To achieve this, the `DocumentEncoder` interface is used, which accepts mixed data and returns a properly formatted JSON:API string.

### Creating an Encoder
Follow this example to create a document encoder:

```php
use Slick\JSONAPI\Document\Converter\PHPJson;
use Slick\JSONAPI\Document\Encoder\DefaultEncoder;
use Slick\JSONAPI\Document\Factory\DefaultFactory;
use Slick\JSONAPI\JsonApi;
use Slick\JSONAPI\Object\SchemaDiscover\AttributeSchemaDiscover;

$discover = new AttributeSchemaDiscover();
$factory = new DefaultFactory($discover);
$converter = new PHPJson();

$encoder = new DefaultEncoder($discover, $factory, $converter);
```

Once set up, you can convert data into JSON:API formatted output:

```php
use Slick\JSONAPI\Object\Links;

// ...

$encoder
    ->withJsonapi(new JsonApi(JsonApi::JSON_API_11))
    ->withLinkPrefix("https://example.com")
;

echo $encoder->encode([
    "type" => "index",
    "meta" => [
        "description" => "Sample page"
    ],
    "links" => [
        Links::LINK_SELF => '/api'
    ]
]);
```

The response body should be as follows:

```json
{
    "jsonapi": {
        "version": "1.1"
    },
    "data": {
        "type": "index",
        "id": null,
        "links": {
            "self": "https://example.com/api"
        },
        "meta": {
            "description": "Sample page"
        }
    }
}
```

### Array Data
The simplest way to encode data as JSON:API is by using arrays. You can mirror the JSON:API structure by using array keys named according to the specification. Here's an example of creating a post using an array:

```php
$post = [
    "type" => "posts",
    "id" => 34,
    "attributes" => [
        "title" => "Example post",
        "body" => "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec rutrum, mi laoreet..."
    ]
];

echo $encoder->encode($post);
```

The resulting JSON will look like this:
```json
{
    "jsonapi": {
        "version": "1.1"
    },
    "data": {
        "type": "posts",
        "id": null,
        "attributes": {
            "title": "Example post",
            "body": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec rutrum, mi laoreet..."
        }
    }
}
```

Array data is ideal for simple data structures.

## Mapping with Attributes
Another way to encode data into JSON:API formatted output is by using attributes on classes that can later be encoded.

### #[AsResourceObject]

The `AsResourceObject` attribute signals to the encoder that instances of this class can be transformed into JSON:API output. This attribute serves as the primary marker for mapping objects to JSON:API format.

Here’s an example:

```php
use Slick\JSONAPI\Object\SchemaDiscover\Attributes\AsResourceObject;

#[AsResourceObject(type: "users")]
class User
{
    // ...
}
```

#### Properties

The following table outlines the key properties of the `AsResourceObject` attribute for configuring the JSON:API document output:

| Property             | Description                                                                                                                                             |
|----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`               | The document's data type. Optional. Can also be set using the `ResourceIdentifier` attribute.                                                            |
| `meta`               | Meta information to be included in the data section of the document. Optional.                                                                          |
| `links`              | A list of key/URL pairs for the document's data block. Optional.                                                                                        |
| `isCompound`         | If set to `true`, an `included` section will be added to the document containing data attributes of all related resources. Defaults to `false`.          |
| `generateIdentifier` | If set to `true`, a generated identifier will be used when the data lacks one. Defaults to `false`.                                                     |
| `documentMeta`       | Meta information for the document's meta block. Optional.                                                                                               |
| `documentLinks`      | Links for the document's links block. Optional.                                                                                                         |

The `meta`, `links`, `documentMeta`, and `documentLinks` properties can also accept a `string`, which should be the name of a method on the object being encoded, allowing dynamic values to be fetched.

### #[ResourceIdentifier]

The `ResourceIdentifier` attribute designates a specific property as the identifier for a resource document. If the resource type wasn't specified in the `AsResourceObject` class attribute, you can define it here.

#### Properties
Here are the key properties of the `ResourceIdentifier` attribute:

| Property    | Description                                                                                             |
|-------------|---------------------------------------------------------------------------------------------------------|
| `type`      | The resource type, typically the plural name of the entity you're mapping.                               |
| `className` | A fully qualified class name that will be instantiated with the value from the document's identifier.    |
| `required`  | If set to `true`, an error will be returned when converting a document to an object without this identifier. Defaults to `false`. |

### #[ResourceAttribute]

The `ResourceAttribute` marks a property as part of the `attributes` section of a resource. Scalar values will be displayed as is, and if the property is an object, it should implement the `JsonSerializable` interface or be a value object. In the case of a value object, it will be created using the `className` argument of the `ResourceAttribute` and passing the value as a unique constructor argument when decoding the resource.

#### Properties
Here is a list of key properties for the `ResourceAttribute`:

| Property    | Description                                                                                                                                                                     |
|-------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `name`      | The name of the resource attribute. If not set, the property name will be used.                                                                                                 |
| `className` | A fully qualified class name that will be instantiated with the value of the resource attribute.                                                                                |
| `required`  | If set to `true`, an error will be returned when converting a document to an object without this attribute. Defaults to `false`.                                                |
| `factory`   | A static method can be created to generate this property using the attribute value, useful when converting a document into an object.                                           |
| `getter`    | Specifies a getter method that will be called instead of directly accessing the property value.                                                                                 |
| `format`    | If the property value is an object with a `format()` method, the attribute value is retrieved by calling `class::format()` with the format provided in this argument.           |

### #[RelationshipIdentifier]
The `RelationshipIdentifier` attribute is used when converting a resource document to an object that holds a relationship identifier. For instance, a DTO object acting as a command to update a user's group would look like this:

```php
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

For a successful conversion, the resource document body should look like this:

```json
{
    "data": {
        "type": "users",
        "id": "3233",
        "relationships": {
            "group": {
                "data": {
                    "type": "groups",
                    "id": "21"
                }
            }
        }
    }
}
```

#### Properties
The `RelationshipIdentifier` properties are:

| Property    | Description                                                                                                                  |
|-------------|------------------------------------------------------------------------------------------------------------------------------|
| `name`      | The relationship name. If not set, the property name will be used.                                                           |
| `className` | A fully qualified class name that will be instantiated with the value from the relationship's identifier.                    |
| `type`      | The type attribute of the relationship. The relationship data type should match if this is set.                              |
| `required`  | If set to `true`, an error will be returned when converting a document to an object without this attribute. Defaults to `false`. |


### #[AsResourceCollection]

The `AsResourceCollection` attribute marks a class as a collection of resources. The class must implement `IteratorAggregate` or another PHP iterable interface. Each object in the iterable should have a schema attribute, such as `AsResourceObject`, to ensure it can be properly encoded as a JSON:API resource.

## Document Decoder
You can also decode a JSON:API resource document into an object. To achieve this, you just need to use the [attributes mapping](/modules/json-api.html#mapping-with-attributes) in the class you want to populate with the document's data and a `DocumentDecoder`. Here's how to create the decoder:

```php
use Slick\JSONAPI\Document\Decoder\DefaultDecoder;
use Slick\JSONAPI\Object\SchemaDiscover\AttributeSchemaDiscover;
use Slick\JSONAPI\Validator\SchemaValidator;

$discover = new AttributeSchemaDiscover();
$validator = new SchemaValidator();

$decoder = new DefaultDecoder($discover, $validator);
```

Now, let's revisit the DTO class we use as a command to update a user's group:

```php
#[AsResourceObject()]
final readonly class ChangeUserGroupCommand
{
    public function __construct(
        #[ResourceIdentifier(type: "users", required: true)]
        private string $userId,
        #[RelationshipIdentifier(name: "group", required: true, type: "groups")]
        private string $groupId
    ) {}

    public function userId(): string
    {
        return $this->userId;
    }

    public function groupId(): string
    {
        return $this->groupId;
    }
}
```

This is a straightforward class that contains the user ID and the group ID we want to set.

Consider the following HTTP message:

```text
PATCH /users/67006130a0463 HTTP/1.1
Host: example.com
Content-Type: application/vnd.api+json
Content-Length: 244

{
    "data": {
        "type": "users",
        "id": "67006130a0463",
        "relationships": {
            "group": {
                "data": {
                    "type": "groups",
                    "id": "670061edd6b0a"
                }
            }
        }
    }
}
```

{% include note.html type="info" content="
Ensure the `Content-Type` header is set to `application/vnd.api+json` for the message to be correctly parsed.
" %}

With everything in place, you can now read the request body (assuming PSR-7 HTTP server request) and create an instance of `ChangeUserGroupCommand` with its values:

```php
use Slick\Http\Message\Server\Request;
use Slick\JSONAPI\Document\HttpMessageParser;

$request = new Request();
$parser = new HttpMessageParser();

$document = $parser->parse($request);

$decoder->setRequestedDocument($document);

$command = $decoder->decodeTo(ChangeUserGroupCommand::class);
```

After this, `$command` will be an instance of `ChangeUserGroupCommand` with `userId` set to `"67006130a0463"` and `groupId` set to `"670061edd6b0a"`.

## Custom Schema Class
If you need more control over how JSON:API documents are encoded and decoded, you can create a custom `ResourceSchema` class. This allows you to tailor the data you expose or retrieve.

For example, let's consider a `User` entity class:

```php
namespace App\Domain;

use Slick\JSONAPI\Object\SchemaDiscover\Attributes\AsResourceObject;
use App\Infrastructure\JsonApi\UserSchema;

#[AsResourceObject(schemaClass: UserSchema::class)]
class User
{
    // User properties and methods...
}
```

In this case, the `User` class is marked as a JSON:API resource document that can be encoded or decoded. Instead of adding attributes directly, a schema class (`UserSchema`) is specified to handle the encoding/decoding logic.

To simplify the creation of schema classes, you can extend `AbstractResourceSchema` and define only the necessary methods. Here's an example schema class for the `User` entity:

```php
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

    /**
     * @inheritDoc
     * @param User $object
     */
    public function identifier($object): ?string
    {
        return (string) $object->accountId();
    }

    /**
     * @inheritDoc
     * @param User $object
     * @return array<string, mixed>|null
     */
    public function attributes($object): ?array
    {
        return [
            "name" => $object->name(),
            // Additional attributes...
        ];
    }

    /**
     * @inheritDoc
     * @param User $object
     * @return array<string, mixed>|null
     */
    public function relationships($object): ?array
    {
        return [
            "group" => [
                "data" => $object->group(),
                "links" => ['related' => true]
            ]
        ];
    }
}
```

By using a custom schema class, both the encoder and decoder can leverage the object instance to customize the JSON:API document's output and input, allowing for flexibility in handling complex resource structures.


## Conclusion

The `slick/json-api` module offers a robust and flexible implementation of the JSON:API 1.1 specification, supporting key features like content negotiation, error handling, pagination, and resource management (fetching, creation, updates, and deletion).

Its flexibility is further enhanced through custom schema classes, allowing users to tailor the way data is encoded and decoded. With features like array-based data encoding for simple use cases and the ability to map objects to JSON:API output using attributes, this module provides a highly adaptable solution.

Developers can easily handle complex resource relationships, attributes, and even collections through clear, well-defined schema definitions, while decoders and encoders simplify data conversion. This comprehensive suite of tools makes the module highly convenient for integrating JSON:API functionality into PHP applications, ensuring consistency and ease of use across various scenarios.

