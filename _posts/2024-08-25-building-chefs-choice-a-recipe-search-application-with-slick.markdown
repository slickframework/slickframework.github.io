---
layout: post
title:  "Chef's Choice – A Recipe Search Application with Slick"
date:   2024-08-25 10:30:00 +0000
categories: howtos
author: Filipe Silva
hero_image: /assets/img/chefschoice.png
image: /assets/img/chefschoice.png
hero_darken: true
menubar_toc: true
---

In this tutorial, we will guide you through the process of building "Chef's Choice," a dynamic recipe search application using the Slick framework. Chef's Choice is designed to help users find recipes based on the ingredients they already have at home, making meal planning both fun and efficient. This project is an excellent opportunity to learn how to work with Slick’s core features, including routing, controllers, and templating, without the need for a database.

## Overview
**What You’ll Learn:**
- **Routing and Controllers**: Learn to define routes and create controllers that handle the core functionality of the application.
- **Twig Templates**: Use Twig to build dynamic, responsive templates for displaying and searching recipes.
- **Static Data Handling**: Manage recipe data using arrays or JSON files, simulating real-world data without the complexity of database integration.
- **Search Functionality**: Implement a basic search feature to filter recipes based on user-input ingredients, showcasing how to handle user requests and display dynamic content.

**Why Build Chef's Choice?**

Chef's Choice is a practical project that leverages Slick’s capabilities to create a useful tool, demonstrating how even simple applications can provide value and engage users. By focusing on static data, you can concentrate on learning the fundamentals of Slick without getting bogged down in database management or backend complexity. Whether you’re a beginner looking to get started with Slick or an experienced developer wanting to brush up on core skills, this project is the perfect starting point.

By the end of this tutorial, you’ll have a fully functioning recipe search application and a solid understanding of how to build web applications with Slick. So, grab your favorite ingredients, and let’s start cooking up some code with Chef's Choice!

**Prerequisites**: Basic knowledge of PHP and web development tools.


## Project Setup

We'll use `composer` to create a Slick web application and set up the file structure for our project. As outlined in the [Getting Started](/documentation/getting-started.html) section of Slick’s documentation, begin by running the following `composer create-project` command:

```shell
composer create-project slick/webapp ./chefschoice
```

Now, change to the `./chefschoice` directory, where you’ll find a file structure similar to the one shown in the following image:

![Slick's file structure.](/assets/img/slick-file-structure.png "Slick's file structure.")


You can use PHP's built-in web server to start developing. Simply run the following command:

```shell
php -S localhost:8000 -t webroot
```

Then, open [http://localhost:8000](http://localhost:8000) in your browser, and you should see Slick's default welcome page.

![Slick webapp application](/assets/img/webapp.png "Slick webapp application")

## Recipe's data

We will be using static data for the recipes, which will be stored in a JSON file. This approach allows us to simulate a small dataset without needing a database. Here's how we will set it up and use it:

### JSON Data File

To begin, we’ll create a `data/recipes.json` file that holds all the recipe data in a structured format. Each recipe will include attributes such as the name, ingredients, instructions, and image. Here's an example of how this JSON data might look:

```json
[
  {
    "name": "Spaghetti Aglio e Olio",
    "ingredients": ["Spaghetti", "olive oil", "garlic", "red pepper flakes", "parsley", "salt", "black pepper"],
    "instructions": "Cook spaghetti. In a pan, sauté garlic in olive oil until golden. Add red pepper flakes, cooked pasta, and parsley. Toss and serve.",
    "image": "/assets/recipe/0.jpg"
  },
  {
    "name": "Caprese Salad",
    "ingredients": ["Tomatoes", "fresh mozzarella", "basil", "olive oil", "balsamic vinegar", "salt", "black pepper"],
    "instructions": "Slice tomatoes and mozzarella. Arrange on a plate, alternating slices. Top with basil, drizzle with olive oil and balsamic vinegar, and season with salt and pepper.",
    "image": "/assets/recipe/1.jpg"
  }
]
```

{% include note.html content="
You can download the complete `/data/recipes.json` file, which contains the data used for testing this project, from [here](/assets/recipes.json).
" %}

### Recipe Entity & Repository

To store and manage each recipe from the `/data/recipes.json` file, we'll create an entity class called `Recipe`. This class will be constructed using the data read from the JSON file, with a unique identifier generated based on the recipe's name. Here's the implementation of the `Recipe` class:

```php
// src/Domain/Recipe.php
namespace App\Domain;

/**
 * Recipe Entity
 *
 * @package App\Domain
 */
final class Recipe
{
    private string $recipeId;
    private string $name;
    private array  $ingredients;
    private string $instructions;
    private string $imagePath;

    public function __construct(object $data)
    {
        $this->recipeId = md5($data->name);
        $this->name = $data->name;
        $this->ingredients = $data->ingredients;
        $this->instructions = $data->instructions;
        $this->imagePath = $data->image;
    }

    public function recipeId(): string
    {
        return $this->recipeId;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function ingredients(): array
    {
        return $this->ingredients;
    }

    public function instructions(): string
    {
        return $this->instructions;
    }

    public function imagePath(): string
    {
        return $this->imagePath;
    }
}
```

Next, we need to define a `RecipeRepository` interface. This interface will manage the collection of recipes, allowing for searching, retrieving, and listing them as needed:

```php
// src/Domain/RecipeRepository.php
namespace App\Domain;

interface RecipeRepository
{
    /**
     * Retrieves the recipe with the given recipe ID.
     *
     * @param string $recipeId The ID of the recipe.
     * @return Recipe The Recipe object associated with the provided ID.
     */
    public function withRecipeId(string $recipeId): Recipe;

    /**
     * Retrieves all recipes from the repository.
     *
     * @return array<Recipe> An array containing all Recipe objects.
     */
    public function all(): array;

    /**
     * Searches for recipes containing the specified token.
     *
     * @param string $token The search term to filter recipes.
     * @return array<Recipe> An array of Recipe objects matching the token.
     */
    public function searchBy(string $token): array;
}
```

This structure will allow the `RecipeRepository` to handle the retrieval, storage, and searching of recipes in a clean and scalable way.

### Implementing the Repository

By implementing the `RecipeRepository` interface, we can create a repository that reads recipe data from a JSON file (`/data/recipes.json`) and provides functionality to search, list, and retrieve `Recipe` entities. Here's how the implementation of `JsonRecipeRepository` looks:

```php
// src/Infrastructure/JsonRecipeRepository.php
namespace App\Infrastructure;

use App\Domain\Recipe;
use App\Domain\RecipeRepository;

/**
 * JsonRecipeRepository
 *
 * @package App\Infrastructure
 */
final class JsonRecipeRepository implements RecipeRepository
{
    private array $recipes = [];

    public function __construct()
    {
        // Load the recipes data from the JSON file
        $file = file_get_contents(dirname(__DIR__, 2) . '/data/recipes.json');
        if (is_string($file)) {
            $data = json_decode($file);
            if (is_array($data)) {
                $this->recipes = [];
                foreach ($data as $item) {
                    $this->recipes[] = new Recipe((object) $item);
                }
            }
        }
    }

    public function withRecipeId(string $recipeId): Recipe
    {
        // Find the recipe by its ID
        foreach ($this->recipes as $recipe) {
            if ($recipe->recipeId() === $recipeId) {
                return $recipe;
            }
        }

        throw new \RuntimeException("Recipe with id '$recipeId' not found");
    }

    public function all(): array
    {
        // Return all recipes
        return $this->recipes;
    }

    public function searchBy(string $token): array
    {
        // Search recipes by token in name, ingredients, or instructions
        return array_filter($this->recipes, function (Recipe $recipe) use ($token) {
            return in_array($token, $recipe->ingredients()) ||
                   str_contains(strtolower($recipe->name()), strtolower($token)) ||
                   str_contains(strtolower($recipe->instructions()), strtolower($token));
        });
    }
}
```

This implementation reads the recipe data from the JSON file during construction, then provides methods to retrieve a specific recipe by its ID, list all recipes, and search for recipes by a given token in their name, ingredients, or instructions.

## Controller and Routes

In this application, we'll define two main routes:

1. **Home page (`/`)**: Lists all recipes. If a query parameter `q` is passed, the page filters the recipes based on the provided token.
2. **Recipe page (`/recipe/{recipeId}`)**: Displays a specific recipe by its unique identifier.

We'll create a `RecipesController` class to manage these routes and handle the logic for displaying and filtering recipes:

```php
// src/UserInterface/RecipesController.php
namespace App\UserInterface;

use App\Domain\RecipeRepository;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slick\Template\UserInterface\TemplateMethods;
use Symfony\Component\Routing\Attribute\Route;

/**
 * RecipesController
 *
 * Handles displaying recipes and filtering based on query parameters.
 *
 * @package App\UserInterface
 */
final class RecipesController
{
    use TemplateMethods; // For rendering templates

    public function __construct(private readonly RecipeRepository $recipes)
    {
    }

    #[Route(path: "/", name: "recipes")]
    public function allRecipes(ServerRequestInterface $request): ResponseInterface
    {
        // Retrieve query for filtering, if any
        $query = $this->retrieveQuery($request);
        
        // Render the 'all recipes' page, filtering recipes if a query exists
        return $this->render(
            "recipes/all.html.twig",
            [
                'recipes' => $query
                    ? $this->recipes->searchBy($query)
                    : $this->recipes->all(),
                'query' => $query
            ]
        );
    }

    #[Route(path: "/recipe/{recipeId}", name: "recipe")]
    public function recipe(string $recipeId, ServerRequestInterface $request): ResponseInterface
    {
        // Get the referrer to include in the response (if available)
        $referer = $request->getHeaderLine("Referer");
        
        // Retrieve the recipe by its ID and render the 'recipe details' page
        $recipe = $this->recipes->withRecipeId(strip_tags($recipeId));
        return $this->render('recipes/recipe.html.twig', compact('recipe', 'referer'));
    }

    private function retrieveQuery(ServerRequestInterface $request): ?string
    {
        $query = $request->getQueryParams();
        return array_key_exists("q", $query) ? strip_tags($query["q"]) : null;
    }
}
```

#### Key Details:
- **`allRecipes` method**: Handles the home page (`/`). It checks for a `q` query parameter and filters recipes accordingly. If no query is provided, it lists all recipes.
- **`recipe` method**: Displays the details of a specific recipe based on its `recipeId`.
- **`retrieveQuery` method**: Sanitizes and retrieves the query parameter from the request, ensuring safe input handling.

With this setup, users can browse all recipes on the home page and view individual recipe details by navigating to the specific recipe URL.

### Removing the Welcome Controller

To ensure the correct routing of your application and avoid potential conflicts, you should delete the `src/UserInterface/WelcomeController.php` file. This file, responsible for rendering the default welcome page, might interfere with routing and cause the welcome page to display instead of the recipes home page.

By removing this file, you ensure that the `/` route correctly points to your new recipes home page and that no unintended behavior occurs during routing.

## Views and Templates

Slick leverages the Twig template engine through its `slick/template` module to render web pages. We will utilize Twig's features like template inheritance and includes to structure our HTML efficiently. Additionally, we will use the built-in base template from `slick/template` that provides a CSS theme and HTML5 structure.

### Base Page Template

The base template will serve as the foundation for all pages, creating the layout and including a header with a navigation bar that has a search form.

```twig
{% raw %}{# templates/page.html.twig #}
{% extends "base.html.twig" %}

{% block html_title %}Chef's Choice{% endblock %}

{% block body_class %}has-navbar-fixed-top{% endblock %}

{% block page_content %}
    {{ include("includes/nav-bar.html.twig") }}
    <div class="container py-5 px-3">
        {% block main_content %}
        {% endblock %}
    </div>
{% endblock %}{% endraw %}
```

### Navigation Bar Template

The navigation bar (`nav-bar.html.twig`) will include the brand and a search form to filter recipes.

```twig
{% raw %}{# templates/includes/nav-bar.html.twig #}
<nav class="navbar is-fixed-top has-shadow" role="navigation" aria-label="main navigation">
    <div class="container">
        {{ include("includes/nav-brand.html.twig") }}

        <div class="navbar-menu">
            <div class="navbar-end">
                <div class="navbar-item">
                    <div class="field is-color-white">
                        <label for="q">Search:</label>
                    </div>
                </div>
                <div class="navbar-item">
                    <form method="get" action="{{ path("recipes") }}">
                        <div class="field">
                            <div class="control has-icons-right">
                                <input id="q" name="q" class="input" type="text" placeholder="Search..." value="{{ query }}">
                                <span class="icon is-small is-right">
                                    <i class="fas fa-search"></i>
                                </span>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</nav>

<div class="container p-4 is-hidden-desktop">
    <form method="get" action="{{ path("recipes") }}">
        <div class="is-flex is-gap-2 is-align-items-center">
            <div class="field mb-0 is-hidden-mobile">
                <label for="q-mobile" class="label is-size-5">Search:</label>
            </div>
            <div class="field is-flex-grow-1 mb-0">
                <div class="control">
                    <input id="q-mobile" name="q" class="input" type="text" placeholder="Search..." value="{{ query }}">
                </div>
            </div>

            <div class="field">
                <div class="control">
                    <button class="button is-info">
                        <i class="fas fa-search"></i> &nbsp; Search
                    </button>
                </div>
            </div>
        </div>
    </form>
</div>{% endraw %}
```

This setup provides a responsive search form, both for desktop and mobile views, allowing users to filter recipes easily.

### Navigation Bar Brand

This template includes the application name and icon, providing a recognizable header for the app.

```twig
{% raw %}{# templates/includes/nav-brand.html.twig #}
<div class="navbar-brand">
    <div class="is-flex has-gap-2">
        <a class="navbar-item" href="{{ path("recipes") }}">
            <svg fill="currentColor"
                 width="800px" height="800px" viewBox="0 0 373.517 373.517"
                 xml:space="preserve">
<g>
    <path d="M57.854,52.447V18.416l5.211-6.245h256.541V0H57.367L45.696,14.03v38.417h-0.035v321.07h282.194V52.447H57.854z
		 M102.958,97.132h184.603v18.096H102.958V97.132z M268.995,214.272c-0.047,2.73-0.325,11.642-3.044,11.642l-5.217,0.012
		c-15.825,0.023-63.973,0.093-98.619,0.093c-24.382,0-36.762-0.047-37.906-0.104c-2.644-0.14-2.835-6.599-2.713-10.41
		c0.168-6.228,3.724-60.882,73.964-60.882c0.825,0,1.686,0.012,2.498,0.023C264.371,155.859,269.123,200.584,268.995,214.272z
		 M268.321,319.735c-0.232,0-1.418,0.058-3.393,0.139c-9.736,0.453-39.388,1.777-69.178,1.812l-1.58,0.012
		c-35.223,0-70.618-1.742-71.983-1.975c-4.188-0.744-3.021-24.748-3.009-25.004c0.5-7.122,1.626-8.621,3.172-8.668
		c0.656-0.011,6.321-0.022,17.887-0.022c14.134,0,34.943,0.012,55.676,0.012c20.612,0.022,41.188,0.046,55.085,0.046
		c11.049,0,16.835-0.012,17.265-0.035c1.023,0.047,3.266,0,3.266,18.289C271.528,319.735,269.529,319.735,268.321,319.735z
		 M269.832,275.723h-149.12c-10.445,0-18.904-8.471-18.904-18.904c0-10.445,8.458-18.914,18.904-18.914h149.12
		c10.433,0,18.915,8.469,18.915,18.914C288.747,267.252,280.265,275.723,269.832,275.723z"/>
</g>
</svg>
            <p class="is-size-4 is-capitalized">Chef's Choice</p>
        </a>
    </div>
</div>{% endraw %}
```

### Homepage/Search Template

The homepage will display a list of all recipes. If a search query (`q`) is present, it will filter the recipes accordingly.

```twig
{% raw %}{# templates/recipes/all.html.twig #}
{% extends "page.html.twig" %}

{% block main_content %}
    <h1 class="title is-hidden-touch">
        {% if query %}
            Results containing "{{ query }}"
        {% else %}
            All recipes
        {% endif %}
    </h1>
    {{ include("includes/recipe-list.html.twig") }}
{% endblock %}{% endraw %}
```

### Recipe List Template

This template dynamically generates a grid of recipe cards by looping through all available recipes.

```twig
{% raw %}{# templates/includes/recipe-list.html.twig #}
<div class="grid is-col-min-14 is-column-gap-5 is-row-gap-5">
    {% for recipe in recipes %}
        <div class="cell">
            {{ include("includes/recipe-card.html.twig") }}
        </div>
    {% endfor %}
</div>{% endraw %}
```

### Recipe Card Template

Each card displays a recipe's image, name, and truncated instructions. Clicking on a card redirects to the full recipe page.

```twig
{% raw %}{# templates/includes/recipe-card.html.twig #}
<a href="{{ path("recipe", {"recipeId": recipe.recipeId}) }}">
    <div class="card">
        <div class="card-image">
            <figure class="image">
                <img src="https://www.slick-framework.com{{ recipe.imagePath }}" alt="{{ recipe.name }}" />
            </figure>
        </div>

        <div class="card-content">
            <div class="content">
                <h3 class="title">{{ recipe.name }}</h3>
                {{ recipe.instructions|truncate(100) }}
            </div>
        </div>
    </div>
</a>{% endraw %}
``` 

This structure delivers a clean, user-friendly interface for browsing and searching recipes.

Once you refresh your browser or navigate to [http://localhost:8000](http://localhost:8000), your application should be running, and you'll see something similar to this:

![Chef's Choice site.](/assets/img/chefschoice-site.png "Chef's Choice site.")

### Recipe Page

Finally, we need to display a single recipe. The `templates/recipes/recipe.html.twig` file will show all of the recipe's details. Here's the structure:

```twig
{% raw %}{# templates/recipes/recipe.html.twig #}
{% extends "page.html.twig" %}

{% block main_content %}
    <h1 class="title">{{ recipe.name }}</h1>
    <div class="columns mb-3">
        <div class="column is-3">
            <img class="image is-fullwidth" src="https://www.slick-framework.com{{ recipe.imagePath }}" alt="{{ recipe.name }}" />
        </div>
        <div class="column is-3">
            <div class="content">
                <h3 class="title is-size-4">Ingredients:</h3>
                <ul>
                    {% for ingredient in recipe.ingredients %}
                        <li>{{ ingredient }}</li>
                    {% endfor %}
                </ul>
            </div>
        </div>

        <div class="column">
            <div class="content">
                <h3 class="title is-size-4">Instructions:</h3>
                <div class="is-size-5">{{ recipe.instructions }}</div>
            </div>
        </div>
    </div>

    <a class="button is-light" href="{{ referer ? referer : path("recipes") }}">Go back</a>
{% endblock %}{% endraw %}
```

This will create a visually appealing page where users can view a recipe's image, ingredients, and instructions, with a "Go back" button for easy navigation.

Refresh your browser or navigate to [http://localhost:8000](http://localhost:8000). When you click on a recipe, you'll be directed to the recipe page, which should look something like this:

![Chef's Choice recipe page.](/assets/img/recipe-page.png "Chef's Choice recipe page.")

## Summary

In this tutorial, we built a recipe search application called **Chef's Choice** using the Slick framework. Here's a summary of the key steps:

1. **Project Setup**:
   We started by setting up a new Slick web application using Composer. After configuring the directory structure, we utilized PHP's internal web server to run the application.

2. **Static Data with JSON**:
   A `recipes.json` file was created to hold recipe data, including attributes like name, ingredients, instructions, and images. This data is used to populate the application dynamically.

3. **Recipe Entity and Repository**:
   We created a `Recipe` entity to represent individual recipes, and a `RecipeRepository` interface to manage recipe collections. We implemented a repository that reads data from the JSON file and supports searching, listing, and retrieving recipes.

4. **Controller and Routes**:
   The `RecipesController` was built to handle two main routes:
   - The home page `/`, which lists all recipes or filters them based on a search query.
   - The recipe detail page `/recipe/{recipeId}`, which displays a specific recipe based on its identifier.

5. **Views and Templates**:
   Using the Twig template engine, we designed the application's user interface. The base layout was extended to include navigation and search functionality. The recipe list and individual recipe pages were built with modular templates for a clean and user-friendly experience.

6. **Final UI**:
   Once set up, the application allows users to browse recipes, filter based on search terms, and view detailed recipe pages with images, ingredients, and instructions. The application provides a sleek and responsive user interface.

By following these steps, you now have a fully functional recipe search app built with Slick!