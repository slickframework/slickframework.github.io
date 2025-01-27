---
layout: page
hide_hero: true
menubar_toc: true
toc_title: AMQP Messaging
title: AMQP Messaging
category: modules
---

# AMQP Messaging Module

## Introduction to the Slick AMQP Module  

The Slick AMQP module provides a seamless integration with Advanced Message Queuing Protocol (AMQP) brokers, such as RabbitMQ, allowing developers to easily create consumers and producers for various exchange types, including:

* **Fanout**: broadcasting messages to all bound queues
* **Direct**: routing messages to queues based on a routing key
* **Headers**: routing messages to queues based on header attributes
* **Topic**: routing messages to queues based on a routing key pattern

This module enables efficient and scalable message queuing, making it ideal for distributed systems, microservices architecture, and real-time data processing applications. With the Slick AMQP module, you can easily exchange messages between different components of your system, ensuring reliable and fault-tolerant communication.

Although this module is designed to integrate seamlessly with the Slick PHP framework, providing special features for easy configuration and enablement, it can also be used as a standalone library in any PHP project. This makes it a versatile and flexible solution for any developer looking to leverage the power of AMQP messaging in their application.

Whether you're building a Slick framework application or a custom PHP project, the Slick AMQP module provides a robust and reliable way to integrate with AMQP brokers, making it easy to decouple components, scale your system, and improve overall performance.

### AMQP: Messaging for Microservices

**Introduction to AMQP Protocol**

The Advanced Message Queuing Protocol (AMQP) is a standardized messaging protocol that facilitates communication between different components of a distributed system. It enables producers to send messages to a message broker, such as RabbitMQ, which then routes the messages to the intended consumers. AMQP is designed to provide a reliable, efficient, and scalable messaging system, making it an ideal choice for a wide range of applications.

**Applicable Scenarios**

AMQP is particularly useful in scenarios where loose coupling and scalability are essential. Some of the most common use cases for AMQP include:

* **Microservices Architecture**: In a microservices-based system, AMQP can be used to enable communication between different services. For example, a web service can produce a message to a RabbitMQ exchange, which is then consumed by a worker service responsible for processing the task.
* **Background Tasks**: AMQP can be used to offload background tasks, such as image processing, email sending, or data aggregation, from the main application flow. This allows for improved responsiveness and fault tolerance.
* **Real-time Data Processing**: AMQP can be used to stream real-time data from one service to another, enabling applications such as live updates, analytics, and monitoring.
* **IoT Messaging**: AMQP can be used to enable communication between IoT devices and the cloud, or between different IoT devices.

**RabbitMQ and Microservices**

RabbitMQ is a popular message broker that implements the AMQP protocol. In a microservices environment, RabbitMQ can be used to enable communication between different services. For example, a web service can produce a message to a RabbitMQ exchange, which is then consumed by a worker service responsible for processing the task. This decoupling enables each service to operate independently, with the message broker providing a buffer against failures and overload.

**Benefits of Using AMQP**

The use of AMQP in a microservices environment provides several benefits, including:

* **Loose Coupling**: Services are decoupled from each other, allowing for greater flexibility and scalability.
* **Fault Tolerance**: The message broker provides a buffer against failures and overload, ensuring that messages are not lost in case of a failure.
* **Improved Responsiveness**: Background tasks can be offloaded from the main application flow, improving responsiveness and reducing latency.
* **Scalability**: AMQP enables scalable messaging, allowing for the handling of large volumes of messages.

In summary, AMQP is a powerful protocol that enables efficient and reliable communication between different components of a distributed system. Its use in a microservices environment, with a message broker like RabbitMQ, provides a scalable and fault-tolerant messaging system that can handle a wide range of applications, from background tasks to real-time data processing.

## Install
To use `Slick/Amqp` in your application, you need to install it via Composer. To complete the module setup, you also need to enable it. This ensures that all necessary files and configurations are properly set up.

```shell
composer require slick/amqp
```

```shell
bin/console enable amqp
```
## AMQP configuration
When you enable the module for the first time, a `config/modules/amqp.php` file is automatically generated with the basic settings needed to start working with AMQP stream connection. This includes configuring an `AMQPStreamConnection` as a dependency, ready to be injected into your services.

### Configuring Connection Settings

The Slick AMQP module uses connection settings defined in the `.env` file for convenience and flexibility. The following keys are supported in the `.env` file:

- `AMQP_SERVER`: The AMQP broker's host (default: `localhost`).
- `AMQP_PORT`: The port to connect to the broker (default: `5672`).
- `AMQP_USER`: The username for broker authentication (default: `guest`).
- `AMQP_PASSWORD`: The password for broker authentication (default: `guest`).

Although the module configuration file (`/config/modules/amqp.php`) contains an array of default settings with keys matching those in the `.env` file, it is recommended to use the `.env` file to customize these settings. This approach provides better separation of configuration and code, making it easier to manage settings across different environments.

If the `.env` file does not exist when the module is enabled, it will be automatically created for you, ensuring you have a starting point for configuring your AMQP connection.

## Basic Queue

This section provides a basic example of sending and receiving messages using the Slick AMQP module and RabbitMQ through a queue.

Sending and receiving messages through a queue is a useful approach in various scenarios, such as image processing, email sending, data aggregation, task scheduling, and real-time updates.

In the diagram below, "P" is our producer and "C" is our consumer. The box in the middle is a queue - a message buffer that RabbitMQ keeps on behalf of the consumer.

![Queue diagram.](/assets/img/amqp/queue.png "Queue diagram")

---

#### Prerequisites

* RabbitMQ server installed and running
* Slick AMQP module installed and configured
* A queue created in RabbitMQ (e.g. "hello")

### Sending a Message

To send a message to a RabbitMQ queue, you can use the following code:
```php
use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Message;
use Slick\Amqp\Producer\BasicProducer;

// Create a new AMQP connection
$connection = new AMQPStreamConnection('0.0.0.0', 5672, 'user', 'secret');

// Create a new producer
$producer = new class($connection) extends BasicProducer {};

// Create a new message
$message = new Message('Hello World!!');

// Publish the message to the queue
$producer->publish($message, 'hello');
```
This code creates a new AMQP connection, a new producer, and a new message. It then publishes the message to the "hello" queue.

The `Slick\Amqp\Producer\BasicProducer` class is a basic implementation of a message producer. It provides a simple way to publish messages to a RabbitMQ queue. You can extend this class to add custom functionality, such as setting message properties or handling publish errors.

### Receiving a Message

To receive a message from a RabbitMQ queue, you can use the following code:
```php
use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Consumer\BasicConsumer;
use Slick\Amqp\Message;

// Create a new AMQP connection
$connection = new AMQPStreamConnection('0.0.0.0', 5672, 'user', 'secret');

// Create a new consumer
$consumer = new class($connection) extends BasicConsumer {
    public function __construct($connection)
    {
        $this->queue =  'hello';
        parent::__construct($connection);
    }
};

// Define a callback to handle incoming messages
$callback = function (Message $msg) {
    echo ' [x] Received ', $msg->parsedBody(), "\n";
};

// Start consuming messages from the queue
echo " [*] Waiting for messages. To exit press CTRL+C\n";
$consumer->consume($callback);
```
This code creates a new AMQP connection, a new consumer, and defines a callback to handle incoming messages. It then starts consuming messages from the "hello" queue and prints the received messages to the console.

The `Slick\Amqp\Consumer\BasicConsumer` class is a basic implementation of a message consumer. It provides a simple way to consume messages from a RabbitMQ queue. You can extend this class to add custom functionality, such as handling message acknowledgments or setting consumer properties. The `consume` method takes a callback function as an argument, which is called for each incoming message.

#### Notes

* Make sure to replace the `0.0.0.0`, `5672`, `user`, and `secret` placeholders with your actual RabbitMQ server credentials and queue name.
* This example uses the `BasicProducer` and `BasicConsumer` classes provided by the Slick AMQP module to send and receive messages, respectively.
* The `publish` method is used to send messages to the queue, and the `consume` method is used to receive messages from the queue.
* The `parsedBody` method is used to parse the message body and print it to the console.

### Basic Producer/Consumer

You can extend the `BasicProducer` and `BasicConsumer` classes to add custom functionality to your message producers and consumers. For example, you can add methods to set message properties, handle publish errors, or implement custom message routing logic.

Here is an example of how you can extend the `BasicProducer` class to set message properties:
```php
use Slick\Amqp\Producer\BasicProducer;

class MyProducer extends BasicProducer
{
    public function publish(Message $message, string $queue)
    {
        // Set message properties
        $message->set(Message::CONTENT_TYPE, 'application/json');
        $message->set('priority', 1);

        // Call the parent publish method
        parent::publish($message, $queue);
    }
}
```
Similarly, you can extend the `BasicConsumer` class to implement custom message handling logic:
```php
use Slick\Amqp\Consumer\BasicConsumer;

class MyConsumer extends BasicConsumer
{
    public function consume(callable $callback, array $options = [])
    {
        // Call the parent consume method
        parent::consume($callback, $options);

        // Implement custom message handling logic
        // ...
    }
}
```
By extending the `BasicProducer` and `BasicConsumer` classes, you can create custom message producers and consumers that meet the specific needs of your application.

## Work Queues

The main concept of Work Queues, also known as Task Queues, is to defer resource-intensive tasks and schedule them for later execution. This is achieved by encapsulating tasks as messages and sending them to a queue, where they are retrieved and executed by a worker process running in the background. By running multiple workers, tasks are distributed among them, allowing for efficient and scalable processing.


![Work queues diagram.](/assets/img/amqp/work-queues.png "Work queues diagram")

This concept is particularly beneficial in web applications, where complex tasks cannot be completed within the brief timeframe of an HTTP request, allowing them to be offloaded and processed asynchronously.

---

### Sending Tasks to the Queue

Create a file `new_task.php` to publish tasks (messages) to the `task_queue`.

```php
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
    [
        Message::DELIVERY_MODE => Message::DELIVERY_MODE_PERSISTENT
    ]
);

$producer->publish($message, 'task_queue');

echo ' [x] Sent ', $data, "\n";
```

- The producer connects to RabbitMQ and sends tasks to the `task_queue`.
- Messages are persistent to ensure they survive broker restarts.

---

### Processing Tasks from the Queue

Create a file `worker.php` to process tasks from the `task_queue`.

```php
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

- The consumer connects to RabbitMQ and listens for tasks on the `task_queue`.
- The queue is durable, and acknowledgment ensures tasks are not lost in case of worker failure.
- `basic_qos(0, 1, null)` ensures tasks are distributed fairly among multiple workers.

---

#### **How It Works**
1. Run `worker.php` to start consuming tasks:
   ```shell
   php worker.php
   ```
2. Send tasks using `new_task.php`:
   ```shell
   php new_task.php "Task with a single dot."
   $ php new_task.php "Task with three dots..."
   ```
3. The worker processes tasks and simulates workload by sleeping for a number of seconds equal to the dots in the task description.

---

This setup demonstrates how to use Slick AMQP for implementing work queues in a RabbitMQ environment, enabling efficient task handling and distribution.

## Publish/Subscribe

Publish/Subscribe (Pub/Sub) messaging is a communication pattern where messages are not sent directly to specific queues but are instead broadcast to multiple subscribers through an exchange. Unlike simple message queueing, where a message typically goes to a single consumer, Pub/Sub allows multiple consumers to receive the same message simultaneously. This is achieved by binding multiple queues to an exchange, often of the `fanout` type, ensuring all subscribers receive the broadcasted messages. This pattern is ideal for scenarios like event notifications or real-time updates, where multiple systems or users need to react to the same information.

### Exchange

An **Exchange** is a core component of the RabbitMQ messaging model that acts as a router between producers and queues. Producers never send messages directly to a queue; instead, they send messages to an exchange. The exchange then determines how to route those messages based on its type and the rules defined in its bindings.

Exchanges can route messages to one or more queues, or even discard them, depending on the routing logic. The primary exchange types in RabbitMQ include:

- **Direct:** Routes messages to queues with an exact matching routing key.
- **Fanout:** Broadcasts messages to all queues bound to the exchange, regardless of the routing key.
- **Topic:** Routes messages to queues based on pattern matching of the routing key.
- **Headers:** Uses message header attributes for routing instead of the routing key.

This design makes exchanges highly flexible and allows for advanced messaging patterns, such as Publish/Subscribe, where multiple consumers can process the same message, or fine-grained routing for specific queues.

![Exchange diagram.](/assets/img/amqp/exhange.png "Exchange diagram")

### Bindings

In the Publish/Subscribe (Pub/Sub) messaging model, **bindings** connect an exchange to one or more queues, defining how messages are routed. When a producer sends a message to an exchange, the exchange uses its bindings to determine which queues should receive it. For example, in a fanout exchange, messages are sent to all bound queues, enabling multiple consumers to process the same message. Bindings allow for flexible message distribution, ensuring messages reach the appropriate queues based on rules like routing keys or headers.

### Fanout Exchange

In the context of Publish/Subscribe messaging, fanout exchanges allow messages from a producer to be broadcast to all queues bound to the exchange, enabling multiple consumers to process the same message simultaneously. The following example demonstrates how to create a fanout exchange producer and consumer using the Slick AMQP library.

---

#### Creating a Fanout Producer and Consumer

1. **LogsProducer**  
   The `LogsProducer` class extends `FanOutProducer`, simplifying the creation of a producer that sends messages to a fanout exchange. It requires an `AMQPStreamConnection` and an exchange name to initialize.

   ```php
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

2. **LogsConsumer**  
   The `LogsConsumer` class extends `FanOutConsumer`, providing a streamlined way to set up a consumer that listens to messages from a fanout exchange. It automatically binds to a generated queue exclusive to the consumer.

   ```php
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

---

#### Example Usage

1. **Producing Messages**  
   The producer sends log messages to a `logs` exchange, which will be broadcast to all consumers bound to it.

   ```php
   require_once 'LogsProducer.php';
   use PhpAmqpLib\Connection\AMQPStreamConnection;
   use Slick\Amqp\Message;

   $connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
   $producer = new LogsProducer($connection, 'logs');

   $messageBody = 'This is a log message!';
   $message = new Message($messageBody);
   $producer->publish($message);

   echo " [x] Sent: {$messageBody}\n";
   ```

2. **Consuming Messages**  
   Each consumer will create its own exclusive queue and listen for messages broadcast by the `logs` exchange.

   **Important Note:** After creating the `LogsConsumer`, make sure to call `$consumer->bind()` to establish the binding between the exchange and the queue on the RabbitMQ server. Without this step, the consumer will not receive messages.

   ```php
   require_once 'LogsConsumer.php';
   use PhpAmqpLib\Connection\AMQPStreamConnection;

   $connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
   $consumer = new LogsConsumer($connection, 'logs');

   $consumer->bind(); // Establish binding between exchange and queue

   $consumer->consume(function ($message) {
       echo " [x] Received: {$message->parsedBody()}\n";
   });
   ```

---

#### Running the Example

- Start one or more consumers by running the `LogsConsumer` script:
  ```shell
  php LogsConsumer.php
  ```

- Send a message using the `LogsProducer` script:
  ```shell
  php LogsProducer.php
  ```

---

#### Output Example

Each consumer will display the received message:
```shell
 [x] Received: This is a log message!
```

### Direct Exchange

In the Publish/Subscribe context, a direct exchange allows messages to be routed to queues based on an exact match between a message's routing key and the binding key of the queue. This is useful when specific consumers should process specific messages.

Below, we demonstrate how to create a direct exchange consumer and producer using Slick AMQP’s abstractions, leveraging RabbitMQ.

---

#### Creating a Direct Producer and Consumer

1. **LogsDirectProducer**  
   The `LogsDirectProducer` class extends `DirectProducer` to facilitate sending messages to a direct exchange. It requires an `AMQPStreamConnection` and the exchange name.

   ```php
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

2. **LogsDirectConsumer**  
   The `LogsDirectConsumer` class extends `DirectConsumer`, making it easy to set up a consumer that listens for messages from a direct exchange. It ensures the exchange and queue persist across consumer instances.

   ```php
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

---

#### Example Usage

1. **Producing Messages**  
   The producer sends messages to the `direct_logs` exchange with a routing key that determines which queues should receive the message.

   ```php
   require_once 'LogsDirectProducer.php';
   use PhpAmqpLib\Connection\AMQPStreamConnection;
   use Slick\Amqp\Message;

   $connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
   $producer = new LogsDirectProducer($connection, 'direct_logs');

   $severity = $argv[1] ?? 'info'; // Routing key
   $messageBody = $argv[2] ?? 'Default log message';

   $message = new Message($messageBody);
   $producer->publish($message, $severity);

   echo " [x] Sent: {$severity} - {$messageBody}\n";
   ```

2. **Consuming Messages**  
   Each consumer listens to messages with specific routing keys.

   **Important Note:** After creating the `LogsDirectConsumer`, call `$consumer->bind($routingKey)` to establish the binding between the exchange and the queue for the specified routing key.

   ```php
   require_once 'LogsDirectConsumer.php';
   use PhpAmqpLib\Connection\AMQPStreamConnection;

   $connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
   $consumer = new LogsDirectConsumer($connection, 'direct_logs');

   $routingKey = $argv[1] ?? 'info';
   $consumer->bind($routingKey); // Bind the queue to the exchange with the routing key

   $consumer->consume(function ($message) {
       echo " [x] Received: {$message->parsedBody()}\n";
   });
   ```

---

#### Running the Example

1. Start one or more consumers with specific routing keys:
   ```shell
   php receive_logs.php error
   $ php receive_logs.php warning
   ```

2. Send messages with routing keys using the producer:
   ```shell
   php emit_log.php error "Error log message"
   $ php emit_log.php warning "Warning log message"
   ```

---

#### Output Example

Each consumer receives messages matching their routing key:

For the **error** consumer:
```shell
 [x] Received: Error log message
```

For the **warning** consumer:
```shell
 [x] Received: Warning log message
```


### Topic Exchange

Topic exchanges in RabbitMQ allow routing messages based on wildcard matching of routing keys. This is particularly useful in Publish/Subscribe systems where consumers need to receive messages for specific patterns or categories. Below, we demonstrate how to use Slick AMQP’s abstractions to create a topic consumer and producer.

---

#### Creating a Topic Producer and Consumer

1. **AnimalsProducer**  
   The `AnimalsProducer` class extends `TopicProducer`, allowing messages to be published to a topic exchange. It requires an `AMQPStreamConnection` and the exchange name.

   ```php
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

2. **AnimalsConsumer**  
   The `AnimalsConsumer` class extends `TopicConsumer`, making it easy to bind queues to specific routing key patterns for a topic exchange. It supports durable exchanges and exclusive queues.

   ```php
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
               self::OPT_EXCLUSIVE => true
           ]);
       }
   }
   ```

---

#### Example Usage

1. **Producing Messages**  
   The producer sends messages to the `animal_topics` exchange with routing keys that indicate the type of animal or specific categories.

   ```php
   require_once 'AnimalsProducer.php';
   use PhpAmqpLib\Connection\AMQPStreamConnection;
   use Slick\Amqp\Message;

   $connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
   $producer = new AnimalsProducer($connection, 'animal_topics');

   $routingKey = $argv[1] ?? 'animal.unknown';
   $messageBody = $argv[2] ?? 'Default animal message';

   $message = new Message($messageBody);
   $producer->publish($message, $routingKey);

   echo " [x] Sent: {$routingKey} - {$messageBody}\n";
   ```

2. **Consuming Messages**  
   Consumers listen to specific patterns in the routing key. For example:
   - `animal.*` matches any message related to animals.
   - `animal.mammal.*` matches messages about specific mammal categories.

   **Important Note:** After creating the `AnimalsConsumer`, call `$consumer->bind($pattern)` to establish the binding between the exchange and the queue for the given pattern.

   ```php
   require_once 'AnimalsConsumer.php';
   use PhpAmqpLib\Connection\AMQPStreamConnection;

   $connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
   $consumer = new AnimalsConsumer($connection, 'animal_topics');

   $pattern = $argv[1] ?? 'animal.*';
   $consumer->bind($pattern); // Bind the queue to the exchange with the given pattern

   $consumer->consume(function ($message) {
       echo " [x] Received: {$message->parsedBody()}\n";
   });
   ```

---

#### Running the Example

1. Start consumers with specific patterns:
   ```shell
   php receive.php "animal.mammal.*"
   $ php receive.php "animal.bird.*"
   ```

2. Send messages with routing keys using the producer:
   ```shell
   php send.php "animal.mammal.lion" "Lion message"
   $ php send.php "animal.bird.parrot" "Parrot message"
   ```

---

#### Output Example

Each consumer receives messages matching its pattern:

For the **`animal.mammal.*`** consumer:
```shell
 [x] Received: Lion message
```

For the **`animal.bird.*`** consumer:
```shell
 [x] Received: Parrot message
```

### Header Exchange

The **header type exchange** allows routing messages based on key-value pairs in the message headers. Using Slick AMQP, you can easily set up producers and consumers for this exchange type, leveraging the `HeadersProducer` and `HeadersConsumer` abstract classes. Below, we describe the setup for a **multi-criteria notification system** that demonstrates the use of headers-based routing in a Publish/Subscribe (Pub/Sub) context.

---

#### **Implementation**

#### **1. Header-Based Producer**

The `NotificationsProducer` class defines a producer that attaches custom headers to messages. These headers determine which consumers will receive the messages.

```php
use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Producer;
use Slick\Amqp\Producer\HeadersProducer;

/**
 * NotificationsProducer
 *
 * @package Integration\Slick\Amqp\Headers
 */
final class NotificationsProducer extends HeadersProducer implements Producer
{
    public function __construct(AMQPStreamConnection $connection, string $exchangeName)
    {
        $this->exchange = $exchangeName;
        parent::__construct($connection);
    }
}
```

---

#### **2. Header-Based Consumer**

The `NotificationsConsumer` class defines a consumer that binds to specific headers using the `bindHeaders` method. This method accepts:

1. A key-value pair of headers.
2. An optional `x-match` header that specifies how the binding rules are applied:
   - `"all"`: All headers must match (default).
   - `"any"`: Any one of the headers can match.

```php
use PhpAmqpLib\Connection\AMQPStreamConnection;
use Slick\Amqp\Consumer;
use Slick\Amqp\Consumer\HeadersConsumer;

/**
 * NotificationsConsumer
 *
 * @package Integration\Slick\Amqp\Headers
 */
final class NotificationsConsumer extends HeadersConsumer implements Consumer
{
    public function __construct(AMQPStreamConnection $connection, string $exchangeName)
    {
        $this->exchange = $exchangeName;
        parent::__construct($connection);
    }
}
```

---

#### **Example: Multi-Criteria Notification System**

#### **Producer Code**

Send notifications with specific headers to demonstrate headers-based routing.

```php
require_once 'vendor/autoload.php';
use PhpAmqpLib\Connection\AMQPStreamConnection;

$connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
$producer = new NotificationsProducer($connection, 'notifications_headers');

$message1 = (new \Slick\Amqp\Message("High-priority email for US region"))
    ->withHeaders([
        'type' => 'email',
        'priority' => 'high',
        'region' => 'US',
    ]);

$message2 = (new \Slick\Amqp\Message("Low-priority SMS for EU region"))
    ->withHeaders([
        'type' => 'sms',
        'priority' => 'low',
        'region' => 'EU',
    ]);

$producer->publish($message1);
$producer->publish($message2);

echo "Messages published.\n";
```

---

#### **Consumer Code**

Consume messages based on specific header bindings.

```php
require_once 'vendor/autoload.php';
use PhpAmqpLib\Connection\AMQPStreamConnection;

$connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
$consumer = new NotificationsConsumer($connection, 'notifications_headers');

// Bind headers to receive only high-priority emails for the US region.
$consumer->bindHeaders([
    'type' => 'email',
    'priority' => 'high',
    'region' => 'US',
], 'all');

$consumer->consume(function ($message) {
    echo " [x] Received: {$message->parsedBody()}\n";
});
```

---

#### **Execution Steps**

1. **Start the Consumer**:
   ```shell
   php receive.php
   ```

2. **Run the Producer**:
   ```shell
   php send.php
   ```

---

#### **Expected Output**

For the consumer bound to high-priority emails in the US, the output will be:
```shell
 [x] Received: High-priority email for US region
```

Messages not matching the consumer's header criteria (e.g., low-priority SMS for the EU) will not be received.

---

#### **Why Use Headers Exchange?**

The headers exchange provides unmatched flexibility for routing messages in systems requiring multi-criteria filtering. This is especially useful in complex notification systems where consumers have overlapping or specific interests. The above example showcases how Slick AMQP simplifies integrating this advanced RabbitMQ feature.