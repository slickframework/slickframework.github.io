---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: page
hero_image: /assets/img/hi-tech-concepts-on-blue-background-hero-header.jpg
title: Slick
hero_link: /documentation/getting-started.html
hero_link_text: Getting Started
hero_darken: true
show_sidebar: true
subtitle: Streamlining PHP Application Development with PSR-15 Handlers and Modern Development Practices
callouts: home_callouts
---

### **Getting Started with Slick**

Slick is a PSR-15 compliant HTTP middleware framework designed for building web applications and services that communicate over the HTTP protocol. At its core, Slick provides a robust middleware stack, a powerful router, security features, and a dispatcher that produces PSR-7 compliant responses to incoming HTTP requests, usually routed through a web server.

#### **Why Use HTTP Middleware?**

One of the main advantages of using Slick’s HTTP middleware is its flexibility. The middleware stack can be easily customized by adding, removing, or reordering middleware components, allowing you to tailor the HTTP request handling to meet your specific needs. This adaptability makes Slick an ideal choice for a wide range of HTTP handling scenarios, from simple applications to complex services.

#### **Modular Architecture**

Slick is built with modularity in mind. Most of its features are implemented as separate modules, offering a high degree of customization:
- **Core Modules**: Some modules are enabled by default and are essential for Slick’s operation. These cannot be disabled.
- **Optional Modules**: Additional modules can be enabled as needed. Activating these modules will automatically configure their dependencies, set up relevant components in the dependency container, register console commands, include necessary HTTP middlewares, and adjust default settings.

This modular approach ensures that you can keep your application lean by only including the components you need, while still having access to a rich set of features to extend the functionality of your application when required.

Whether you're starting a new project or integrating Slick into an existing application, its middleware-centric and modular design provides a flexible and efficient foundation for building robust HTTP-based applications and services.

