---
layout: page
hide_hero: true
menubar_toc: true
toc_title: Authentication & authorization
title: Authentication & authorization
---

# Authentication & authorization

The security module in `Slick` empowers you to seamlessly set up both _Authentication_ and _Authorization_ in your application. Implementing these concepts can be complex and system-dependent. Basic HTTP authentication, for instance, is a straightforward process involving a header in the response message. In contrast, OAUTH2 authentication entails more advanced concepts such as tokens, scopes, clients, and various authentication modes.

Fortunately, this module, included in the base [Slick application template](/getting-started/), simplifies the process, making it easier for you to implement robust authentication and authorization in your application.

## Enabeling security module
By default, the `security` module is not enabled in the [Slick application template](/getting-started/) from the [Getting started](/getting-started/) section, so you will need to enable it. To do so, run the following command:

```shell
bin/console enable security
```

The expected output should be:

{% include console-output.html content='
![Console output when enabling security module.](/assets/img/console-outputs/enable-security.png "Enable security module")
' %}

{% include note.html type="info" content="
`Slick` is a modular framework, with almost every feature implemented as a module. To learn more about modules, please visit the [ Module System documentation page](/documentation/modules.html).
" %}

## Defining a 'User'
Permissions are always associated with a user object. To secure your application, you need to create a user class that implements
the [UserInterface]. This user class is often a an entity, but you can also use another "user" class.

We will need to create a user object with the following class definition:
```php
// src/Domain/User.php
namespace App\Domain;

use Slick\WebStack\Domain\Security\UserInterface;

class User implements UserInterface
{
    private \DatetimeImmutable $createdOn;

    public function __construct(
        private string $email;
        private string $name;
    ) {
        $this->createdOn = new \DatetimeImmutable();
    }

    /**
     * User interface implementation.
     * Returns the user identifier as a string. If other object is used (e.g. value-object)
     * it SHOULD be converted to a string.
     */
    public function userIdentifier(): string
    {
        return $this->email;
    }

    /**
     * User interface implementation.
     * Returns the roles granted to the user.
     */
    public function roles(): array
    {
        return ['ROLE_USER'];
    }

    public function email(): string
    {
        return $this->email;
    }

    public function name(): string
    {
        return $this->name();
    }
}
```


### User identifier

To retrieve a `UserInterface` from your data source, you need a `UserIdentifierInterface`. _Slick_ uses this interface to fetch user data before performing any authentication tasks.

In the example below, we use [doctrine/orm](https://www.doctrine-project.org/)'s `EntityManagerInterface` to handle user retrieval:

```php
// src/Infrastructure/Doctrine/UserRepository.php
namespace App\Infrastructure\Doctrine;

use App\Domain\User;
use Doctrine\ORM\EntityManagerInterface;
use Slick\WebStack\Domain\Security\User\UserProviderInterface;

final class UserRepository implements UserProviderInterface
{

    public function __construct(private readonly EntityManagerInterface $entityManager)
    {}

    // ...

    /**
     * Retrieves a user by it's email address.
     *
     * UserProviderInterface implementation.
     */
    public function loadUserByIdentifier(string $identifier): UserInterface
    {
        $repo = $this->entityManager->getRepository(User::class);
        $user = $repo->findOneBy(['email' => $identifier]);
        if ($user instanceof User) {
            return $user;
        }

        throw new \RuntimeException("User not found...");
    }
}

```
The main goal here is to retrieve a user object that implements `UserInterface` by providing an `$identifier`, which is typically the username or the user's email address.

### Password hashing

Web applications rely on passwords as a primary means of authenticating users and ensuring secure access to their systems.
Passwords are essential, however, storing passwords in plain text poses a significant security risk, as it makes them vulnerable to theft and misuse if the database is compromised.

To mitigate this risk, passwords need to be hashed using strong, one-way cryptographic algorithms before being stored.
This practice is crucial for safeguarding user credentials and maintaining the integrity and security of the web application.

The  `Slick`'s security module provides password hashing and verification functionality.

First, make sure your User class implements the `PasswordAuthenticatedUserInterface`:

```php
// src/Domain/User.php
namespace App\Domain;

use Slick\WebStack\Domain\Security\User\PasswordAuthenticatedUserInterface;

// PasswordAuthenticatedUserInterface extends UserInterface
class User implements PasswordAuthenticatedUserInterface
{
    public function __construct(
        private string $email;
        private string $name;
        private string $password;  // -> new property to store the password hash
    ) {
        // ...construct
    }

    // ...

    /**
     * PasswordAuthenticatedUserInterface implementation
     * Returns the hashed password used to authenticate the user.
     */ 
    public function password(): string
    {
        return $this->password;
    }
}
```

You can use dependency injection to pass a `PasswordHasherInterface` as an argument when you need to hash a plain text password.

let's create a controller that will register (create) a user with it's password:

```php
// src/UserInterface/User/RegisterController.php
namespace App\UserInterface\User\RegisterController;

use Psr\Http\Message\ResponseInterface;
use Slick\WebStack\Domain\Security\PasswordHasher\PasswordHasherInterface;

final class RegisterController
{
    public function handle(PasswordHasherInterface $hasher): ResponseInterface
    {
        // ... e.g. get the user data from a registration form
        $plaintextPassword = ...;
        $hashedPassword = $hasher->hash($plaintextPassword);

        $user = new User(..., ..., $hashedPassword);
        // ...
    }
}
```

You can also manually hash a password by running:

```shell
php bin/console security:hash-password
```


{% include note.html type="info" content="
 ``Slic/Security`` offers various options for configuring the password hashing mechanism. For detailed information on all available options and configurations, please refer to the [Password Hashing and Verification](/documentation/security/password-hashing.html).
" %}


## Configure security profiles


A security file defines a collection of authenticators and configuration options that enable you to set up the desired authentication and authorization processes.

Profiles are applied when a specified path matches a regular expression associated with that profile. For example, consider the following configuration:

```php
// config/security.php
namespace Config;

use App\Infrastructure\Doctrine\DoctrineUserRepository;

return [
    "profiles" => [
        "dev" => [
            "pattern" => "/^\/(css|images|js|favicon\.ico)\/?(.*)/i",
            "secured" => false
        ],
        "main" => [
            "pattern" => "/^(.*)/i",
            "userProvider" => DoctrineUserRepository::class,
            "authenticators" => [
                "httpBasicAuth" => [
                    'realm' => 'Restricted'
                ]
            ],
            "stateless" => true
        ]
    ]
    "enabled" => true
];
```

In this example, two profiles are configured: 

- **`dev`**: Allows all static site assets to bypass authentication.
- **`main`**: Forces all requests to go through a list of `authenticators` (in this case, only the `httpBasicAuth` authenticator is used).

Each profile can have its own distinct authentication and authorization processes, along with custom configurations for user repositories, password hashing, and state storage behavior.

### Profile properties

The following properties can be used to define a security profile:


| Property         | Description                                                                                                                                                                                                                                 |
|------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `pattern`        | A regular expression used to match the request URL path, determining which profile to apply.                                                                                                                                                |
| `userProvider`   | The name of the class implementing the `UserProviderInterface` that will be used to locate the user.                                                                                                                                       |
| `passwordHasher` | Specifies the password hashing mechanism. This is optional, and if not set, the default `PhpPasswordHasher::class` will be used. For more details, refer to the [password hashing and verification](/documentation/security/password-hashing.html) page. |
| `authenticators` | A list of authenticators applicable for the profile.                                                                                                                                                                                        |
| `stateless`      | A boolean flag indicating whether authentication credentials should be stored in a PHP session and reused while the session remains active.                                                                                               |


### Stateless profiles
When handling authentication, it's common to save authentication tokens in the session, allowing the authentication data to be reused within the same session or while the session remains active.

The `stateless` profile property indicates whether the security system should store the authentication token in the session. For example, if you're using a profile that validates an API access token, this property should be set to `true`.

## Authenticators
An authenticator is an object that manages the authentication process. For instance, a login form authenticator handles an HTTP POST request with `username` and password `data`, verifies the user's existence, and checks if the password matches. If successful, it generates an authentication token that is used by the authentication and authorization components in your application.

The `slick/security` module offers a variety of authenticators to help you set up your authentication process using common methods. You also have the flexibility to implement custom authenticators. Additionally, you can combine multiple authenticators within a single profile.

### HTTP Basic authentication
Basic HTTP authentication is a simple authentication method that requires a user to provide a username and password, which are encoded in base64 and sent with each HTTP request.

To add this authenticator to a specific security profile, configure your `config/security.php` settings file as shown below:
```php
// config/security.php
namespace Config;

return [
    "profiles" => [
        // ...
        "main" => [
            "patern" => '/^(.*)/i',
            "authenticators" => [
                "httpBasicAuth" => [
                    'realm' => 'Restricted'
                ]
            ]
        ]
    ],
    // ...
];
```
The only required property to add is `realm`, a string that identifies the protected area or resource requiring authentication. It appears in the authentication prompt, helping users understand which credentials are needed and for which part of the application or website access is being requested. The realm also helps distinguish between different protected areas on the same server.

### Login form
Login form authentication is a method where users enter their credentials (username and password) into a form, which is then submitted to the server for verification and authentication.

For this authenticator you need to setup a controller that handles the request of login form. Let's create the controller:
```php
// src/UserInterface/User/LoginController.php
namespace App\UserInterface\User;

use Psr\Http\Message\ResponseInterface;
use Slick\Http\Message\Response;
use Slick\Template\UserInterface\TemplateMethods;
use Slick\WebStack\Domain\Security\Csrf\CsrfTokenManagerInterface;
use Slick\WebStack\Domain\Security\SecurityAuthenticatorInterface;
use Slick\WebStack\Infrastructure\Http\FlashMessages;
use Symfony\Component\Routing\Attribute\Route;

final class LoginController
{
    use TemplateMethods;
    use FlashMessages;

    #[Route(path: "/user/login", name: "login")]
    public function handle(
        SecurityAuthenticatorInterface $security,
        CsrfTokenManagerInterface $tokenManager
    ): ResponseInterface {
        $errors = $security->authenticationErrors();
        foreach ($errors as $error) {
            $this->error($error);
        }

        $token = $tokenManager->tokenWithId('login_form');
        return $this->render('user/login.twig', compact('token'));
    }
}
```

The controller above generates a CSRF token and renders a login HTML page. When the login form is submitted, it creates flash messages to display any errors.

`user/login.twig` could look like this:
```twig
{% raw %}{% extends 'user/page.twig' %}

{% block content %}
<h1>Login to your account</h1>
<form action="" method="post">
    <label for="email">Email address</label>
    <input required id="email" name="email" type="email" placeholder="your@email.com">

    <label for="password">Password</label>
    <input required id="password" name="password" type="password" placeholder="Your password">

    <label>
        <input type="checkbox" name="remember">
        Remember me on this device
    </label>

    <button type="submit">Sign in</button>

    <input type="hidden" name="{{ token.tokenId }}" value="{{ token.value }}" />
</form>
{% endblock %}{% endraw %}
```

Now we are ready to configure the security profile in the `config/security.php` file as shown below:
```php
// config/security.php
namespace Config;

return [
    "profiles" => [
        // ...
        "main" => [
            "patern" => '/^(\/)?(admin/user)(.*)/i',
            "authenticators" => [
                "formLogin" => [
                    "paths" => [
                        'login' => '/user/login',
                        'failure' => '/user/login'
                    ],
                    "parameters" => [
                        "username" => "email",
                        "password" => "password",
                        "rememberMe" => "remember",
                        "csrf" => "login_form"
                    ],
                    "enableCsrf" => true,
                    "rememberMe" => true,
                ]
            ]
        ]
    ],
    // ...
];
```
In the configuration, we define all the variable names used in the controller and template. Refer to the table below for a complete list of `formLogin` configuration properties:


| Property      | Description                                                                                                                                                                                                                                                                                                                                                                                                       |
|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `paths`       | A list of URL paths used to handle all steps of the login process: <br /><br />- **`login`**: The URL that presents the login form. Defaults to `/login`. <br />- **`failure`**: The URL where the user is redirected when authentication is required. Defaults to `/login`. <br />- **`defaultTarget`**: The default redirect URL after a successful login when the `useReferer` option is set to `false`. Defaults to `/`. |
| `parameters`  | Names used for form inputs: <br /><br />- **`username`**: The field name containing the user identifier. Defaults to `_username`. <br />- **`password`**: The field name containing the plain password. Defaults to `_password`. <br />- **`rememberMe`**: The field name for the "remember me" checkbox. Defaults to `_rememberMe`. <br />- **`csrf`**: The field name containing the CSRF token. Defaults to `_csrf`.  |
| `enableCsrf`  | Boolean. If set to `true`, CSRF verification will be performed using the data under the `csrf` parameter. Defaults to `true`.                                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                                                    |
| `rememberMe`  | Boolean. Enables writing of the "remember me" cookie data. Note that this only writes the cookie; you must add the `rememberMe` authenticator to handle user authentication. Defaults to `false`.                                                                                                                                                                                                               |
{% include note.html type="warning" content="
Make sure the login page path matches the profile where the authenticator is defined. If they don’t match, authentication will fail, and the user will be redirected back to the login page without any errors, as no authenticator will be processed.
" %}


### Remember me
"Remember me" authentication allows users to stay logged in across sessions by storing a persistent token, typically in a cookie, that automatically authenticates them without re-entering credentials.

To use this authenticator, you need to enable the `rememberMe` property in the `formLogin` configuration. When a user successfully logs in, a cookie with an authentication token will be created, which the `rememberMe` authenticator will use. If the token is present and still valid, the user from the saved token will be authenticated.

First, you need to generate a new secret to encrypt the token data stored in the cookie. The `slick/security` module provides a utility command to generate a cryptographic secret. See the example below:

```shell
bin/console security:generate-secret 24 -e base64
```

The command above will generate a cryptographically secure, pseudo-random 24-byte string that is Base64 encoded. The output will look something like this:

{% include console-output.html content='
![Console output with secret.](/assets/img/console-outputs/console.security-secret.png "Console output with secret")
' %}

Now, let's configure the application secret using the generated secret:

```env
# .env
APP_SECRET=t5SVB4eFDkBdp0Lb1owUe3hTBze02ygg
```

{% include note.html type="info" content="
It is highly recommended to use a unique secret for each environment and never reuse secrets, as this is a poor security practice. To ensure security, place the secret in the `.env` file and reference it in `config/security.php`. Additionally, it's advisable to maintain a separate `.env` file for each environment.
" %}

Finally, add the authenticator to the desired profiles in the `config/security.php` settings file:
```php
// config/security.php
namespace Config;

return [
    "profiles" => [
        // ...
        "main" => [
            "patern" => '/^(\/)?(admin/user)(.*)/i',
            "authenticators" => [
                "rememberMe" => [
                    "secret" => $_ENV["APP_SECRET"],
                    "cookieName" => "rememberMe",
                ],
                "formLogin" => [
                    // ...
                    "enableCsrf" => true,
                    "rememberMe" => true,
                ]
            ]
        ]
    ],
    // ...
];
```

### Custom authenticator
You can create custom authenticators to meet your specific authentication requirements. In the following example, we'll create an authenticator that checks the request query for an `email` parameter. If the parameter is present, it will authenticate the user whose email address matches the parameter value. If the parameter is missing or no matching user is found, the request will proceed without authenticating the user.

{% include note.html type="warning" content="
Please note that the example provided is intended to demonstrate how to create a custom authenticator. While it may be useful for testing purposes in a QA environment, it should never be used in a production environment. This authenticator does not verify passwords, challenges, or any other authentication factors when logging in the user.
" %}

#### AuthenticatorInterface
To create a custom authenticator, you need to implement the `AuthenticatorInterface`. This interface handles credential verification and creates an authentication passport—a collection of authentication badges that hold user information. The passport is then utilized by the `SecurityAuthenticatorInterface` and `AuthorizationCheckerInterface` to manage user authentication and permissions.

```php
// src/Infrastructure/Security/MyAuthenticator.php
namespace App\Infrastructure\Security;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slick\WebStack\Domain\Security\Authentication\Token\UsernamePasswordToken;
use Slick\WebStack\Domain\Security\Authentication\TokenInterface;
use Slick\WebStack\Domain\Security\Exception\AuthenticationException;
use Slick\WebStack\Domain\Security\Http\Authenticator\Passport;
use Slick\WebStack\Domain\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Slick\WebStack\Domain\Security\Http\Authenticator\PassportInterface;
use Slick\WebStack\Domain\Security\Http\AuthenticatorInterface;
use Slick\WebStack\Domain\Security\User\UserProviderInterface;
use Slick\WebStack\Infrastructure\Http\Authenticator\AuthenticatorHandlerTrait;

final class MyAuthenticator implements AuthenticatorInterface
{
    use AuthenticatorHandlerTrait;

    public function __construct(private readonly UserProviderInterface $provider)
    {}

    // Supports when query param is present
    public function supports(ServerRequestInterface $request): ?bool
    {
        $params = $request->getQueryParams();
        return array_key_exists('email', $params);
    }

    // Creates a password with a user badge that will load the user if match
    public function authenticate(ServerRequestInterface $request): PassportInterface
    {
        $params = $request->getQueryParams();
        $userBadge = new UserBadge($params['email'], $this->provider->loadUserByIdentifier(...));

        return new Passport($userBadge, new class implements Passport\Badge\CredentialsInterface {
            public function isResolved(): bool
            { return true; }
        });
    }

    // authentication token
    public function createToken(PassportInterface $passport): TokenInterface
    {
        $authToken = new UsernamePasswordToken($passport->user(), $passport->user()->roles());
        $authToken->withAttributes([
            'IS_AUTHENTICATED_FULLY' => 'false',
            'IS_AUTHENTICATED_REMEMBERED' => 'true',
            'IS_AUTHENTICATED' => 'true'
        ]);
        return $authToken;
    }

    public function onAuthenticationSuccess(ServerRequestInterface $request, TokenInterface $token): ?ResponseInterface
    {
        return null;
    }

    public function onAuthenticationFailure(ServerRequestInterface $request, AuthenticationException $exception): ?ResponseInterface
    {
        return null;
    }

    public function clear(): void
    {
        // do nothing
    }

}
```

The class above is a minimal implementation of the `AuthenticatorInterface`.

#### Checking Authenticator Support
This is a simple verification process. The method checks whether the authenticator supports the given `request`. In this example, the authenticator will support any request that includes an `email` query parameter. If the authenticator does not support the request, it will be ignored during the authentication process.

```php
// src/Infrastructure/Security/MyAuthenticator.php
namespace App\Infrastructure\Security;

final class MyAuthenticator implements AuthenticatorInterface
{
    // ...

    public function supports(ServerRequestInterface $request): ?bool
    {
        $params = $request->getQueryParams();
        return array_key_exists('email', $params);
    }
}
```

#### Authentication
The authentication process is similar to a person entering a foreign country. First, a passport is created with all the user's information, stored in small data structures called badges. For instance, the passport will contain a user badge with user details, an authentication badge used to verify the user, and any other necessary badges.

Just like at a border crossing, authorization (an authentication token) is granted to the user once all the passport badges are checked and validated. If any of the badges are invalid, authentication will not be granted.

In our example, we will create a user badge that utilizes the `UserIdentifier` to search for and retrieve user information, along with a `CredentialsInterface` badge that always returns `true`.

```php
// src/Infrastructure/Security/MyAuthenticator.php
namespace App\Infrastructure\Security;

final class MyAuthenticator implements AuthenticatorInterface
{
    public function __construct(private readonly UserProviderInterface $provider)
    {
    }

     // ...

    public function authenticate(ServerRequestInterface $request): PassportInterface
    {
        $params = $request->getQueryParams();
        $userBadge = new UserBadge($params['email'], $this->provider->loadUserByIdentifier(...));

        return new Passport($userBadge, new class implements Passport\Badge\CredentialsInterface {
            public function isResolved(): bool
            {
                return true;
            }
        });
    }

    // ...
}
```

#### Authentication token
The authentication token is used by the `SecurityAuthenticatorInterface` and `AuthorizationCheckerInterface` to access authenticated user information and verify permissions. When creating a token, it’s important to include the user's roles and any attributes needed for verifying permissions and authorizations.

The `slick/security` module uses three attributes to indicate the level of user authentication: `IS_AUTHENTICATED_FULLY`, `IS_AUTHENTICATED_REMEMBERED`, and `IS_AUTHENTICATED`. Setting these attributes allows you to use them as conditions in your application. For example, a user with `IS_AUTHENTICATED_REMEMBERED` (likely authenticated via a session or cookie) should not be allowed to update their password, whereas a user with `IS_AUTHENTICATED_FULLY` would have full permissions, including changing their password.

Now, let's look at our example:

```php
// src/Infrastructure/Security/MyAuthenticator.php
namespace App\Infrastructure\Security;

final class MyAuthenticator implements AuthenticatorInterface
{
    // ...

    public function createToken(PassportInterface $passport): TokenInterface
    {
        $authToken = new UsernamePasswordToken($passport->user(), $passport->user()->roles());
        $authToken->withAttributes([
            'IS_AUTHENTICATED_FULLY' => 'false',
            'IS_AUTHENTICATED_REMEMBERED' => 'true',
            'IS_AUTHENTICATED' => 'true'
        ]);
        return $authToken;
    }
}
```

#### Authentication success, fail and logout
When the authentication token is created (indicating the user is authenticated), the `AuthenticatorInterface::onAuthenticationSuccess()` method is called with the token. Similarly, if authentication fails, the `AuthenticatorInterface::onAuthenticationFailure()` method is triggered with an `AuthenticationException` detailing the error. In both cases, the `request` object is passed along, providing full context for these events.

Lastly, you can perform cleanup tasks when `SecurityAuthenticatorInterface::logout()` is called. This is useful, for example, if you need to clear cookies or other session data set during the authentication process.

In our example, we won’t perform any actions on these events.

```php
// src/Infrastructure/Security/MyAuthenticator.php
namespace App\Infrastructure\Security;

final class MyAuthenticator implements AuthenticatorInterface
{
    // ...

    public function onAuthenticationSuccess(ServerRequestInterface $request, TokenInterface $token): ?ResponseInterface
    {
        return null;
    }

    public function onAuthenticationFailure(ServerRequestInterface $request, AuthenticationException $exception): ?ResponseInterface
    {
        return null;
    }

    public function clear(): void
    {
    }
}
```

#### Entry points
An entry point is a mechanism for directing users to authenticate when accessing a page that requires authentication. Typically, when you try to access such a page, you are redirected to the login page, and upon successful login, you are redirected back to the original page.

This process is managed through an entry point. You can implement the `AuthenticationEntryPointInterface`, which initiates the authentication process when no logged-in user is detected.

In our example, we want the page to load without initiating a login process, so we implement the `AuthenticationEntryPointInterface::start()` method to return `null`. Here's how it's done:

```php
// src/Infrastructure/Security/MyAuthenticator.php
namespace App\Infrastructure\Security;

// ...
    use Slick\WebStack\Domain\Security\Http\AuthenticationEntryPointInterface;

final class MyAuthenticator implements AuthenticatorInterface, AuthenticationEntryPointInterface
{

    // ...

    public function start(ServerRequestInterface $request, ?AuthenticationException $authException = null): ?ResponseInterface
    {
        return null;
    }
}
```


## Authenticated user and permissions
There are 2 special objects that you can use to get access to the current authenticated user and check roles and attributes.

### Security authenticator
You can use `SecurityAuthenticatorInterface::user()` to retrieve user information. It will return `null` if no users are authenticated. To log out the currently logged-in user, you can use `SecurityAuthenticatorInterface::logout()`. For more details, check the [logout section](#logout) on this page.

### Authorization checker

The `AuthorizationCheckerInterface` is typically the main interface you'll work with. You can use `AuthorizationCheckerInterface::authenticatedUser()` to retrieve user information; however, unlike other methods, it will throw a security exception if no user is authenticated. Another key method is `AuthorizationCheckerInterface::isGranted()`, which lets you check specific attributes of the authentication token. Here's an example:

```php
// src/UserInterface/User/AccountController.php
namespace App\UserInterface\User;

use Psr\Http\Message\ResponseInterface;
use Slick\Http\Message\Response;
use Slick\Template\UserInterface\TemplateMethods;
use Slick\WebStack\Domain\Security\AuthorizationCheckerInterface;
use Symfony\Component\Routing\Attribute\Route;

final class AccountController
{
    use TemplateMethods;

    #[Route(path: "/user/account", name: "account")]
    public function account(AuthorizationCheckerInterface $auth): ResponseInterface
    {
        return $auth->("IS_AUTHENTICATED_FULLY")
            ? $this->render("user/account.html.twig", ["user" => $auth->authenticatedUser()])
            : new Response(statusCode: 302, headers: ["location" => "/user/login"])
        ;
    }
}
```
In the controller above, we use the `AuthorizationCheckerInterface` to retrieve the authenticated user. If the user has the `IS_AUTHENTICATED_FULLY` attribute set—indicating they completed credential validation during the current session—their account HTML page is rendered. Otherwise, the user is redirected to the login page.

### `IsGranted` attribute
With the introduction of PHP 8 attributes, you can use the `IsGranted` attribute to replicate the behavior shown in the previous example more elegantly. Attributes enhance code readability and maintainability by making security checks more explicit and reducing boilerplate code. The `IsGranted` attribute is evaluated by the authorization middleware, and if the condition is not met, the controller will not be dispatched, preventing the route handling method from being called.

Here's how to use the `IsGranted` attribute to achieve the same functionality:

```php
// src/UserInterface/User/AccountController.php
namespace App\UserInterface\User;

use Psr\Http\Message\ResponseInterface;
use Slick\Template\UserInterface\TemplateMethods;
use Slick\WebStack\Domain\Security\Attribute\IsGranted;
use Slick\WebStack\Domain\Security\AuthorizationCheckerInterface;
use Symfony\Component\Routing\Attribute\Route;

final class AccountController
{
    use TemplateMethods;

    #[Route(path: '/', name: 'homepage')]
    #[IsGranted(attribute: "IS_AUTHENTICATED_FULLY", location: "/user/login")]
    public function handle(AuthorizationCheckerInterface $auth): ResponseInterface
    {
        $user = $auth->authenticatedUser();
        return $this->render('homepage.twig', compact('user'));
    }
}
```

In this example, the `IsGranted` attribute checks whether the user has the `IS_AUTHENTICATED_FULLY` attribute. If not, the user is redirected to the specified location (`"/user/login"`). This approach keeps the code clean and concise while maintaining the necessary security checks.

{% include note.html type="warning" content="
Keep in mind that the `IsGranted` attribute can only be applied to controller classes; it will not be evaluated in other types of classes. If you need to check user attributes, roles, or retrieve the authenticated user in other classes, you should use the `AuthorizationCheckerInterface` as a dependency instead.
" %}

{% include note.html type="info" content="
In the example, we used the `IsGranted` attribute on the method signature, but it can also be applied to the class signature. The key difference is that when the attribute is placed on the class, it will be checked for every route handler method within that class, rather than being limited to a specific method.
" %}

#### Here's a description of the arguments for the `IsGranted` attribute:

| Argument     | Description                                                                                                                              |
|--------------|------------------------------------------------------------------------------------------------------------------------------------------|
| `attribute`  | The attribute or role to be checked. It can be an array of values and is mandatory.                                                      |
| `message`    | An optional custom error message that will be included in the HTTP response if authorization fails. Defaults to `Access denied.`         |
| `statusCode` | The response status code to be used if the check fails. Defaults to `403`.                                                              |
| `headers`    | A key/value pair of custom headers to include in the response. Defaults to an empty array `[]`.                                          |
| `location`   | Specifies a URL or path to redirect the user. If set, a `302` redirect response will be sent. Defaults to `null`, meaning no redirect.   |
| `asJson`     | If set to `true`, the response body will be formatted as a JSON API error. Defaults to `false`.                                          |

## Logout
To clear all user information from the session, use the `SecurityAuthenticatorInterface::logout()` method in the controller that handles the logout request. See the example below:

```php
// src/UserInterface/User/LogoutController.php
namespace App\UserInterface\User;

use Psr\Http\Message\ResponseInterface;
use Slick\Http\Message\Response;
use Slick\WebStack\Domain\Security\SecurityAuthenticatorInterface;
use Symfony\Component\Routing\Attribute\Route;

final class LogoutController
{

    #[Route(path: "/user/logout", name: "logout")]
    public function handle(SecurityAuthenticatorInterface $security): ResponseInterface
    {
        $security->logout();
        return new Response(status: 302, headers: ['location' => '/']);
    }
}
```

The `SecurityAuthenticatorInterface` cycles through all authenticators, clearing all user information and logging out the user.

## Cross-Site Request Forgery (CSRF)

Cross-Site Request Forgery (CSRF) is a security vulnerability that occurs when an attacker tricks a user into performing unwanted actions on a web application in which they are authenticated. This attack exploits the trust that a web application has in the user's browser, allowing the attacker to send unauthorized requests on the user's behalf, potentially leading to actions like changing account details, making unauthorized transactions, or altering data. Preventing CSRF typically involves using tokens that validate the authenticity of requests to ensure they originate from the legitimate user.

The `slick/security` module provides support for adding CSRF tokens to your forms, helping to mitigate this security vulnerability.

Once the module is enabled, a `CsrfTokenManagerInterface` implementation is automatically defined in the dependency container, making it readily available for use.

Here's an example:
```php
// src/UserInterface/User/AccountController.php
namespace namespace App\UserInterface\User;

final class AccountController
{
    use TemplateMethods;

    const string TOKEN_ID = 'account_update';

    public function __construct(
        private readonly ServerRequestInterface $serverRequest,
        private readonly CsrfTokenManagerInterface $csrfTokenManager
    ) {
    }

    #[Route(path: '/user/account', name: 'account')]
    #[IsGranted("IS_AUTHENTICATED_FULLY")]
    public function account(): ResponseInterface
    {
        $token = $this->csrfTokenManager->refreshToken(self::TOKEN_ID);
        return $this->render('user/update.html.twig', compact('token'));
    }
}
```
Each time a request is made to the account update page, a new CSRF token is generated. The `CsrfTokenManagerInterface::refreshToken()` method creates a new token if none exists. To include the token in your form, render it as a hidden input field:

```twig
{% raw %}{% extends 'page.twig' %}

{% block content %}
    <form action="{{ path("account") }}" method="POST">

    {# other form fields... #}
    <input type="hidden" name="{{ token.tokenId }}" value="{{ token.value }}" />

    </form>
{% endraw %}
```

The hidden input contains the generated CSRF token, which is then submitted with the form. To validate the token upon form submission, follow this example:

```php
// src/UserInterface/User/AccountController.php
namespace namespace App\UserInterface\User;

final class AccountController
{
    // ...

    #[Route(path: '/user/account', name: 'account')]
    #[IsGranted("IS_AUTHENTICATED_FULLY")]
    public function account(): ResponseInterface
    {
        if ($this->serverRequest->getMethod() == "POST") {
            $this->handleUpdate();
        }

        $token = $this->csrfTokenManager->refreshToken(self::TOKEN_ID);
        return $this->render('user/update.html.twig', compact('token'));
    }

    public function handleUpdate(AuthorizationCheckerInterface $auth): void
    {
        $data = $this->serverRequest->getParsedBody();
        $submittedToken = new CsrfToken(self::TOKEN_ID, $data[self::TOKEN_ID]);

        if (!$csrfTokenManager->isTokenValid($submittedToken)) {
            $this->error("Invalid form data. Try again.");
        }

        // ...
    }
}
```
In this example, when the form is submitted, the CSRF token is validated to ensure the request is legitimate. If the token is invalid, an error message is displayed.

[UserInterface]: https://github.com/slickframework/web-stack/blob/{{ site.branch }}/src/Domain/Security/UserInterface.php