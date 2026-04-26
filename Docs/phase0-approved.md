# Phase 0 Approved Context — CDC System

## Project Goal
Rebuild the current CDC internal system professionally without changing the current business policy or approval philosophy, then extend it with a new Operations layer.

## Existing Core Modules
1. Cost Control
2. Procurement / Purchase Requests
3. Pricing / Tendering
4. Admin / User Management

## What must remain unchanged
- Current business logic and approval philosophy
- Arabic-first UI
- Existing module names and general navigation
- Current approval flow for purchase requests:
  - Accountant
  - Cost Engineer
  - Manager
- Current pricing statuses:
  - Pricing In Progress
  - Priced & Submitted
  - Contracted / Awarded
  - Lost
- Existing cost control KPIs and cost table logic
- Existing dark navy / blue dashboard style

## Current System Observations
### Cost Control
- Project-level workspace
- Tabs:
  - Invoice Entry
  - Cost Table
  - Invoice Register
  - Extracts
  - Follow-up Dashboard
- Main KPI concepts:
  - Total Contract Value
  - Total Estimated Cost
  - Total Actual Cost
  - Total Recognized Revenue
  - Gross Profit
  - Profit Margins
  - Number of Projects

### Procurement
- Purchase request list
- New purchase request form
- Request details with line items
- Approval history per request
- Project-linked requests
- Cost-code-linked line items

### Pricing
- Tender/project register
- Add new tender/project form
- Dashboard charts by status, type, and location
- Filters and search
- Win/loss style tracking

### Admin
- User creation
- Role assignment
- Password management
- User table
- Project and request visibility

## Real-world missing layer
Field execution is currently managed outside the system using Excel and PDF schedules.
That means the major missing layer is Operations.

## New Operations Layer to be added later
- Project handover from pricing to execution
- Monthly planning
- Weekly lookahead
- Daily site reports
- Progress tracking
- Site issues / delays
- Materials / warehouse flow
- Subcontractor tracking
- Cash flow forecasting
- Closeout / punch list

## Roles observed or inferred
- Manager
- Accountant
- Cost Engineer
- Pricing Engineer
- Project Manager
- Site Engineer
- Warehouse Officer
- Standard User

## Technical direction
- Monorepo
- Frontend: Next.js 14+
- Backend: NestJS
- Database: PostgreSQL
- ORM: Prisma
- Auth: JWT + refresh tokens
- UI: Tailwind + shadcn/ui
- Arabic default, English secondary
- RTL/LTR support
- Dockerized local setup

## Important constraints
- Do not redesign the system from scratch
- Recreate current modules first
- Add Operations later as an extension layer
- Keep approvals configurable
- Treat uploaded Excel workbooks as future primary business-data import source
- Support project code, company/legal entity, and currency from the start
- Keep design close to current internal system and logo identity