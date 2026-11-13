# Next Priority Plan

## Product direction

The platform already has a strong foundation in authentication, school management, student records, academic structure, and enrollment flows. The next big value unlock is in the billing and payments layer.

## Recommended focus order

### 1) Fee & Billing foundation
This is the highest-priority business capability and should be tackled first.

Goals:
- Define fee categories
- Define fee structures
- Link fees to academic years and terms
- Support different fee types such as tuition, uniforms, exams, and extras

Key outcomes:
- Schools can configure their fee catalogue
- Invoices can be generated from a standard fee structure
- Schools can track what is due without manual spreadsheet work

### 2) Invoice management
Once fee structures are in place, schools need the ability to create and manage invoices.

Goals:
- Generate invoices from fee structures
- Allow manual invoice creation
- Support invoice status tracking
- Track line items and amounts
- Handle overdue and paid states

Key outcomes:
- Clear financial records for each student or family
- Better billing reconciliation
- Easier payment follow-up and collections

### 3) Payment processing
This provides the real operational value for school collections.

Goals:
- Add payment gateway abstraction
- Support multiple payment methods
- Add payment verification and confirmation flow
- Integrate MTN Mobile Money as the default African-market option

Key outcomes:
- Parents can pay school fees digitally
- Schools can reconcile payments without manual intervention
- Financial data becomes auditable and dependable

### 4) Receipts and notifications
After payment flows, this layer makes the system usable in practice.

Goals:
- Generate payment receipts
- Allow receipt downloads
- Add in-app notifications
- Add email or SMS updates for invoices and payment confirmations

Key outcomes:
- Better communication with parents
- Improved trust and adoption
- Lower support burden

## Why this order matters

The roadmap already identifies fees, payments, and reporting as the biggest missing product areas. These are the functions that convert the system from a school admin tool into a complete school operations platform.

## Short-term wins to pursue alongside the main roadmap

These are lower scope but valuable for shipping momentum and improving reliability.

### Short-term win 1: Admin password reset flow
Status: partially missing and quick to complete.

Tasks:
- Add admin-triggered password reset endpoint
- Add service logic and validation
- Add any required DTOs
- Confirm access control and security rules

### Short-term win 2: Auth safety and edge-case cleanup
Status: low-complexity but important.

Tasks:
- Validate forgotten/reset password behavior
- Confirm redirect flow after auth changes
- Handle expired or invalid reset attempts gracefully
- Improve password-change messaging for users

### Short-term win 3: Dashboard reliability and refresh behavior
Status: already improved, but worth keeping polished.

Tasks:
- Keep cached dashboard data visible while the route changes
- Refresh in the background
- Avoid blank or flickering dashboard states
- Maintain a clean loading/error experience

### Short-term win 4: Remove hardcoded brand text and use env config
Status: already partially addressed.

Tasks:
- Keep app branding in `VITE_APP_NAME`
- Ensure the app layout reads from the environment variable
- Make it easy to swap brand names across environments

### Short-term win 5: “Coming Soon” pages and route cleanup
Status: obvious unfinished UI placeholders.

Tasks:
- Replace or connect unimplemented routes to real pages
- Prioritize the most important missing flows
- Keep the product feeling coherent instead of partially built

## Recommended immediate sprint

### Sprint goal
Ship the billing foundation with a basic invoice and payment flow that schools can use in a real environment.

### Suggested scope
- Fee categories and fee structures
- Invoice generation
- Basic invoice status tracking
- Payment initiation flow
- MTN Mobile Money integration for the first release

### Deliverables
- CRUD for fee categories and fee structures
- Invoice creation and listing
- Payment initiation endpoints
- Receipt generation support
- Basic notification hook for payment updates

## Bottom line

The next most valuable work is not another front-end polish task. It is the money flow: fees, invoices, and payments. That is the foundation that unlocks real adoption and operational usefulness for schools.
