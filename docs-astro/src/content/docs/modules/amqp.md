---
title: AMQP Messaging
description: Integrate RabbitMQ with the Slick AMQP module for producers, consumers, and exchange types.
---

# AMQP Messaging Module

## Introduction to the Slick AMQP Module

The Slick AMQP module provides a seamless integration with Advanced Message Queuing Protocol (AMQP) brokers, such as RabbitMQ, allowing developers to easily create consumers and producers for various exchange types, including:

* **Fanout**: broadcasting messages to all bound queues
* **Direct**: routing messages to queues based on a routing key
* **Headers**: routing messages to queues based on header attributes
* **Topic**: routing messages to queues based on a routing key pattern

Although this module is designed to integrate seamlessly with the Slick PHP framework, it can also be used as a standalone library in any PHP project.

### AMQP: Messaging for Microservices

The Advanced Message Queuing Protocol (AMQP) is a standardized messaging protocol that facilitates communication between different components of a distributed system. Producers send messages to a message broker (such as RabbitMQ), which routes the messages to the intended consumers.

**Common use cases:**

* **Microservices Architecture**: enable communication between services
* **Background Tasks**: offload image processing, email sending, or data aggregation
* **Real-time Data Processing**: stream real-time data between services
* **IoT Messaging**: enable communication between IoT devices and the cloud

## Install

```shell
composer require slick/amqp
```

```shell
bin/console enable amqp
```

## AMQP Configuration

When you enable the module for the first time, a `config/modules/amqp.php` file is automatically generated. Configure the connection in your `.env` file:

- `AMQP_SERVER`: The AMQP broker's host (default: `localhost`)
- `AMQP_PORT`: The port to connect to the broker (default: `5672`)
- `AMQP_USER`: The username for broker authentication (default: `guest`)
- `AMQP_PASSWORD`: The password for broker authentication (default: `guest`)

## Basic Queue

Sending and receiving messages through a queue is useful for image processing, email sending, data aggregation, and real-time updates.

### Sending a Message

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Message;
use Slick\Amqp\Producer\BasicProducer;

$connection = new AMQPStreamConnection('0.0.0.0', 5672, 'user', 'secret');
$producer = new class($connection) extends BasicProducer {};

$message = new Message('Hello World!!');
$producer->publish($message, 'hello');
```

### Receiving a Message

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Consumer\BasicConsumer;
use Slick\Amqp\Message;

$connection = new AMQPStreamConnection('0.0.0.0', 5672, 'user', 'secret');

$consumer = new class($connection) extends BasicConsumer {
    public function __construct($connection)
    {
        $this->queue = 'hello';
        parent::__construct($connection);
    }
};

$callback = function (Message $msg) {
    echo ' [x] Received ', $msg->parsedBody(), "\n";
};

echo " [*] Waiting for messages. To exit press CTRL+C\n";
$consumer->consume($callback);
```

### Extending BasicProducer and BasicConsumer

Extend the base classes to add custom functionality:

```php
<?php
declare(strict_types=1);

use Slick\Amqp\Message;
use Slick\Amqp\Producer\BasicProducer;

class MyProducer extends BasicProducer
{
    public function publish(Message $message, string $queue): void
    {
        $message->set(Message::CONTENT_TYPE, 'application/json');
        $message->set('priority', 1);
        parent::publish($message, $queue);
    }
}
```

## Work Queues

Work Queues (Task Queues) defer resource-intensive tasks by encapsulating them as messages and distributing them among multiple workers.

### Sending Tasks

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Message;
use Slick\Amqp\Producer\BasicProducer;

$connection = new AMQPStreamConnection('0.0.0.0', 5672, 'guest', 'guest');
$producer = new class ($connection) extends BasicProducer {};

$data = implode(' ', array_slice($argv, 1));
if (empty($data)) {
    $data = "Hello World!";
}

$message = new Message(
    $data,
    [Message::DELIVERY_MODE => Message::DELIVERY_MODE_PERSISTENT]
);

$producer->publish($message, 'task_queue');
echo ' [x] Sent ', $data, "\n";
```

### Processing Tasks

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Consumer\BasicConsumer;
use Slick\Amqp\Message;

$connection = new AMQPStreamConnection('0.0.0.0', 5672, 'guest', 'guest');
$worker = new class($connection, 'task_queue') extends BasicConsumer {
    public function __construct(AMQPStreamConnection $connection, string $name)
    {
        $this->queue = $name;
        parent::__construct($connection);
        $this->options[self::OPT_DURABLE] = true;
        $this->consumeOptions[self::CONSUME_OPT_NO_ACK] = false;
    }

    protected function declareQueue(): void
    {
        parent::declareQueue();
        $this->channel()->basic_qos(0, 1, null);
    }
};

$callback = function (Message $message) use ($worker) {
    echo ' [x] Received ', $message->parsedBody(), "\n";
    sleep(substr_count($message->parsedBody(), '.'));
    $worker->acknowledge($message);
    echo " [x] Done\n";
};

$worker->consume($callback);
```

## Publish/Subscribe

Publish/Subscribe messaging broadcasts messages to multiple subscribers through an exchange. Unlike simple queuing, multiple consumers receive the same message simultaneously.

### Fanout Exchange

Fanout exchanges broadcast messages to all queues bound to the exchange.

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Producer\FanOutProducer;

final class LogsProducer extends FanOutProducer
{
    public function __construct(AMQPStreamConnection $connection, string $name)
    {
        $this->exchange = $name;
        parent::__construct($connection);
    }
}
```

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Consumer\FanOutConsumer;

final class LogsConsumer extends FanOutConsumer
{
    public function __construct(AMQPStreamConnection $connection, string $name)
    {
        $this->exchange = $name;
        parent::__construct($connection);
        $this->options[self::OPT_EXCLUSIVE] = true;
        $this->options[self::OPT_AUTO_DELETE] = false;
    }
}
```

**Producer usage:**

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Message;

$connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
$producer = new LogsProducer($connection, 'logs');

$message = new Message('This is a log message!');
$producer->publish($message);
echo " [x] Sent: This is a log message!\n";
```

**Consumer usage** — call `bind()` before consuming:

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;

$connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
$consumer = new LogsConsumer($connection, 'logs');

$consumer->bind(); // Establish binding between exchange and queue

$consumer->consume(function ($message) {
    echo " [x] Received: {$message->parsedBody()}\n";
});
```

### Direct Exchange

Direct exchanges route messages to queues based on an exact match between the message's routing key and the binding key.

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Producer\DirectProducer;

final class LogsDirectProducer extends DirectProducer
{
    public function __construct(AMQPStreamConnection $connection, string $name)
    {
        $this->exchange = $name;
        parent::__construct($connection);
        $this->options[self::OPT_AUTO_DELETE] = false;
    }
}
```

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Consumer\DirectConsumer;

final class LogsDirectConsumer extends DirectConsumer
{
    public function __construct(AMQPStreamConnection $connection, string $name)
    {
        $this->exchange = $name;
        parent::__construct($connection);
        $this->exchangeOptions[self::OPT_AUTO_DELETE] = false;
        $this->options[self::OPT_AUTO_DELETE] = false;
        $this->options[self::OPT_EXCLUSIVE] = true;
    }
}
```

**Consumer usage** — call `bind($routingKey)` before consuming:

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;

$connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
$consumer = new LogsDirectConsumer($connection, 'direct_logs');

$routingKey = $argv[1] ?? 'info';
$consumer->bind($routingKey);

$consumer->consume(function ($message) {
    echo " [x] Received: {$message->parsedBody()}\n";
});
```

### Topic Exchange

Topic exchanges route messages based on wildcard matching of routing keys (`*` matches one word, `#` matches zero or more words).

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Producer;
use Slick\Amqp\Producer\TopicProducer;

final class AnimalsProducer extends TopicProducer implements Producer
{
    public function __construct(AMQPStreamConnection $connection, string $name)
    {
        $this->exchange = $name;
        parent::__construct($connection);
        $this->mergeOptions([self::OPT_AUTO_DELETE => false]);
    }
}
```

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Consumer;
use Slick\Amqp\Consumer\TopicConsumer;

final class AnimalsConsumer extends TopicConsumer implements Consumer
{
    public function __construct(AMQPStreamConnection $connection, string $name)
    {
        $this->exchange = $name;
        parent::__construct($connection);
        $this->exchangeOptions[self::OPT_AUTO_DELETE] = false;
        $this->mergeOptions([
            self::OPT_AUTO_DELETE => false,
            self::OPT_EXCLUSIVE => true,
        ]);
    }
}
```

**Consumer usage** — bind with a pattern before consuming:

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;

$connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
$consumer = new AnimalsConsumer($connection, 'animal_topics');

$pattern = $argv[1] ?? 'animal.*';
$consumer->bind($pattern);

$consumer->consume(function ($message) {
    echo " [x] Received: {$message->parsedBody()}\n";
});
```

### Header Exchange

Header exchanges route messages based on key-value pairs in message headers.

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Producer;
use Slick\Amqp\Producer\HeadersProducer;

final class NotificationsProducer extends HeadersProducer implements Producer
{
    public function __construct(AMQPStreamConnection $connection, string $exchangeName)
    {
        $this->exchange = $exchangeName;
        parent::__construct($connection);
    }
}
```

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Consumer;
use Slick\Amqp\Consumer\HeadersConsumer;

final class NotificationsConsumer extends HeadersConsumer implements Consumer
{
    public function __construct(AMQPStreamConnection $connection, string $exchangeName)
    {
        $this->exchange = $exchangeName;
        parent::__construct($connection);
    }
}
```

**Publishing with headers:**

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Message;

$connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
$producer = new NotificationsProducer($connection, 'notifications_headers');

$message = (new Message("High-priority email for US region"))
    ->withHeaders([
        'type' => 'email',
        'priority' => 'high',
        'region' => 'US',
    ]);

$producer->publish($message);
```

**Consuming with header bindings** — use `bindHeaders()` with `"all"` (all headers must match) or `"any"` (any header can match):

```php
<?php
declare(strict_types=1);

use PhpAmqpLib\Connection\AMQPStreamConnection;

$connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
$consumer = new NotificationsConsumer($connection, 'notifications_headers');

$consumer->bindHeaders([
    'type' => 'email',
    'priority' => 'high',
    'region' => 'US',
], 'all');

$consumer->consume(function ($message) {
    echo " [x] Received: {$message->parsedBody()}\n";
});
```
