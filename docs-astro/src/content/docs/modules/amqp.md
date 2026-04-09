---
title: AMQP Messaging
description: Integrate RabbitMQ into Slick applications using producers and consumers for all four AMQP exchange types.
sidebar:
  order: 6
---

The `slick/amqp` module provides producers and consumers for RabbitMQ over the AMQP protocol. It supports all four exchange types — Fanout, Direct, Topic, and Headers — with a consistent abstract class API for each.

## Installation

```bash
composer require slick/amqp
bin/console enable amqp
```

## Configuration

Add the connection settings to your `.env` file:

```dotenv
AMQP_SERVER=localhost
AMQP_PORT=5672
AMQP_USER=guest
AMQP_PASSWORD=guest
```

When running inside Slick, `AMQPStreamConnection` is registered in the DI container automatically. Inject it directly into your producers and consumers — no manual instantiation needed.

## The Message class

`Message` is the central value object for both sending and receiving. It wraps an AMQP message body with typed accessors for all standard AMQP properties.

```php
use Slick\Amqp\Message;

// Create a message
$message = new Message('Hello, world!');

// Create from a JsonSerializable DTO — content_type is set automatically
$message = new Message($myDto);  // content_type: application/json

// Create from a Stringable object — content_type: text/plain
$message = new Message($stringableObject);
```

:::tip
When the body implements `JsonSerializable`, the constructor serialises it to JSON and sets `content_type: application/json` automatically. You do not need to serialise manually.
:::

### Reading message data

```php
$message->body();          // raw body (pre-parse)
$message->parsedBody();    // decoded JSON or raw string
$message->routingKey();    // routing key the broker used
$message->exchange();      // exchange that routed this message
$message->isRedelivered(); // true if the broker redelivered this message
$message->deliveryTag();   // delivery tag (used by acknowledge())
$message->channel();       // AMQPChannel this message arrived on
```

### AMQP properties

Read and write any standard AMQP property using the `Message::*` constants:

```php
use Slick\Amqp\Message;

// Set properties
$message = new Message($body, [
    Message::DELIVERY_MODE => Message::DELIVERY_MODE_PERSISTENT,
    Message::CONTENT_TYPE  => 'application/json',
    Message::CORRELATION_ID => $correlationId,
    Message::REPLY_TO       => 'reply-queue',
    Message::MESSAGE_ID     => uniqid(),
    Message::EXPIRATION     => '60000',  // milliseconds
]);

// Read/write at runtime
$message->get(Message::CORRELATION_ID);
$message->set(Message::USER_ID, 'guest');
$message->has(Message::REPLY_TO);
```

Available constants: `DELIVERY_MODE`, `DELIVERY_MODE_PERSISTENT`, `DELIVERY_MODE_TRANSIENT`, `CONTENT_TYPE`, `CONTENT_ENCODING`, `TYPE`, `MESSAGE_ID`, `CORRELATION_ID`, `REPLY_TO`, `EXPIRATION`, `TIMESTAMP`, `USER_ID`, `APP_ID`, `HEADERS`.

### Message headers

```php
$message = (new Message($body))
    ->withHeader('x-source', 'api')
    ->withHeader('x-version', '2')
    ->withHeaders(['x-tenant' => 'acme', 'x-locale' => 'pt'])
;

$message->headers();                    // all headers as array
$message->withoutHeader('x-version');  // remove a single header
```

## Producers

All producers extend `BasicProducer` and implement the `Producer` interface. The only method you call is `publish()`.

### Default options

| Option | Default | Description |
|--------|---------|-------------|
| `OPT_PASSIVE` | `false` | Declare passively (do not create) |
| `OPT_DURABLE` | `false` | Survive broker restart |
| `OPT_AUTO_DELETE` | `true` | Delete when last consumer disconnects |
| `OPT_INTERNAL` | `false` | Receive only from other exchanges, not producers |

:::caution
`OPT_AUTO_DELETE` defaults to `true`. Exchanges and queues are deleted when the last consumer disconnects unless you explicitly set it to `false`.
:::

### Fanout producer

Broadcasts to all bound queues — no routing key needed.

```php
use Slick\Amqp\Producer\FanOutProducer;

final class NotificationsProducer extends FanOutProducer
{
    protected string $exchange = 'notifications';

    public function __construct(AMQPStreamConnection $connection)
    {
        $this->mergeOptions([
            self::OPT_DURABLE     => true,
            self::OPT_AUTO_DELETE => false,
        ]);
        parent::__construct($connection);
    }
}

// Usage
$producer->publish(new Message($event));
```

### Direct producer

Routes messages to queues bound with a matching routing key.

```php
use Slick\Amqp\Producer\DirectProducer;

final class OrdersProducer extends DirectProducer
{
    protected string $exchange = 'orders';

    public function __construct(AMQPStreamConnection $connection)
    {
        $this->mergeOptions([self::OPT_DURABLE => true, self::OPT_AUTO_DELETE => false]);
        parent::__construct($connection);
    }
}

// Usage
$producer->publish(new Message($order), 'order.created');
```

### Topic producer

Routes by pattern matching on the routing key. `*` matches one word, `#` matches zero or more words.

```php
use Slick\Amqp\Producer\TopicProducer;

// TopicProducer is concrete — no need to extend it
$producer = new TopicProducer($connection);
$producer->publish(new Message($log), 'app.error.critical');
```

### Headers producer

Routes by message header values instead of routing keys.

```php
use Slick\Amqp\Producer\HeadersProducer;

final class AuditProducer extends HeadersProducer
{
    protected string $exchange = 'audit';
}

// Usage
$message = (new Message($event))
    ->withHeader('type', 'login')
    ->withHeader('region', 'eu')
;
$producer->publish($message);
```

## Consumers

All consumers extend `BasicConsumer` and implement the `Consumer` interface. The core methods are `bind()` and `consume()`.

### Default options

| Option | Default | Description |
|--------|---------|-------------|
| `OPT_PASSIVE` | `false` | Declare passively |
| `OPT_DURABLE` | `false` | Survive broker restart |
| `OPT_EXCLUSIVE` | `false` | Exclusive to this connection |
| `OPT_AUTO_DELETE` | `true` | Delete when consumer disconnects |
| `CONSUME_OPT_NO_ACK` | `true` | Auto-acknowledge messages |

### Fanout consumer

```php
use Slick\Amqp\Consumer\FanOutConsumer;

final class NotificationsConsumer extends FanOutConsumer
{
    protected string $exchange = 'notifications';
    protected string $queue    = 'notifications.handler';

    public function __construct(AMQPStreamConnection $connection)
    {
        $this->mergeOptions([
            self::OPT_DURABLE     => true,
            self::OPT_AUTO_DELETE => false,
        ]);
        parent::__construct($connection);
    }
}

$consumer->bind();
$consumer->consume(function (Message $message) use ($consumer) {
    // handle message
    $consumer->acknowledge($message);
});
```

### Direct consumer

Bind with the routing key to filter messages.

```php
use Slick\Amqp\Consumer\DirectConsumer;

final class OrderCreatedConsumer extends DirectConsumer
{
    protected string $exchange = 'orders';
    protected string $queue    = 'orders.created';
}

$consumer->bind('order.created');
$consumer->consume(function (Message $message) use ($consumer) {
    $consumer->acknowledge($message);
});
```

### Topic consumer

Bind with a pattern — `*` matches one word, `#` matches zero or more.

```php
use Slick\Amqp\Consumer\TopicConsumer;

final class ErrorLogConsumer extends TopicConsumer
{
    protected string $exchange = 'logs';
    protected string $queue    = 'logs.errors';
}

$consumer->bind('app.error.#');   // matches app.error, app.error.critical, etc.
$consumer->consume(function (Message $message) use ($consumer) {
    $key = $message->routingKey(); // inspect which key triggered this
    $consumer->acknowledge($message);
});
```

### Headers consumer

Bind by header values. Use `HeadersConsumer::X_MATCH_ALL` (all headers must match) or `HeadersConsumer::X_MATCH_ANY` (any header must match).

```php
use Slick\Amqp\Consumer\HeadersConsumer;

final class EuLoginConsumer extends HeadersConsumer
{
    protected string $exchange = 'audit';
    protected string $queue    = 'audit.eu.login';
}

$consumer->bindHeaders(
    ['type' => 'login', 'region' => 'eu'],
    HeadersConsumer::X_MATCH_ALL   // default — all headers must match
);

$consumer->consume(function (Message $message) use ($consumer) {
    $consumer->acknowledge($message);
});
```

## Manual acknowledgement

By default, `CONSUME_OPT_NO_ACK` is `true` — messages are acknowledged automatically. For reliable processing, disable auto-ack and acknowledge explicitly:

```php
final class ReliableConsumer extends DirectConsumer
{
    protected string $exchange = 'orders';
    protected string $queue    = 'orders.reliable';

    public function __construct(AMQPStreamConnection $connection)
    {
        $this->mergeOptions([
            self::OPT_DURABLE          => true,
            self::OPT_AUTO_DELETE      => false,
            self::CONSUME_OPT_NO_ACK   => false,  // require manual ack
        ]);
        parent::__construct($connection);
    }
}

$consumer->bind('order.created');
$consumer->consume(function (Message $message) use ($consumer) {
    try {
        $this->handler->handle($message->parsedBody());
        $consumer->acknowledge($message);
    } catch (\Throwable $e) {
        // do not acknowledge — broker will redeliver
    }
});
```

:::tip
Always call `mergeOptions()` **before** `parent::__construct()`. The parent constructor calls `mergeOptions()` internally to lock in defaults — options set after construction are applied only because exchange/queue declaration is deferred, but the ordering dependency is not guaranteed across versions.
:::

## Consumer interface reference

```php
// Queue declaration options
$consumer->isPassive(): bool
$consumer->isDurable(): bool
$consumer->isExclusive(): bool
$consumer->isAutoDelete(): bool
$consumer->options(): array
$consumer->exchangeOptions(): array

// Binding and consuming
$consumer->bind(?string $routingKey = ''): mixed  // null = no routing key
$consumer->consume(callable $callable, array $options = []): void
$consumer->acknowledge(Message $message): void
```

The second parameter of `consume()` accepts per-call option overrides for the consume operation.

## Producer interface reference

```php
$producer->publish(Message $message, ?string $routingKey = ''): void
$producer->isPassive(): bool
$producer->isDurable(): bool
$producer->isAutoDelete(): bool
$producer->options(): array
```

Producer type constants (for reference): `Producer::TYPE_DIRECT`, `TYPE_FANOUT`, `TYPE_TOPIC`, `TYPE_HEADERS`, `TYPE_DEFAULT`.
