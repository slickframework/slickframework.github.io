---
layout: page
hide_hero: true
menubar_toc: true
toc_title: Password hashing and validation
title: Password hashing and validation
---

# Password hashing and validation

Web applications require passwords as a fundamental element of their authentication processes to verify user identities and protect sensitive information. Passwords act as a secure key, ensuring that only authorized users can access the application and its data. By requiring users to provide a password, web applications can authenticate and authorize access, maintaining the integrity and security of the system. Proper password management, including hashing and secure storage, is essential to safeguard user credentials and prevent unauthorized access.

## Configuring a password hasher
Password hashers are pre-configured in the `Slick/Security` module and are ready to use as dependencies in your application. However, you can customize these settings and, if needed, create your own password hasher by implementing the [PasswordHasherInterface]().

### Create a custom password hasher
An example using PHP's `md5()` function:

```php
// src/Domain/Security/Md5PasswordHasher.php
namespace App\Domain\Security\Md5PasswordHasher;

use Slick\WebStack\Domain\Security\PasswordHasher\PasswordHasherInterface;
use SensitiveParameter;

final class Md5PasswordHasher implememts PasswordHasherInterface
{

    public function hash(#[SensitiveParameter] string $plainPassword): string
    {
        return md5($plainPassword);
    }

    public function verify(string $hashedPassword, #[SensitiveParameter] string $plainPassword): bool
    {
        return md5($plainPassword) === hashedPassword;
    }

    public function needsRehash(string $hashedPassword): bool
    {
        return false;
    }
}

```

### Existing password hashers
The dependency injection module, included in the base [Slick application template](/getting-started/), is preconfigured with the following password hashers:

[PhpPasswordHaser]()
: Utilizes PHP's built-in `password_` functions, supporting [Bcrypt](#bcrypt-password-hasher) and [Sodium](#sodium-password-hasher) algorithms.

[Pbkdf2PasswordHasher]()
: Hasher that implements the [PBKDF2 function](https://en.wikipedia.org/wiki/PBKDF2) for hashing.

[PlaitextPasswordHasher]()
: A dummy hasher intended for testing purposes only.

{% include note.html type="danger" content="
The `PlaintextPasswordHasher` should never be used in production environments. It does not hash passwords; instead, it returns them exactly as entered. This hasher is intended solely for testing and development purposes.
" %}

### Configuring an existing hasher
To change the settings of any of the above password hashers, you need to configure the dependency injection service using the class name of the hasher you want to customize. For example, to change the `$cost` of the `PhpPasswordHaser` and force the [Bcrypt algorithm](#bcrypt-password-hasher):

```php
// config/services/security.php
namespace Config\Services;

use Slick\WebStack\Domain\Security\PasswordHasher\Hasher\PhpPasswordHaser;

$services = [];

$services[PhpPasswordHaser::class] = function() {
    return new PhpPasswordHasher(cost: 18, algorithm: PASSWORD_BCRYPT);
};

return $services;

```

Now, whenever we inject the `PhpPasswordHasher` as a dependency, it will use the configuration we set in the services file.

```php
// ...
public function handle(PhpPasswordHaser $hasher): void
{
    $pass = $hasher->hash('some-plain-text');
    // ...
}
```
### Changing the default password hasher

A more elegant way to change the password hasher for the entire application is to set a service using the generic [PasswordHasherInterface]() as the entry for the desired password hasher.

```php
// config/services/security.php
namespace Config\Services;

use Slick\WebStack\Domain\Security\PasswordHasher\Hasher\PhpPasswordHaser;
use Slick\WebStack\Domain\Security\PasswordHasher\PasswordHasherInterface;

$services = [];

$services[PasswordHasherInterface::class] = '@password.hasher'; // -> uses hasher alias

$services[PhpPasswordHaser::class] = '@password.hasher'; // -> creates an alias for the hasher
$services['password.hasher'] = function() {
    return new PhpPasswordHasher(cost: 18, algorithm: PASSWORD_BCRYPT);
};

return $services;

```
Now, we can use the interface as a dependency, which is always a good practice.
```php
// ...
public function handle(PasswordHasherInterface $hasher): void
{
    $pass = $hasher->hash('some-plain-text');
    // ...
}
```

{% include note.html type="info" content="
By utilizing the `PasswordHasherInterface` as a dependency in your classes, you adhere to the Dependency Inversion Principle (the \"D\" in SOLID principles), enhancing the maintainability of your code!
" %}

## Dealing with passwords

### Create a new password
Creating passwords typically occurs when users register or change their passwords. In a web application, these operations are usually handled by a controller or command handler.
Simply add the `PasswordHasherInterface` as a dependency to the controller function or constructor responsible for managing these operations:

```php
// src/UserInterface/User/RegisterController.php
namespace App\UserInterface\User;

use Psr\Http\Message\ResponseInterface;
use Slick\WebStack\Controller;
use Slick\WebStack\Domain\Security\PasswordHasher\PasswordHasherInterface;

final class RegisterController extends Controller
{
    public function handle(PasswordHasherInterface $hasher): ResponseInterface
    {
        // ... e.g. get the user data from a registration form
        $plaintextPassword = $this->context->postParam('password');
        $hashedPassword = $hasher->hash($plaintextPassword);

        $user = new User(..., ..., $hashedPassword);
        // ...
    }
}
```

### Checking a password
During login or password change processes, it's essential to verify if a user's password matches the stored hash. To achieve this, add the `PasswordHasherInterface` as a dependency to the controller function or constructor responsible for these operations:

```php
// src/UserInterface/User/ChangePasswordController.php
namespace App\UserInterface\User;

use App\UserInterface\Exceptions\BadRequestException;
use Psr\Http\Message\ResponseInterface;
use Slick\WebStack\Controller;
use Slick\WebStack\Domain\Security\PasswordHasher\PasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

final class ChangePasswordController extends Controller
{

    #[Route(path: '/profile/{userId}/change-password', name: 'change-password')]
    public function handle(string $userId, PasswordHasherInterface $hasher): ResponseInterface
    {
        $user = $this->retrieveUser($userId);
        
        // ... e.g. get the user data from a change password form
        $validPassword = $hasher->verify(
            $user->password(),
            $this->context->postParam('current_password')
        );

        if (!validPassword) {
            throw new BadRequestException(status: 401, message: "Current password is invalid.");
        }

        // code to change user's password
        // ...
    }
}
```

### Update password hash
PHP can verify whether a given password hash conforms to the specified algorithm and options. If it does not, it is assumed that the hash needs to be rehashed. `PhpPasswordHasher::class` uses PHP's [password_needs_rehash()](https://www.php.net/manual/en/function.password-needs-rehash.php)function to determine if the hash is up-to-date or needs rehashing.

In order to have user password's hash update you need to implement `PasswordUpgradableInterface` like this:

```PHP
// src/Domain/User.php
namespace App\Domain;

use Slick\WebStack\Domain\Security\UserInterface;
use Slick\WebStack\Domain\Security\User\PasswordUpgradableInterface;

class User implements UserInterface, PasswordUpgradableInterface
{
    private string $password;

    public function __construct(
        private string $email;
        private string $name;
    ) {
        ...
    }

    // ... all user code here

    /**
     * Updates user's hashed password
     */
    public function upgradePassword(string $hashedPassword): self
    {
        $this->passord = $hashedPassword;
        return $this;
    }
}
```

Now, whenever the hashed password needs to be updated, the user will be notified.

{% include note.html type="warning" content="
Remember to persist the changes in the `User` object so that the new hashed password can be used for the next login.
" %}


## Supported Algorithms

### Bcrypt Password Hasher
The bcrypt password hashing function generates hashed passwords that include an automatically generated [cryptographic salt](https://en.wikipedia.org/wiki/Salt_(cryptography)). This means you don’t have to manage the salt yourself.

The only configuration option for bcrypt is the cost, an integer between 4 and 31 (default is 13). Each increment of the cost doubles the time required to hash a password. The hashed passwords are 60 characters long.

You can change the cost at any time, even if some passwords are already hashed with a different cost. New passwords will be hashed with the updated cost, while existing passwords will be validated using the cost that was in effect when they were originally hashed.

This is the default algorithm if the PHP was not compiled with Argon2 support.
Use the `PhpPasswordHasher::class` in your security profile configuration.

### Sodium Password Hasher
It uses the [Argon2 key derivation function](https://en.wikipedia.org/wiki/Argon2). Hashed passwords are 96 characters long. However, this length might change in the future due to evolving hashing requirements, so ensure you allocate enough space for them to be stored. Additionally, passwords include an automatically generated [cryptographic salt](https://en.wikipedia.org/wiki/Salt_(cryptography)), so you don’t have to manage it yourself.

This become the default algorithm when the PHP was compiled with Argon2 support. Argon2 support was introduced in PHP 7.2 by bundling the libsodium extension. Use the `PhpPasswordHasher::class` in your security profile configuration.

### PBKDF2 Hasher
Using the [PBKDF2](https://en.wikipedia.org/wiki/PBKDF2) hasher is no longer recommended now that PHP supports Sodium and Bcrypt. Legacy applications still using PBKDF2 are encouraged to upgrade to these newer hashing algorithms.

 Use the `Pbkdf2PasswordHasher::class` in your security profile configuration.