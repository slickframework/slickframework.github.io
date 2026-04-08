# Slick Framework — Documentation Site

## Project context
This is the documentation site for the Slick Framework, a PHP 8.3+ PSR-15
middleware framework. The site is currently built with Jekyll (GitHub Pages)
and is being migrated to Astro + Starlight.

## Current state
- Jekyll source: repo root (GitHub Pages, currently live)
- Astro + Starlight source: `docs-astro/` directory
- Branch strategy: all migration work on `astro-migration` branch

## Content rules
- All documentation in English (en_US)
- Code examples must be runnable PHP 8.3+ with strict_types=1
- No pseudocode — every snippet must reflect the actual Slick API
- Tone: direct, technical, no marketing language

## File structure

### Jekyll (root — current live site)
- `documentation/` — documentation pages (migration source)
- `modules/` — per-module documentation pages (migration source)
- `_posts/` — blog posts
- `assets/` — images and CSS

### Astro + Starlight (`docs-astro/`)
- `docs-astro/src/content/docs/` — migration target for all content
- Content from `documentation/` and `modules/` should be migrated here as Starlight pages

## Migration goal
Move all content from the Jekyll `documentation/` and `modules/` folders into
Astro Starlight pages under `docs-astro/src/content/docs/`, preserving structure
and content fidelity.

## Do not
- Do not modify `_config.yml` without asking
- Do not delete any content files during migration — move them