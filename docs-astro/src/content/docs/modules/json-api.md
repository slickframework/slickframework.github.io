---
title: JSON API
description: Build JSON:API 1.1 compliant services with automatic request parsing, resource encoding, and structured error responses.
sidebar:
  order: 5
---

The `slick/json-api` module implements the [JSON:API 1.1 specification](https://jsonapi.org/format/1.1). It handles content negotiation, resource encoding and decoding, structured error responses, and sparse fieldsets — integrated as a Slick module with automatic middleware registration.

## Installation

```bash
composer require slick/json-api
bin/console enable json-api
```

Enabling the module registers two things automatically: the `JsonApiParserMiddleware` in the HTTP stack and the encoder/decoder services in the DI container.

## How it works

Every incoming request with `Content-Type: application/vnd.api+json` is automatically parsed by `JsonApiParserMiddleware` before it reaches your controller. The parsed document is available via the DI container as a `Document` instance.

Outgoing responses are built by encoding your domain objects through `DocumentEncoder`, which maps them to valid JSON:API output using PHP attribute annotations or custom schema classes.

## Encoding responses

### Creating an encoder

```php
use Slick\JSONAPI\Document\Converter\PHPJson;
use Slick\JSONAPI\Document\Encoder\DefaultEncoder;
use Slick\JSONAPI\Document\Factory\DefaultFactory;
use Slick\JSONAPI\JsonApi;
use Slick\JSONAPI\Object\SchemaDiscover\AttributeSchemaDiscover;

$discover  = new AttributeSchemaDiscover();
$factory   = new DefaultFactory($discover);
$converter = new PHPJson();

$encoder = new DefaultEncoder($discover, $factory, $converter);
```

When the module is enabled, `DefaultEncoder` is wired into the container — you can inject `DocumentEncoder` directly into your controllers.

### Encoder options

```php
$encoder
    ->withJsonapi(new JsonApi(JsonApi::JSON_API_11))   // set spec version
    ->withLinkPrefix('https://example.com')            // prefix all links
    ->withMeta(new Meta(['count' => 42]))               // document-level meta
    ->withLinks(new Links([...]))                       // document-level links
    ->withDocumentMeta(new Meta([...]))                 // meta on the data block
    ->withDocumentLinks(new Links([...]))               // links on the data block
    ->withSparseFields($sparseFields)                  // field filtering
;

echo $encoder->encode($resource);
```

### Encoding from arrays

The simplest approach — mirror the JSON:API structure with array keys:

```php
echo $encoder->encode([
    'type'       => 'articles',
    'id'         => 42,
    'attributes' => [
        'title' => 'My article',
        'body'  => 'Lorem ipsum...',
    ],
]);
```

## Mapping objects with attributes

Annotate your classes with PHP 8 attributes and the encoder handles the rest.

### `#[AsResourceObject]`

Marks a class as a JSON:API resource. All parameters are optional.

```php
use Slick\JSONAPI\Object\SchemaDiscover\Attributes\AsResourceObject;

#[AsResourceObject(
    type: 'articles',
    isCompound: true,        // include related resources in `included`
    generateIdentifier: true // generate an id if none is present
)]
class Article
{
    // ...
}
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `?string` | `null` | Resource type. Can also be set via `#[ResourceIdentifier]` |
| `meta` | `array\|string\|null` | `null` | Meta for the data block. String = method name |
| `links` | `array\|string\|null` | `null` | Links for the data block. String = method name |
| `schemaClass` | `?string` | `null` | Use a custom `ResourceSchema` class instead of attribute scanning |
| `isCompound` | `bool` | `false` | Add an `included` section with related resources |
| `generateIdentifier` | `bool` | `true` | Generate an id when none is present |
| `documentMeta` | `array\|string\|null` | `null` | Meta for the document root |
| `documentLinks` | `array\|string\|null` | `null` | Links for the document root |

### `#[ResourceIdentifier]`

Designates a property as the resource id.

```php
#[ResourceIdentifier(type: 'articles', required: true)]
private string $articleId;
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `?string` | `null` | Resource type |
| `className` | `?string` | `null` | Class to instantiate when decoding |
| `required` | `bool` | `false` | Fail validation if absent |

### `#[ResourceAttribute]`

Maps a property to the `attributes` section.

```php
#[ResourceAttribute(name: 'published-at', format: 'Y-m-d')]
private DateTimeImmutable $publishedAt;
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `?string` | property name | Attribute name in the JSON output |
| `className` | `?string` | `null` | Class or enum to instantiate when decoding |
| `required` | `bool` | `false` | Fail validation if absent |
| `factory` | `?string` | `null` | Static method to call when decoding |
| `getter` | `?string` | `null` | Method to call instead of reading the property directly |
| `format` | `?string` | `null` | Calls `$value->format($format)` on encoding |

### `#[Relationship]`

Maps a property to the `relationships` section.

```php
#[Relationship(type: Relationship::TO_ONE, name: 'author')]
private Author $author;
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `string` | `TO_ONE` | `Relationship::TO_ONE` or `Relationship::TO_MANY` |
| `name` | `?string` | property name | Relationship name in the JSON output |
| `links` | `?array` | `null` | Links for this relationship |
| `meta` | `?array` | `null` | Meta for this relationship |

### `#[AsResourceCollection]`

Marks a class as a collection of resources. The class must implement `IteratorAggregate` or another iterable interface.

```php
#[AsResourceCollection]
class ArticleCollection implements IteratorAggregate
{
    // each item must have its own #[AsResourceObject]
}
```

## Decoding requests

### Creating a decoder

```php
use Slick\JSONAPI\Document\Decoder\DefaultDecoder;
use Slick\JSONAPI\Object\SchemaDiscover\AttributeSchemaDiscover;
use Slick\JSONAPI\Validator\SchemaValidator;

$discover = new AttributeSchemaDiscover();
$validator = new SchemaValidator();
$decoder = new DefaultDecoder($discover, $validator);
```

### `#[RelationshipIdentifier]`

Maps a relationship in an incoming document to a property.

```php
#[AsResourceObject]
final readonly class ChangeUserGroupCommand
{
    public function __construct(
        #[ResourceIdentifier(type: 'users', required: true)]
        private string $userId,

        #[RelationshipIdentifier(name: 'group', type: 'groups', required: true)]
        private string $groupId,
    ) {}
}
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | — | Relationship name in the document |
| `className` | `?string` | `null` | Class to instantiate with the relationship id |
| `type` | `?string` | `null` | Expected relationship type |
| `required` | `bool` | `false` | Fail validation if absent |

### Decoding an incoming request

```php
use Slick\JSONAPI\Document\HttpMessageParser;

$parser   = new HttpMessageParser();
$document = $parser->parse($request);          // PSR-7 ServerRequestInterface

$decoder->setRequestedDocument($document);
$command = $decoder->decodeTo(ChangeUserGroupCommand::class);
```

The request `Content-Type` must be `application/vnd.api+json`.

## Custom schema classes

When you need more control than PHP attributes allow, implement `ResourceSchema` directly or extend `AbstractResourceSchema`:

```php
use Slick\JSONAPI\Object\AbstractResourceSchema;
use Slick\JSONAPI\Object\ResourceSchema;

final class ArticleSchema extends AbstractResourceSchema implements ResourceSchema
{
    public function type($object): string
    {
        return 'articles';
    }

    public function identifier($object): ?string
    {
        return (string) $object->articleId();
    }

    public function attributes($object): ?array
    {
        return [
            'title'        => $object->title(),
            'published-at' => $object->publishedAt()->format('Y-m-d'),
        ];
    }

    public function relationships($object): ?array
    {
        return [
            'author' => ['data' => $object->author()],
        ];
    }

    public function links($object): ?array { return null; }
    public function meta($object): ?array  { return null; }
}
```

Wire the schema to the class via `schemaClass`:

```php
#[AsResourceObject(schemaClass: ArticleSchema::class)]
class Article { ... }
```

`AbstractResourceSchema` also provides a `from()` method for decoding and a `validate()` hook.

## Error responses

The module provides a structured API for building JSON:API error documents.

```php
use Slick\JSONAPI\Object\ErrorObject;
use Slick\JSONAPI\Object\ErrorObject\ErrorSource;
use Slick\JSONAPI\Document\ErrorDocument;
use Slick\JSONAPI\Object\ResourceCollection;

$error = new ErrorObject(
    title:  'Validation failed',
    detail: 'The email field is required.',
    status: '422',
    source: new ErrorSource(pointer: '/data/attributes/email'),
);

$error = $error
    ->withCode('VALIDATION_001')
    ->withIdentifier('err-abc123')
;

$errorDocument = new ErrorDocument(
    new ResourceCollection([$error])
);

echo $encoder->encode($errorDocument);
```

`ErrorSource` accepts `pointer` (a JSON Pointer to the offending field) or `parameter` (a query parameter name).

### Automatic error handling

`JsonApiErrorHandler` converts unhandled exceptions into JSON:API error responses automatically. It is registered in the HTTP stack when the module is enabled — you do not need to wire it manually.

## Sparse fieldsets

The `SparseFields` class implements the JSON:API [sparse fieldsets](https://jsonapi.org/format/#fetching-sparse-fieldsets) feature. It reads `fields[type]` query parameters from the request and filters which attributes are included in the response.

```php
use Slick\JSONAPI\Document\Factory\SparseFields;

$sparseFields = new SparseFields($request);  // reads ?fields[articles]=title,body

$sparseFields->hasFields();                          // bool
$sparseFields->fieldsFor('articles');                // ['title', 'body'] or null
$sparseFields->filterFields('articles', $allFields); // returns only requested fields
$sparseFields->includeResource('articles');          // bool
$sparseFields->includeField('title', 'articles');    // bool
```

Pass it to the encoder:

```php
$encoder->withSparseFields($sparseFields)->encode($resource);
```

## Document types

The encoder produces different document shapes depending on what you pass to `encode()`:

| Input | Output document type |
|-------|----------------------|
| Object with `#[AsResourceObject]` | `ResourceDocument` |
| Object with `#[AsResourceObject]` + `isCompound: true` | `ResourceCompoundDocument` (includes `included`) |
| Array with only `meta` key | `MetaDocument` |
| `ErrorDocument` instance | Error document with `errors` array |

### Paginated list example

A common pattern — a collection with pagination meta and navigation links:

```php
use Slick\JSONAPI\Object\Links;
use Slick\JSONAPI\Object\Meta;

echo $encoder
    ->withMeta(new Meta([
        'total'   => 248,
        'page'    => 3,
        'perPage' => 25,
    ]))
    ->withLinks(new Links([
        Links::LINK_SELF  => '/api/articles?page=3',
        Links::LINK_FIRST => '/api/articles?page=1',
        Links::LINK_PREV  => '/api/articles?page=2',
        Links::LINK_NEXT  => '/api/articles?page=4',
        Links::LINK_LAST  => '/api/articles?page=10',
    ]))
    ->encode($articleCollection)
;
```

This produces:

```json
{
  "jsonapi": { "version": "1.1" },
  "meta": { "total": 248, "page": 3, "perPage": 25 },
  "links": {
    "self":  "/api/articles?page=3",
    "first": "/api/articles?page=1",
    "prev":  "/api/articles?page=2",
    "next":  "/api/articles?page=4",
    "last":  "/api/articles?page=10"
  },
  "data": [ ... ]
}
```

:::tip
To also filter which fields are returned, chain `withSparseFields()` — see [Sparse fieldsets](#sparse-fieldsets).
:::

## Exception reference

All exceptions are in the `Slick\JSONAPI\Exception` namespace:

| Exception | When thrown |
|-----------|-------------|
| `FailedValidation` | Schema validation failed on decode |
| `InvalidResourceDocument` | Document structure is invalid |
| `InvalidMemberName` | A member name violates JSON:API naming rules |
| `InvalidResourceProperty` | A resource property is invalid |
| `DocumentEncoderFailure` | Encoder could not produce output |
| `InvalidObjectCreation` | Object could not be instantiated during decode |
| `SpecificationViolation` | A JSON:API spec rule was violated |
| `UnsupportedJsonApiVersion` | Document uses an unsupported spec version |
| `UnsupportedFeature` | A requested feature is not implemented |
| `MissingDependency` | A required service is not available |
| `UnknownValidator` | An unknown validator was requested |
