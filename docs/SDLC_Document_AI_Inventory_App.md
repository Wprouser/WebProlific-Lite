# Software Development Life Cycle (SDLC) Document
## AI-Powered Inventory Management System for Small Hotels & Restaurants

**Document Version:** 1.0
**Date:** July 19, 2026
**Prepared For:** Product & Engineering Stakeholders
**Classification:** Internal / Confidential

---

## 1. Introduction

### 1.1 Purpose
This document defines the complete Software Development Life Cycle plan for building a lightweight, cloud-based **Inventory Management System (IMS)** tailored to small and mid-sized hotels and restaurants. The product's key differentiator is a set of embedded **AI features** designed to reduce food/stock wastage, prevent stockouts, and give owners insights that were previously only available to large hotel chains — making the product significantly more attractive and defensible in the market.

### 1.2 Business Problem
Small hotels and restaurants typically manage inventory using spreadsheets, paper logs, or basic POS add-ons. This leads to:
- Overstocking or understocking of perishables
- Food wastage due to expiry, poor rotation, or over-purchasing
- No visibility into consumption patterns tied to menu items
- Manual, error-prone stock counting and reconciliation
- No forecasting ability during seasonal demand swings (festivals, weekends, events)

### 1.3 Product Vision
A simple, mobile-first inventory app that any small F&B/hospitality business can set up in under an hour, which gets *smarter the more it's used* — using AI to predict, recommend, and automate rather than just record. The product should look and feel like a premium, purpose-built tool — modern, polished, and visually confident — not a generic back-office admin panel, since visual quality is itself part of what makes the product easy to sell into a competitive market.

### 1.4 Target Users
- Independent hotels (10–100 rooms) and hotel/restaurant chains with multiple properties
- Standalone and small-chain restaurants, cafes, cloud kitchens
- Roles span three organizational levels — see 1.5 below

### 1.5 Organizational Hierarchy (Multi-Tenancy)
The application is built to support businesses of any size within the same model, from a single standalone restaurant up to a multi-property hospitality group:

- **Chain** — the overall business entity (e.g., a hospitality group). Owns the account/subscription.
- **Property** — a physical site belonging to a chain (e.g., a specific hotel, or a specific restaurant branch). A chain can have one or many properties.
- **Outlet** — an operational unit within a property where inventory is actually tracked (e.g., a hotel's main restaurant, its pool bar, or its room-service kitchen). A property can have one or many outlets.

A single standalone restaurant simply has one chain, one property, and one outlet — the hierarchy doesn't add complexity for small customers, but lets the same product scale to multi-property chains without a different data model or a separate "enterprise" version.

---

## 2. Scope

### 2.1 In Scope
- Web application (responsive) + mobile app (Android/iOS) for stock entry and alerts, with a modern, polished, "smart" visual design across both
- Multi-tenant organizational hierarchy: Chain → Property → Outlet, supporting single restaurants up to multi-property hotel/restaurant chains
- User authentication with two-factor authentication (2FA), password reset, and scope-based user/role management (chain, property, or outlet level)
- Multi-outlet and multi-property support (single dashboard rolling up from outlet → property → chain)
- Purchase order, GRN (Goods Received Note), and supplier management, with tax and multi-currency support
- Recipe-based stock deduction linked to POS sales
- AI-driven forecasting, reorder suggestions, wastage prediction, and anomaly detection
- Reporting and analytics dashboard
- Role-based access control
- Multilingual UI, launching with English, Arabic, Hindi, and Urdu (Arabic/Urdu requiring full RTL layout), including a language switcher on the Login screen itself, architected to add further languages without code changes
- Multi-currency transactions with base-currency reporting
- System-wide Activity Log and Transaction Log for full operational and financial traceability

### 2.2 Out of Scope (Phase 1)
- Full accounting/GST invoicing suite (integration only, not native)
- HR/payroll management
- Table/room reservation management (integration hooks only)
- Hardware POS terminal manufacturing (software integration only)

---

## 3. Stakeholders

| Role | Responsibility |
|---|---|
| Product Owner | Defines features, prioritizes backlog, owns AI roadmap |
| Project Manager | Timeline, resource allocation, sprint tracking |
| UI/UX Designer | Mobile-first, low-training-curve interface |
| Backend Developers | Core inventory engine, APIs, integrations |
| AI/ML Engineer | Forecasting models, anomaly detection, OCR/vision features |
| QA/Test Engineers | Functional, performance, and AI-model validation testing |
| DevOps Engineer | CI/CD, cloud infra, monitoring |
| Pilot Customers (Hotels/Restaurants) | UAT feedback, real-world validation |

---

## 4. SDLC Methodology

**Chosen Model: Agile (Scrum), 2-week sprints**

Rationale: The AI components (forecasting accuracy, recommendation relevance) benefit from iterative refinement using real pilot-customer data, which a linear Waterfall model cannot accommodate well. Agile also allows the core inventory module to reach market fast (MVP) while AI features are layered in subsequent sprints.

**Phases:**
1. Requirement Gathering & Analysis
2. System & AI Model Design
3. Sprint-based Development (Core → AI layer)
4. Testing (Functional, Integration, AI validation, UAT)
5. Deployment (Phased rollout: pilot → general availability)
6. Maintenance & Continuous Model Improvement

---

## 5. Requirements

### 5.1 Functional Requirements — Core Inventory Module

Summary table, followed by a detailed specification of each function below.

| ID | Requirement |
|---|---|
| FR-00 | Multi-tenant organizational hierarchy: Chain → Property → Outlet, with scope-based user access |
| FR-01 | Add/edit/delete inventory items with category, unit, SKU, min/max stock levels |
| FR-02 | Record stock-in (purchases/GRN) and stock-out (usage, wastage, transfer) |
| FR-03 | Supplier management with contact, pricing history, lead time |
| FR-04 | Purchase order generation and approval workflow, including tax and multi-currency handling |
| FR-05 | Recipe/BOM mapping — link menu items to raw material consumption |
| FR-06 | Auto stock deduction on POS sale (via POS integration/API) |
| FR-07 | Low-stock and expiry alerts (push/SMS/email) |
| FR-08 | Multi-outlet/property inventory transfer and consolidated dashboard (outlet → property → chain rollup) |
| FR-09 | Barcode/QR scanning for stock entry |
| FR-10 | Reports: stock valuation, consumption trends, wastage log, supplier performance |
| FR-11 | Role-based access (Chain Owner, Property Manager, Outlet Manager, Store Staff, Chef) |
| FR-12 | Offline mode with sync-on-reconnect (for poor-connectivity kitchens) |
| FR-13 | User login with two-factor authentication (2FA), session management, and password reset |
| FR-14 | User management screen (invite, assign chain/property/outlet access, deactivate) |
| FR-15 | Multilingual UI (launching with English, Arabic, Hindi, Urdu; full RTL for Arabic/Urdu; language switcher on Login screen), extensible to further languages |
| FR-16 | Multi-currency transactions with base-currency valuation and reporting |
| FR-17 | Modern, polished "smart" design system applied consistently across web and mobile |
| FR-18 | System-wide Activity Log and Transaction Log for full traceability of actions and value movements |

---

#### FR-01: Item Master Management
**Actors:** Owner, Manager
**Description:** Central catalog of every item the business stocks (raw materials, packaging, cleaning supplies, etc.).
**Details:**
- Fields: Item name, category (e.g., Vegetables, Dairy, Beverages, Dry Goods), unit of measure (kg, litre, piece, box), SKU/internal code, barcode (optional), min stock level, max stock level, standard shelf-life (days), default supplier, cost price, storage location (e.g., Cold Storage, Dry Store).
- Add/edit/deactivate items (soft delete — items are never hard-deleted if they have transaction history, to preserve reporting accuracy).
- Bulk import via CSV/Excel for onboarding.
- Category management (create/edit item categories).
- Duplicate-SKU validation on creation.
**Business Rules:**
- Min stock level must be less than max stock level.
- An item cannot be deactivated if it has open purchase orders.

#### FR-02: Stock-In / Stock-Out Transactions
**Actors:** Store Staff, Manager, Chef
**Description:** Every physical movement of stock is logged as a transaction, forming the single source of truth for current stock levels.
**Details:**
- **Stock-In types:** Purchase (via GRN), Opening Balance, Inter-outlet Transfer-In, Stock Adjustment (correction).
- **Stock-Out types:** Usage/Consumption (manual or via recipe deduction), Wastage/Spoilage (with mandatory reason code: expired, damaged, spilled, over-prepared), Inter-outlet Transfer-Out, Stock Adjustment.
- Each transaction records: item, quantity, unit, date/time, performed-by user, reference (PO/GRN number or reason), and resulting running balance.
- Wastage entries require a reason code and optional photo attachment (also feeds AI-03 wastage prediction model).
**Business Rules:**
- Stock-out cannot exceed current available quantity (system blocks negative stock, with an admin override option logged separately).
- All transactions are immutable once saved; corrections are made via a new adjustment entry, never by editing history (audit-trail integrity).

#### FR-03: Supplier Management
**Actors:** Manager, Purchase Staff
**Description:** Maintains a directory of suppliers and their commercial terms.
**Details:**
- Fields: Supplier name, contact person, phone/email, address, payment terms (e.g., Net 15/30), items supplied, average lead time (days).
- Price history log — every price quoted/invoiced by a supplier per item is stored with date, enabling trend tracking (feeds AI-09).
- Supplier rating/performance (auto-calculated from on-time delivery % and price consistency).
- Ability to mark preferred supplier per item.
**Business Rules:**
- A supplier cannot be deleted if linked to an open PO; can be deactivated instead.

#### FR-04: Purchase Order (PO) & Approval Workflow
**Actors:** Store Staff (creates), Manager/Owner (approves)
**Description:** Formal request-to-buy workflow before stock is procured.
**Details:**
- Create PO: select supplier, add items with quantity and expected price, expected delivery date.
- PO status flow: Draft → Pending Approval → Approved → Sent to Supplier → Partially Received → Fully Received → Closed. (Also: Rejected, Cancelled.)
- Approval threshold configurable (e.g., POs above a certain value require Owner approval, not just Manager).
- On receipt, PO is converted into a GRN (Goods Received Note) — quantities received are matched against ordered quantities, with variance flagged (short/excess delivery).
- GRN completion automatically creates Stock-In transactions (FR-02) and updates supplier price history (FR-03).
**Business Rules:**
- Partial receipt is allowed; PO remains open until fully received or manually closed.
- Price/quantity variances beyond a configurable tolerance require Manager sign-off before the GRN is finalized.

#### FR-05: Recipe / Bill of Materials (BOM) Mapping
**Actors:** Manager, Chef
**Description:** Links each sellable menu item to the raw materials/quantities consumed to produce it — the foundation for automatic stock deduction and cost analysis.
**Details:**
- For each menu item, define a recipe: list of raw material items + quantity consumed per serving/unit.
- Support for sub-recipes (e.g., a "sauce base" recipe used inside multiple menu items).
- Recipe cost auto-calculated from current ingredient costs (feeds AI-08 menu engineering insights).
- Version history when a recipe is edited (so past sales are costed against the recipe version active at the time).
**Business Rules:**
- A menu item cannot be marked "active for sale" until it has at least one recipe mapping (configurable enforcement).

#### FR-06: Auto Stock Deduction on POS Sale
**Actors:** System (triggered by POS integration)
**Description:** When a menu item is sold via the POS system, the corresponding raw materials are automatically deducted from stock per the recipe/BOM.
**Details:**
- Integration via POS webhook/API — on each sale event received, system looks up the recipe and creates the corresponding Stock-Out (Usage) transactions.
- Supports partial/void/refund sales — reverses the corresponding stock deduction.
- Manual override available if a POS integration is not yet available for a given outlet (staff logs consumption manually against menu items sold).
**Business Rules:**
- If a recipe is missing for a sold item, the system logs a warning and prompts staff to map it (falls back to no auto-deduction for that item until mapped).

#### FR-07: Low-Stock & Expiry Alerts
**Actors:** Store Staff, Manager, Owner
**Description:** Proactive notifications so nobody has to manually check stock levels.
**Details:**
- Triggers: item quantity falls below min stock level; item approaching expiry (configurable lead time, e.g., 3 days before shelf-life end); item fully out of stock.
- Delivery channels: in-app push notification, SMS (optional, for critical alerts), email digest (daily summary option).
- Alert routing configurable by role (e.g., Store Staff gets low-stock alerts; Owner gets a daily digest only).
- Alerts are actionable — tapping a low-stock alert can directly initiate a PO draft for that item.
**Business Rules:**
- Duplicate alerts for the same item/condition are suppressed for a configurable cooldown period (e.g., once per 24 hours) to avoid notification fatigue.

#### FR-08: Multi-Outlet Transfer & Consolidated Dashboard
**Actors:** Owner (multi-outlet), Manager
**Description:** For businesses with more than one location, enables stock movement between outlets and a single consolidated view.
**Details:**
- Inter-outlet transfer request: source outlet, destination outlet, items, quantities, dispatch date.
- Transfer status: Requested → In Transit → Received (creates Stock-Out at source and Stock-In at destination automatically on confirmation).
- Consolidated dashboard: aggregated stock value, low-stock items, and consumption trends across all outlets, with drill-down to per-outlet detail.
**Business Rules:**
- Only Owner/Manager roles (not Store Staff) can initiate cross-outlet transfers, to prevent unauthorized stock movement.

#### FR-09: Barcode / QR Scanning for Stock Entry
**Actors:** Store Staff
**Description:** Speeds up stock-in/stock-out entry by scanning rather than manual search/typing.
**Details:**
- Mobile app camera used as scanner (no separate hardware required for MVP; dedicated hardware scanner support added later if needed).
- Scanning an item's barcode pre-fills the item in a stock transaction screen; staff only needs to enter quantity.
- Support for generating and printing internal QR labels for items that don't have a manufacturer barcode (e.g., bulk repackaged goods).
**Business Rules:**
- Unrecognized barcodes prompt a "create new item" flow rather than failing silently.

#### FR-10: Reporting Suite
**Actors:** Owner, Manager
**Description:** Standard reports needed to run the business, exportable as PDF/Excel.
**Details:**
- **Stock Valuation Report** — current stock quantity × cost price, by item/category/outlet, at a point in time.
- **Consumption Trend Report** — usage of each item over a selected date range, with graphing.
- **Wastage Log Report** — all wastage transactions with reason codes, quantities, and estimated cost impact.
- **Supplier Performance Report** — on-time delivery %, price trend, order fulfillment accuracy per supplier.
- **Purchase vs. Consumption Report** — compares what was bought vs. what was used, highlighting overstock risk.
- All reports filterable by date range, outlet, and category; scheduled email delivery option (e.g., weekly wastage report to Owner).

#### FR-11: Role-Based Access Control (RBAC)
**Actors:** System Admin, Owner
**Description:** Ensures each user only sees/does what's relevant to their role.
**Details:**
- Predefined roles: **Owner** (full access, all outlets), **Manager** (full access, assigned outlet(s)), **Store/Inventory Staff** (stock-in/out, PO creation — no approval, no financial reports), **Chef/Kitchen Staff** (usage/wastage entry, recipe view-only).
- Custom role/permission editing for advanced setups (Phase 2+).
- Every action is tied to a user ID for audit-trail purposes (who created/approved/edited what, and when).
**Business Rules:**
- Financial fields (cost price, stock valuation) are hidden from the Chef/Kitchen Staff role by default.

#### FR-12: Offline Mode with Sync-on-Reconnect
**Actors:** Store Staff, Chef (mobile app users)
**Description:** Kitchens and stores in areas with unreliable internet must still be able to log stock movements.
**Details:**
- Mobile app caches item master data locally and queues stock transactions (in/out/wastage) created while offline.
- On reconnect, queued transactions sync automatically in the order they were created; conflicts (e.g., two staff members recording against the same item while both offline) are flagged for Manager review rather than silently overwritten.
- Visual indicator in the app showing "Offline — X transactions pending sync."
**Business Rules:**
- Transactions that would cause negative stock are still queued locally but flagged for review on sync rather than blocked outright (since the true current stock level isn't verifiable offline).

### 5.2 AI Feature Requirements (Key Market Differentiator)

| ID | AI Feature | Description | Business Value |
|---|---|---|---|
| AI-01 | **Demand Forecasting** | ML model predicts ingredient/item demand using historical sales, day-of-week, season, local events/holidays | Reduces overstocking/understocking |
| AI-02 | **Smart Reorder Point Engine** | Dynamically recalculates reorder points and suggested order quantities per item based on consumption velocity and supplier lead time | Prevents stockouts without manual tracking |
| AI-03 | **Expiry & Wastage Prediction** | Flags items likely to expire unused based on current stock vs. predicted consumption; suggests menu promotions to use them up | Directly cuts food cost losses |
| AI-04 | **Invoice/Bill OCR Auto-Entry** | Snap a photo of a supplier invoice; AI extracts items, quantities, and prices to auto-populate GRN | Cuts manual data entry time drastically |
| AI-05 | **Visual Stock Counting** | Camera-based estimation of stock levels for bulk/loose items (e.g., sacks, crates) using image recognition | Faster, less error-prone physical counts |
| AI-06 | **Anomaly & Shrinkage Detection** | Detects unusual stock movement patterns (possible theft, wastage, or data entry errors) and alerts owner | Loss prevention |
| AI-07 | **AI Chat Assistant** | Natural-language queries like "What's running low today?" or "How much rice did we use this week?" | Improves usability for non-technical staff |
| AI-08 | **Menu Engineering Insights** | Cross-references item cost, consumption, and (optionally) sales price to flag low-margin or high-waste menu items | Helps owners improve profitability |
| AI-09 | **Supplier Price Intelligence** | Tracks price trends per supplier/item and flags better-priced alternatives or price hike anomalies | Cost optimization |
| AI-10 | **Voice-Based Stock Entry** | Kitchen staff can log usage via voice command in local language | Increases adoption among non-tech-savvy staff |

### 5.3 Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Page load < 2s; AI suggestions generated < 3s |
| Scalability | Support up to 10,000 SKUs and 10 outlets per account initially |
| Availability | 99.5% uptime SLA |
| Security | Data encryption at rest & in transit; two-factor authentication (2FA); role-based access scoped by chain/property/outlet; full activity and transaction audit logs |
| Usability | Minimal training required; onboarding under 60 minutes; modern, polished visual design consistent across web and mobile (see Section 5.2, FR-17) |
| Portability | Responsive web + native mobile (Android priority, iOS secondary) |
| Compliance | Local data protection regulations (e.g., India's DPDP Act); GST-ready export |
| Localization | Multilingual by design — launches with English, Arabic, Hindi, and Urdu (Arabic/Urdu requiring full RTL layout), selectable from the Login screen before authentication, architected so additional languages can be added via resource files without code changes |

---

## 6. System Architecture (High Level)

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│   Mobile App (Android/iOS)   |   Responsive Web Dashboard    │
└───────────────────────────┬───────────────────────────────────┘
                            │  REST/GraphQL APIs (HTTPS)
┌───────────────────────────▼───────────────────────────────────┐
│                    Application Layer                          │
│  Auth Service | Inventory Service | Purchase/Supplier Service │
│  Reporting Service | Notification Service | POS Integration   │
└───────────────────────────┬───────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                     AI/ML Layer                                │
│  Forecasting Engine | Anomaly Detection | OCR (Invoice)        │
│  Vision Model (Stock Count) | NLP Chat Assistant | Recommender │
└───────────────────────────┬───────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                     Data Layer                                 │
│   Primary DB (SQL Server) | Data Warehouse (for ML training)   │
│   Object Storage (invoice images) | Cache (Redis)              │
└─────────────────────────────────────────────────────────────┘
```

### 6.1 Suggested Technology Stack

| Layer | Technology |
|---|---|
| Frontend Web | React.js + Tailwind CSS (PWA-enabled, doubles as desktop app) |
| Mobile App | React Native |
| Backend | Node.js (NestJS) |
| Database | SQL Server (default recommendation), designed to be swappable — see 6.2 |
| AI/ML | Python (scikit-learn, Prophet/LightGBM for forecasting), OpenAI/Claude API or fine-tuned models for OCR & chat assistant |
| Infra | AWS / GCP (containerized via Docker + Kubernetes) |
| CI/CD | GitHub Actions / GitLab CI |
| Monitoring | Grafana + Prometheus, Sentry for error tracking |

### 6.2 Database Portability Strategy

The database is **SQL Server by default** (strong enterprise/Windows ecosystem fit, mature tooling, native vector data type for AI embedding/similarity search as of SQL Server 2025), but the system is architected so the team can migrate to **PostgreSQL, MySQL, or another RDBMS** later — for example if cost optimization at scale or a specific cloud/AI-tooling advantage makes it worthwhile — without a rewrite of the application layer.

This is achieved through the following design decisions, which the engineering team must treat as binding constraints, not optional best practices:

| Decision | How it enables DB portability |
|---|---|
| **ORM-based data access (Prisma or TypeORM)** | All queries go through the ORM's query builder/entity layer instead of raw, provider-specific SQL. Swapping the DB is largely a matter of changing the ORM's `provider` config and connection string. |
| **Repository Pattern** | Business logic (services) never calls the database directly — it calls a Repository interface (e.g., `ItemRepository`, `StockRepository`). The underlying implementation can be swapped per-database without touching business logic. |
| **No vendor-specific SQL features in core logic** | Avoid SQL Server-only syntax (e.g., `MERGE` statements, `OUTPUT` clauses, T-SQL-specific functions) in core transactional tables. Where SQL Server-specific features are used for performance (e.g., its native `VECTOR` type for AI embeddings), they are isolated behind a dedicated `EmbeddingService` so only that module needs rework on migration — not the whole app. |
| **Standardized migrations** | Use the ORM's migration tooling (e.g., Prisma Migrate) so schema changes are DB-agnostic definitions first, translated to provider-specific SQL automatically. |
| **Config-driven connection layer** | DB host, credentials, and provider type are environment-config driven (`.env` / secrets manager), not hardcoded — enabling environment-specific DB targets (e.g., SQL Server in production, PostgreSQL in a specific deployment) without code changes. |
| **Database-agnostic data types in schema design** | Favor common types (VARCHAR, INT, DECIMAL, DATETIME2, BIT) over provider-specific types in the core schema (Users, Items, Stock Transactions, Suppliers, POs) to minimize translation issues during migration. |
| **Integration/regression test suite runnable against multiple DB targets** | CI pipeline includes a job that runs the core test suite against both SQL Server and PostgreSQL containers periodically, catching portability regressions early rather than only at migration time. |

**Migration effort estimate (if/when needed):** With the above in place, a future migration from SQL Server to PostgreSQL (or vice versa) is expected to be a schema-translation + data-migration + QA exercise (roughly 1–3 sprints depending on data volume), rather than an application rewrite.

**Hosting note:** SQL Server can be run via Azure SQL Database (managed, recommended for production) or a self-hosted SQL Server instance on Windows/Linux containers; Prisma and NestJS both support SQL Server as a first-class provider.

---

## 7. Database Design (High-Level Entities)

- **Chains** (id, name, base_currency, subscription_plan)
- **Properties** (id, chain_id, name, type, address)
- **Outlets** (id, property_id, name, type, base_currency)
- **Users** (id, name, credentials, preferred_language, two_factor_enabled)
- **UserAccess** (id, user_id, scope_type: chain/property/outlet, scope_id, role)
- **Languages** (code, name, direction: ltr/rtl, is_active)
- **ActivityLog** (id, chain_id, property_id, outlet_id, user_id, category, action, description, metadata, timestamp)
- **TransactionLog** (id, outlet_id, transaction_type, reference_id, value_amount, currency_code, summary, timestamp)
- **Items** (id, name, category, unit, min_stock, max_stock, shelf_life_days)
- **Suppliers** (id, name, contact, payment_terms)
- **PurchaseOrders** (id, supplier_id, status, items[], created_by)
- **GRN** (id, po_id, received_items[], date)
- **StockTransactions** (id, item_id, type: in/out/wastage/transfer, qty, timestamp, source)
- **Recipes/BOM** (menu_item_id, ingredient_id, qty_per_serving)
- **Sales** (from POS integration: item_id, qty_sold, timestamp)
- **AI_Forecasts** (item_id, predicted_demand, date_range, confidence_score)
- **Alerts** (id, type, item_id, message, status)

---

## 8. Module Breakdown & Development Roadmap

### Phase 1 — MVP (Sprints 1–6): Core Inventory Engine
- User/outlet management, item master, stock in/out, supplier management, PO/GRN, basic low-stock alerts, basic reporting

### Phase 2 — Sprints 7–10: POS Integration & Recipe Engine
- Recipe/BOM mapping, auto-deduction from POS sales, multi-outlet dashboard, barcode scanning

### Phase 3 — Sprints 11–16: AI Layer v1
- Demand forecasting engine, smart reorder points, expiry/wastage prediction, invoice OCR auto-entry

### Phase 4 — Sprints 17–20: AI Layer v2 (Differentiators)
- AI chat assistant, anomaly/shrinkage detection, visual stock counting, menu engineering insights, voice entry

### Phase 5 — Sprint 21+: Polish, Scale & GA Launch
- Performance optimization, offline mode hardening, localization, security audit, pilot rollout feedback loop

---

## 9. Testing Strategy

| Test Type | Focus |
|---|---|
| Unit Testing | Individual service/API logic |
| Integration Testing | POS integration, supplier/PO workflow, AI service hooks |
| AI Model Validation | Forecast accuracy (MAPE/RMSE benchmarks), OCR extraction accuracy (%), anomaly false-positive rate |
| Performance Testing | Load testing for multi-outlet concurrent usage |
| Security Testing | Penetration testing, role-access verification, data encryption checks |
| UAT | Pilot hotels/restaurants test real workflows for 2–4 weeks before GA |
| Regression Testing | Automated suite run every sprint before release |

**AI-Specific Testing Notes:**
- Forecasting models validated against holdout historical data before going live per pilot customer
- OCR accuracy tracked per invoice format; manual correction UI required as fallback
- Anomaly detection tuned to minimize false alerts (target: <5% false-positive rate) to avoid alert fatigue

---

## 10. Deployment Plan

1. **Pilot Rollout:** 5–10 hotels/restaurants (mixed size) for 4–6 weeks
2. **Feedback Loop:** Weekly check-ins, bug triage, AI model recalibration based on real data
3. **Staged General Availability:** Regional rollout before national/international expansion
4. **Deployment Method:** Blue-green deployment via Kubernetes; feature flags for gradual AI feature enablement
5. **Data Migration:** CSV/Excel import tool for businesses migrating from spreadsheets

---

## 11. Maintenance & Support Plan

- **L1 Support:** In-app chat + email support (business hours)
- **Model Retraining:** Forecasting and anomaly-detection models retrained monthly using aggregated (anonymized) usage data
- **Patch Releases:** Bi-weekly minor releases; critical hotfixes as needed
- **Monitoring:** Uptime, API latency, and AI prediction-drift monitoring dashboards
- **Customer Feedback Loop:** In-app NPS surveys feeding directly into product backlog

---

## 12. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Low AI model accuracy with limited early data | Poor forecasts erode trust | Use industry benchmark data to bootstrap models; show confidence scores; allow manual override |
| Low tech adoption by kitchen/store staff | Poor usage, bad data quality | Simple UI, voice entry, regional language support, on-site onboarding for pilots |
| POS integration complexity (many POS vendors) | Delays in Phase 2 | Prioritize top 3–5 POS systems used by target segment; offer manual entry fallback |
| Connectivity issues in kitchens | Data loss/sync errors | Robust offline-first mobile design with conflict resolution on sync |
| Data privacy concerns | Legal/compliance risk | Encrypt data, clear consent for AI model training use, compliance review before GA |

---

## 13. Success Metrics (KPIs)

- Reduction in food/stock wastage (%) for pilot customers within 90 days
- Forecast accuracy (target: >80% within confidence band)
- Time saved on manual stock entry (target: 50%+ reduction via OCR/voice)
- Customer adoption rate of AI features (active usage %)
- Net Promoter Score (NPS) from pilot customers

---

## 14. Appendix

### 14.1 Glossary
- **BOM** – Bill of Materials (recipe-to-ingredient mapping)
- **GRN** – Goods Received Note
- **MAPE** – Mean Absolute Percentage Error (forecast accuracy metric)
- **OCR** – Optical Character Recognition
- **SKU** – Stock Keeping Unit

### 14.2 Assumptions
- Target customers have basic smartphone access and internet connectivity (at least intermittently)
- Pilot customers are willing to share historical sales/purchase data for AI model training
- POS integration APIs are available for target POS vendors in the pilot region

