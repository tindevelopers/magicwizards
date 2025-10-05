# TinAdmin Templates

This directory contains industry-specific dashboard templates built from the TinAdmin core.

## Available Templates

- **ecommerce** - E-commerce dashboard with products, orders, customers
- **healthcare** - Healthcare management with patients, appointments
- **finance** - Financial dashboard with transactions, accounts
- **education** - Educational institution with students, courses
- **saas** - SaaS application with users, subscriptions

## Creating a New Template

```bash
# Create a new template
npm run template:create <template-name>

# Example: Create healthcare template
npm run template:create healthcare
```

## Building Templates

```bash
# Build a specific template
npm run template:build <template-name>

# Example: Build ecommerce template
npm run template:build ecommerce
```

## Publishing to NPM

```bash
# Build and publish a template
npm run publish:template <template-name>
```

## Template Structure

Each template includes:
- Industry-specific components
- Customized color schemes
- Relevant dashboard widgets
- Tailored navigation menus
- Industry-specific data models

## Usage

Once published to NPM, users can install templates:

```bash
# Install a template
npx create-tinadmin@latest <template-name>

# Example: Create ecommerce dashboard
npx create-tinadmin@latest ecommerce
```
