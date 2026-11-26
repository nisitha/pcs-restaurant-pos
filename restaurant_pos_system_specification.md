# Restaurant Management & POS System

## Product Requirements & Functional Specification

**Document type:** Software Requirements Specification (SRS)\
**Version:** 1.0\
**Status:** Initial planning draft\
**Scope:** A complete, extensible restaurant POS and operations
management system

------------------------------------------------------------------------

## 1. Project Overview

The goal is to build a professional Restaurant Management & Point of
Sale (POS) system that manages the restaurant's daily operations from
order entry and billing to kitchen preparation, serving, inventory,
staff management, and business reporting.

The system must do more than generate bills. When a cashier or waiter
submits an order, the system must identify it with a unique order
number, route the relevant items to the correct preparation station,
track preparation progress, notify the service team when items are
ready, and maintain a complete order and payment history.

The architecture should support a single restaurant initially while
remaining suitable for future multi-branch expansion.

## 2. Core Objectives

-   Process customer orders and payments quickly and accurately.
-   Send orders to kitchen stations automatically.
-   Track each order from creation to completion.
-   Coordinate cashiers, waiters, chefs, managers, and owners.
-   Manage tables, takeaway orders, and delivery orders.
-   Track ingredients, recipes, purchases, wastage, and stock levels.
-   Provide reliable sales, financial, operational, and inventory
    reports.
-   Support thermal printers and multiple device types.
-   Continue essential operations during internet outages where
    technically supported.

## 3. User Roles and Permissions

The system must use role-based access control. Each user should have an
individual login or PIN, and sensitive actions should be
permission-controlled.

  -----------------------------------------------------------------------
  Role                                Main permissions
  ----------------------------------- -----------------------------------
  Super Admin                         Full system configuration and
                                      access

  Owner                               Business dashboard, reports,
                                      branches, settings

  Manager                             Orders, staff supervision,
                                      approvals, discounts, refunds

  Cashier                             POS, billing, payments, receipt
                                      printing, assigned cash shift

  Waiter                              Table management, order entry,
                                      order status, serving

  Chef / Kitchen Staff                Kitchen orders, preparation status,
                                      station queue

  Store Keeper                        Inventory, suppliers, purchases,
                                      stock adjustments
  -----------------------------------------------------------------------

### Staff security and accountability

-   Individual user accounts and PIN login.
-   Role and permission management.
-   Login/logout history.
-   User activity and audit logs.
-   Cashier shift opening and closing.
-   Cash drawer opening/closing and cash reconciliation.
-   Manager approval for configured discounts, voids, cancellations, and
    refunds.
-   Record the user, timestamp, and reason for sensitive actions.

## 4. Main System Modules

### 4.1 POS / Cashier Counter

The POS screen should be optimized for fast touchscreen operation.

**Functions** - Dine-in, takeaway, and delivery order types. - Menu
categories and item search. - Product variants, sizes, and modifiers. -
Add-ons and extras. - Item-level and order-level notes. - Special
preparation instructions. - Quantity changes and item removal, subject
to permissions and order status. - Discounts, promotions, and service
charges. - Taxes and configurable charges. - Hold and resume orders. -
Split bills by item or customer. - Merge bills where permitted. -
Partial and multiple payments. - Cash, card, bank transfer, and other
configurable payment methods. - Receipt printing and reprinting. - Order
history and bill lookup. - Customer selection or quick customer
creation.

### 4.2 Order Management

Every order must receive a unique, human-readable order number.

**Order information** - Order number. - Order type. - Table number,
where applicable. - Customer details, where applicable. - Ordered items,
quantities, modifiers, and notes. - Created-by user and timestamps. -
Kitchen station routing. - Order status and status history. - Subtotal,
discounts, charges, taxes, and total. - Payment status and payment
records.

**Suggested order lifecycle**

1.  Draft
2.  Submitted / Confirmed
3.  Sent to Kitchen
4.  Accepted / In Preparation
5.  Partially Ready (where an order has multiple stations or items)
6.  Ready
7.  Served / Collected / Dispatched
8.  Completed / Paid
9.  Cancelled or Refunded, where applicable

The system should distinguish preparation status from payment status. An
order can be in preparation while payment is pending, depending on
restaurant policy.

### 4.3 Kitchen Display System (KDS) and Kitchen Order Tickets (KOT)

The kitchen interface should display incoming orders in real time,
without requiring kitchen staff to refresh the page.

**Functions** - New order alerts. - Order number, table number, order
time, and item quantities. - Item modifiers and special instructions
highlighted clearly. - Preparation timers and elapsed-time indicators. -
Accept / start preparation / mark ready actions. - Item-level and
station-level status tracking. - Priority marking. - Filter by station,
status, or order type. - Completed order history. - Sound or visual
alerts for new orders. - KOT printing and reprinting. - Record
preparation status changes and the responsible staff member.

### 4.4 Kitchen Station Routing

Menu items should be assignable to preparation stations.

**Example** - Fried rice → Hot Kitchen - Coffee and juice → Beverage
Station - Burger → Grill Station - Dessert → Dessert Station

A single customer order may be split automatically across multiple
stations. All station tickets must retain the same parent order number
so the cashier and waiter can track the complete order.

### 4.5 Table Management

-   Visual restaurant floor plan.
-   Configurable floors, sections, and tables.
-   Available, occupied, reserved, and cleaning statuses.
-   Assign an order to a table.
-   View current table order and elapsed dining time.
-   Add items to an existing table order.
-   Transfer an order between tables.
-   Merge or split tables.
-   Table-wise billing.
-   Table reservation support, if enabled.

### 4.6 Waiter Panel

-   View assigned tables and open orders.
-   Create and submit table orders.
-   Add items to existing orders.
-   View kitchen progress.
-   Receive ready notifications.
-   Mark items or orders as served.
-   Request assistance or flag delayed orders.
-   Transfer tables or request manager approval where required.

### 4.7 Takeaway and Delivery Management

**Takeaway** - Create takeaway orders. - Customer name and contact
number. - Estimated collection time. - Order-ready
notification/status. - Collected status.

**Delivery** - Customer name and phone number. - Delivery address and
delivery instructions. - Delivery fee. - Rider assignment. -
Preparation, ready, dispatched, and delivered statuses. - Delivery notes
and proof-of-delivery option, if required. - Delivery order history.

### 4.8 Menu and Product Management

-   Menu categories and subcategories.
-   Food and beverage items.
-   Item images and descriptions.
-   Selling prices.
-   Variants, sizes, and portion options.
-   Add-ons and modifier groups.
-   Combo meals and meal deals.
-   Availability schedules.
-   Temporarily mark an item unavailable.
-   Assign items to kitchen stations.
-   Configure tax, service charge, and discount eligibility.
-   Track menu price changes.

### 4.9 Recipe and Ingredient Management

Each menu item may have a recipe/BOM (Bill of Materials) defining its
ingredient quantities.

**Example: Chicken Fried Rice**

  Ingredient     Example quantity
  ------------ ------------------
  Rice                      250 g
  Chicken                   100 g
  Egg                           1
  Carrot                     30 g
  Oil                       20 ml

When a sale is completed or reaches the configured stock-deduction
point, the system should deduct the recipe ingredients from stock. The
deduction trigger must be configurable and carefully designed to avoid
duplicate deductions when orders are edited, cancelled, or refunded.

**Functions** - Recipe creation and editing. - Ingredient units and
conversions. - Recipe costing. - Estimated food cost per dish. -
Expected gross margin. - Ingredient substitution rules, if required. -
Recipe version history. - Stock deduction and reversal rules.

### 4.10 Inventory and Stock Management

-   Ingredient and stock-item register.
-   Units of measure and unit conversions.
-   Opening stock.
-   Stock receipts and adjustments.
-   Stock transfers between locations or branches.
-   Minimum stock levels and low-stock alerts.
-   Batch and expiry tracking, if required.
-   Wastage and spoilage records.
-   Stock count and variance reports.
-   Current stock valuation.
-   Theoretical versus actual consumption.
-   Stock movement history.
-   Permissions for adjustments.

### 4.11 Supplier and Purchase Management

-   Supplier records and contact details.
-   Purchase orders.
-   Goods received notes.
-   Supplier invoices and purchase costs.
-   Partial deliveries.
-   Purchase returns.
-   Supplier payment tracking, if included.
-   Purchase history and supplier reports.
-   Update stock only from approved receiving transactions.

### 4.12 Customer Management and Loyalty

-   Customer profiles.
-   Contact details.
-   Order and purchase history.
-   Customer notes and preferences, subject to privacy policy.
-   Customer groups.
-   Loyalty points.
-   Rewards and redemption.
-   Membership or discount levels.
-   Customer balance or credit only if explicitly enabled and
    controlled.

### 4.13 Discounts, Promotions, and Pricing

-   Item-level discounts.
-   Order-level discounts.
-   Fixed amount or percentage discounts.
-   Scheduled promotions.
-   Happy-hour pricing.
-   Combo pricing.
-   Customer-specific offers.
-   Discount limits by role.
-   Manager approval for discounts above configured thresholds.
-   Full audit trail of discount use.

### 4.14 Payments, Cash Shifts, and Refunds

-   Multiple payment methods per bill.
-   Split payments.
-   Partial payments.
-   Payment reference capture for card or bank payments.
-   Configurable service charges and taxes.
-   Receipt and payment history.
-   Cashier shift opening float.
-   Cash in/out entries with reasons.
-   Shift closing and expected-versus-counted cash.
-   Cash shortage and overage reports.
-   Refunds and voids with reasons and permission checks.
-   Refund-to-original-payment-method policy, where applicable.

### 4.15 Reports and Analytics

**Sales reports** - Daily, weekly, monthly, and custom-period sales. -
Sales by menu item and category. - Best- and least-selling items. -
Sales by order type. - Sales by cashier and waiter. - Sales by payment
method. - Discounts, voids, cancellations, and refunds. - Average order
value. - Peak sales periods.

**Kitchen and operations reports** - Average preparation time. - Orders
delayed beyond target time. - Station workload. - Order completion
times. - Cancelled items and reasons.

**Inventory and purchasing reports** - Current stock. - Low-stock
items. - Stock movement. - Purchase history. - Wastage. - Stock
variance. - Theoretical ingredient consumption. - Food cost by menu
item.

**Financial reports** - Revenue and configured tax/charge summaries. -
Expenses, if expense management is enabled. - Estimated gross profit
based on recipe cost. - Cashier shift reconciliation. - Payment
reconciliation.

Reports must clearly distinguish sales revenue, collected payments,
outstanding balances, refunds, taxes, and estimated profit. Profit
calculations should disclose which costs are included.

### 4.16 Owner Dashboard

The dashboard should provide a concise view of current business
performance:

-   Today's sales.
-   Today's order count.
-   Open and pending orders.
-   Kitchen orders in progress.
-   Ready orders awaiting collection or service.
-   Average order value.
-   Best-selling items.
-   Sales by payment method.
-   Low-stock alerts.
-   Cashier shift status.
-   Sales trends and peak hours.

### 4.17 QR Code Ordering (Optional)

-   Unique QR code per table.
-   Customer scans and views the menu.
-   Customer selects items and submits an order.
-   Order is linked to the correct table.
-   Optional staff confirmation before sending to the kitchen.
-   Customer can view order status.
-   Payment integration can be added if required.

### 4.18 Online Ordering and Delivery Integration (Optional)

-   Online menu and ordering page.
-   Orders flow into the same POS order queue.
-   Configurable pickup and delivery options.
-   Delivery zones and fees.
-   Order acceptance and preparation status.
-   Integration with third-party delivery services only where supported
    and approved.

### 4.19 Multi-Branch Management (Future-Ready)

-   Multiple branches under one organization.
-   Branch-specific menus, prices, taxes, and settings.
-   Branch-specific staff and permissions.
-   Separate stock and suppliers, where required.
-   Inter-branch stock transfers.
-   Consolidated owner dashboard.
-   Branch-wise and consolidated reports.
-   Data isolation and branch-level access controls.

## 5. End-to-End Order Workflow

### Example: Dine-in order

1.  Cashier or waiter selects Dine-in.
2.  User selects a table.
3.  User adds menu items, modifiers, quantities, and special
    instructions.
4.  User confirms and submits the order.
5.  System generates a unique order number.
6.  System routes each item to its configured kitchen station.
7.  Relevant KDS screens receive the order in real time.
8.  Kitchen staff accept and start preparing items.
9.  Staff update item or station statuses.
10. When items are ready, the waiter/cashier receives a notification.
11. Waiter serves the items and marks them served.
12. Cashier generates or finalizes the bill.
13. Customer pays using one or more payment methods.
14. System records payment and closes the order according to configured
    policy.
15. Stock, reports, and audit records are updated according to the
    transaction rules.

### Example: Multi-station order

A customer orders a burger, coffee, and dessert. The system creates one
parent order and routes: - Burger to Grill. - Coffee to Beverage
Station. - Dessert to Dessert Station.

Each station updates its own ticket. The parent order shows the combined
progress, allowing the waiter to see which items are ready and which
remain in preparation.

## 6. Important Business Rules

-   Every order must have a unique identifier.
-   Order number and table number must remain visible throughout the
    workflow.
-   Kitchen screens must receive submitted orders promptly.
-   Changes to submitted orders must generate an update or amendment
    ticket for the relevant kitchen station.
-   Removed or cancelled kitchen items must be clearly communicated to
    the station.
-   Sensitive actions must record user, time, and reason.
-   Paid orders must not be silently edited.
-   Refunds and voids must use controlled permission workflows.
-   Stock movements must be traceable to their source transaction.
-   Stock deduction and reversal must be idempotent to prevent duplicate
    movements.
-   Payment records must not be overwritten; corrections should use
    reversal or refund transactions.
-   All timestamps should be stored consistently and displayed in the
    restaurant's configured local time zone.
-   The system must preserve an audit history for important operational
    and financial events.

## 7. Hardware and Device Support

The system should be designed to work with: - Desktop PCs and laptops. -
Touchscreen POS terminals. - Android tablets. - Kitchen display
screens. - 58 mm and 80 mm thermal receipt printers. - Kitchen ticket
printers. - Cash drawers connected to supported receipt printers. -
Barcode scanners, if stock workflows require them. - Customer-facing
display screens, if required.

Hardware compatibility must be verified against the selected operating
system, browser, printer model, and connection method before
implementation.

## 8. Technical and Non-Functional Requirements

### 8.1 Real-Time Communication

-   Cashier, kitchen, and waiter screens should receive live order
    updates.
-   Use a reliable real-time communication mechanism.
-   Provide reconnection handling and visible connection status.
-   Prevent duplicate orders when a device reconnects or retries a
    request.

### 8.2 Offline and Local Network Operation

-   Essential POS and kitchen operations should continue during an
    internet outage where the deployment architecture supports it.
-   For a single restaurant, consider a local server or local-network
    deployment.
-   Clearly distinguish internet connectivity from local-network
    connectivity.
-   Queue permitted offline transactions and synchronize them safely.
-   Define conflict-resolution rules before enabling multi-device
    offline writes.
-   Do not promise offline operation until the chosen architecture and
    hardware have been tested.

### 8.3 Security

-   Secure authentication and password handling.
-   Role-based permissions.
-   Session expiry and device logout.
-   Audit logs.
-   Encrypted network connections.
-   Input validation and protection against common web vulnerabilities.
-   Regular security updates.
-   Restricted access to financial and customer information.

### 8.4 Backup and Recovery

-   Automated database backups.
-   Backup retention policy.
-   Off-device or off-site backup copy.
-   Restore testing.
-   Documented recovery procedure.
-   Backup status visible to authorized administrators.

### 8.5 Performance and Reliability

-   Fast POS item search and order submission.
-   Kitchen updates should appear promptly under normal network
    conditions.
-   Handle concurrent users and multiple devices.
-   Use database transactions for order, payment, and stock operations.
-   Monitor errors and failed background jobs.
-   Provide graceful handling of printer or network failures.

### 8.6 Usability

-   Touch-friendly screens.
-   Clear, high-contrast order statuses.
-   Minimal steps for common cashier tasks.
-   Keyboard support where practical.
-   Responsive layouts for supported screen sizes.
-   Clear error messages and confirmation prompts for destructive
    actions.

## 9. Suggested Main Screens

1.  Login / PIN screen.
2.  Owner dashboard.
3.  POS billing screen.
4.  Order details screen.
5.  Order history screen.
6.  Kitchen display screen.
7.  Kitchen station settings.
8.  Waiter panel.
9.  Restaurant floor plan.
10. Table details screen.
11. Menu and category management.
12. Item modifiers and combo management.
13. Recipe management.
14. Ingredient and inventory screens.
15. Purchase order and goods receiving screens.
16. Supplier management.
17. Customer management.
18. Discounts and promotions.
19. Payment and refund screens.
20. Cashier shift opening/closing.
21. Staff and role management.
22. Reports and analytics.
23. Branch management.
24. System settings and audit logs.

## 10. Suggested Development Phases

### Phase 1 --- Core Restaurant Operations

-   Authentication and roles.
-   Menu and category management.
-   POS billing.
-   Dine-in, takeaway, and delivery order creation.
-   Unique order numbers.
-   Table management.
-   KOT printing.
-   Kitchen Display System.
-   Kitchen station routing.
-   Order status tracking.
-   Payment processing and receipts.
-   Basic sales reports.

**Phase 1 acceptance goal:** A restaurant can create an order at the
counter, route items to the correct kitchen stations, track preparation,
serve the customer, accept payment, and retrieve the transaction
history.

### Phase 2 --- Stock and Staff Control

-   Ingredient and recipe management.
-   Automatic stock deduction.
-   Inventory adjustments and stock counts.
-   Suppliers and purchasing.
-   Wastage tracking.
-   Staff management and permissions.
-   Cashier shift management.
-   Audit logs.
-   Inventory and cashier reports.

### Phase 3 --- Business Intelligence and Customer Features

-   Advanced dashboards.
-   Food cost and margin analysis.
-   Customer database.
-   Loyalty and rewards.
-   Promotions and happy-hour pricing.
-   Advanced operational reports.

### Phase 4 --- Expansion and Integrations

-   QR code ordering.
-   Online ordering.
-   Delivery rider management.
-   Mobile owner dashboard.
-   Multi-branch management.
-   Third-party integrations, where available.
-   Advanced offline synchronization.

## 11. Initial Acceptance Criteria

The first production-ready release should meet at least these criteria:

-   An authorized cashier can create and submit a dine-in, takeaway, or
    delivery order.
-   The system generates a unique order number.
-   Dine-in orders can be linked to a table.
-   Items route to the correct kitchen station based on menu
    configuration.
-   Kitchen screens receive orders without manual refresh under normal
    network conditions.
-   Kitchen staff can update preparation status.
-   The cashier or waiter can see the latest order status.
-   Changes and cancellations after submission are communicated to the
    kitchen and logged.
-   A bill can be paid using supported payment methods.
-   Receipts and kitchen tickets can be printed on configured printers.
-   A manager can review order, payment, cancellation, and refund
    history.
-   The system prevents duplicate payment and stock transactions.
-   Authorized users can view basic daily sales and payment reports.

## 12. Decisions to Confirm Before Development

The following requirements need confirmation before finalizing the
architecture and implementation plan:

1.  **Restaurant type:** Full-service restaurant, fast food, cafe, hotel
    restaurant, food court, or general-purpose.
2.  **Order workflow:** Cashier + Kitchen Display + Waiter; waiter
    tablet + kitchen display + cashier; cashier + kitchen printer; or a
    flexible combination.
3.  **Branch setup:** Single branch, multiple branches, or single branch
    initially with multi-branch-ready architecture.
4.  **Deployment:** Cloud-hosted, local server, or hybrid
    local-plus-cloud.
5.  **Internet outage requirement:** Must the restaurant continue
    billing and kitchen operations when the internet is unavailable?
6.  **Hardware:** Windows POS, Android tablets, touchscreens, receipt
    printers, kitchen printers, and cash drawers.
7.  **Payments:** Cash, card terminal, bank transfer, QR payment, or
    online payment gateway.
8.  **Tax and invoicing:** Applicable local tax rules, receipt format,
    and invoice requirements should be confirmed with the
    restaurant/accountant.
9.  **Language and currency:** English, Sinhala, Tamil, or multilingual;
    currency and number formatting.
10. **Integrations:** Existing accounting, delivery, website, or payment
    systems.

## 13. Recommended Implementation Principle

Build the first release around a dependable order lifecycle and kitchen
workflow. The POS, order service, kitchen station routing, payment
records, and inventory movements should have clearly defined
responsibilities and transaction rules.

Avoid implementing every advanced feature before the core
order-to-kitchen-to-payment workflow is stable. Design the database and
permissions for future expansion, but deliver the system in tested
phases.

------------------------------------------------------------------------

**End of document**
