web application/stitch/projects/9963083803628598504/screens/7c26c5a560904fa5810151e13a28a7b0

# Project Requirements Document: StockMaster

## 1. Product Vision

StockMaster is a clean, modern B2B SaaS application designed for small businesses to manage their inventory and invoicing workflows with ease. Inspired by the efficiency of tools like Notion and Linear, it prioritizes clarity, professional aesthetics, and operational speed.

## 2. Target Audience

- **Small Business Owners**: Need a centralized view of their financial health and stock levels.
- **Inventory Managers**: Responsible for tracking SKU levels, low-stock alerts, and product data.
- **Administrative Staff**: Focused on customer management, invoicing, and billing cycles.

## 3. Core Modules & Features

### 3.1. Authentication & Security

- **Secure Login**: Username/password-based authentication.
- **Role-Based Access Control (RBAC)**: Distinct permissions for "Admin" and "Employee" roles.
- **Session Management**: Persistent login options and secure logout.

### 3.2. Executive Dashboard

- **Metric Highlights**: Real-time cards for Total Products, Total Customers, Total Invoices, and Total Revenue.
- **Operational Pulse**: "Recent Invoices" snapshot for immediate visibility into billing status.
- **Inventory Health**: Visual indicators for stock levels and order fulfillment percentages.

### 3.3. Inventory Management

- **Product Registry**: Detailed list view with name, category, price, stock quantity, and barcode.
- **Low Stock Alerts**: Automated visual cues (amber/red) for items falling below threshold.
- **Product Lifecycle**: Tools to add, edit, and delete SKUs with metadata support.

### 3.4. Customer Relationship Management

- **Client Directory**: Centralized database of names, emails, phones, and addresses.
- **Growth Tracking**: Visibility into "New Today" and "Total Growth" metrics for the customer base.

### 3.5. Invoicing & Billing

- **Invoice Creation**: Dynamic multi-line form with customer selection and auto-calculated totals.
- **Status Tracking**: Management of Paid, Pending, Sent, and Overdue invoice states.
- **Reporting**: High-level view of Total Receivables and Average Payment Days.

### 3.6. User & Team Management (Admin Only)

- **Staff Directory**: Overview of all users, roles, and activity status.
- **Access Logs**: Security-focused oversight of login attempts and protocol adherence.

## 4. Design & UX Principles

- **Visual Language**: Clean B2B SaaS aesthetic, light theme with primary blue accents (#2563eb).
- **Typography**: Inter (Sans-serif) for high readability.
- **Components**: Rounded cards (8px), subtle shadows, and generous whitespace.
- **Navigation**: Persistent left-hand sidebar for rapid module switching.

## 5. Technical Specification

- **Architecture**: Single Page Application (SPA).
- **Frontend**: Modern HTML5, Tailwind CSS for styling, and JavaScript for dynamic interactivity.
- **Responsiveness**: Optimized for Desktop (Main Admin) with adaptive layouts for information density.
