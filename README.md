# ⚡ FinGrid Dynamic Document Engine & Underwriting Pipeline

<p align="center">
  <img src="https://img.shields.io/badge/FinGrid-Flagship_Project-1e3a8a?style=for-the-badge&logo=shield&logoColor=white" alt="FinGrid Flagship" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-22+-green?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Tests-29%2F29_Passing-brightgreen?style=for-the-badge&logo=vitest&logoColor=white" alt="Tests" />
  <img src="https://img.shields.io/badge/License-Apache_2.0-orange?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <strong>High-throughput, template-driven financial document generation, multi-party eSign orchestration, in-house Bank Statement Analysis (BSA), Credit Bureau (CIBIL/Experian) scoring, and Tax (ITR/GSTR-3B) Triangulation for modern digital lending platforms.</strong>
</p>

---

## 🌟 The Core Value Proposition: Why This Replaces Multiple SaaS Tools

In financial lending operations, platforms typically pay hundreds of thousands of dollars per year to 4-5 fragmented SaaS vendors:
1. **Document Generators**: Paying per-page PDF generation APIs (hardcoding layouts in backend code).
2. **eSign Platforms**: Separate integrations for Aadhaar eSign (Digio/Leegality) and global DSC/DocuSign.
3. **Bank Statement Analyzers (BSA)**: Paying ₹15 to ₹50 per statement to vendors like **Glib.ai**, **Perfios**, or **Karza**.
4. **Bureau Aggregators**: Paying SaaS markups on CIBIL & Experian raw XML pulls.
5. **Tax Aggregators**: Separate tools to check GSTR-3B monthly sales and ITR filing compliance.

**FinGrid Document & Underwriting Engine unifies all five pillars into a single self-hosted microservice:**

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                           FINGRID UNIFIED UNDERWRITING ENGINE                         │
└───────────────────────────────────────────┬───────────────────────────────────────────┘
                                            │
        ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
        ▼                   ▼                               ▼                   ▼
┌───────────────┐   ┌───────────────┐               ┌───────────────┐   ┌───────────────┐
│ Dynamic Docs  │   │  Multi-Party  │               │ In-House BSA  │   │ Bureau & Tax  │
│  & PDF Engine │   │ eSign Gateway │               │ (Glib AI Alt) │   │ Triangulation │
├───────────────┤   ├───────────────┤               ├───────────────┤   ├───────────────┤
│• CAM Reports  │   │• Aadhaar eSign│               │• AMB / ABB    │   │• CIBIL & Exp  │
│• P&L Extracts │   │• Digio API    │               │• Outward Bnc  │   │• 36-Month DPD │
│• Loan Closure │   │• Leegality    │               │• EOD Balances │   │• GSTR-3B (3.1)│
│• KFS Sanction │   │• DocuSign     │               │• Loan Detect  │   │• ITR (3-Yr)   │
│• Print CSS @pg│   │• Mock Dev Sim │               │• Top Debtors  │   │• 3-Way Recon  │
└───────────────┘   └───────────────┘               └───────────────┘   └───────────────┘
```

---

## 🏛️ End-to-End Underwriting & Generation Flow

```mermaid
flowchart TD
    subgraph 1. Borrower Data Ingestion
        A[Borrower Application Payload] --> B[Zod Schema Validation]
        C[Bank Statement PDF / AA JSON] --> D[src/bsa/analyzer.ts]
        E[CIBIL / Experian Credit Pull] --> F[src/bureau/analyzer.ts]
        G[ITR 3-Year & GSTR-3B 12-Month] --> H[src/tax/triangulator.ts]
    end

    subgraph 2. Financial Intelligence & Forensic Analysis
        D -->|AMB, Outward Bounces, EMI Detection| BSA_METRICS[BSA Banking Scorecard]
        F -->|36-Month DPD, CMR Rank, Leverage| BUREAU_METRICS[Bureau Risk Scorecard]
        H -->|3-Way Turnover Reconciliation| TRI_METRICS[Tax Triangulation Radar]
        
        BSA_METRICS & BUREAU_METRICS & TRI_METRICS --> DECISION{Underwriting Decision<br/>APPROVE / REJECT / DEVIATION}
    end

    subgraph 3. Dynamic Document Hydration
        DECISION -->|Auto-Hydrate Data| TPL[Handlebars Template Merger]
        TPL --> DOC1[Credit Appraisal Memo - CAM]
        TPL --> DOC2[Bank Statement Analysis Report]
        TPL --> DOC3[Profit & Loss Audited Extract]
        TPL --> DOC4[Key Fact Statement & Sanction Letter]
        TPL --> DOC5[Loan Account Closure NOC]
    end

    subgraph 4. High-Fidelity Rendering & eSign Ceremony
        DOC1 & DOC2 & DOC3 & DOC4 & DOC5 --> RENDER[Gotenberg / Chromium Vector PDF]
        RENDER --> ANCHOR[Smart Anchor Parser: [[sig:...]]]
        ANCHOR --> ESIGN[eSign Orchestrator]
        ESIGN --> SIGNED[(Tamper-Proof Storage & Audit Trail)]
    end
```

---

## 🚀 Key Feature Matrix

| Capability | What FinGrid Delivers | Replaces / Competes With |
| :--- | :--- | :--- |
| **Document Generation** | Dynamic Handlebars templates, print CSS `@page`, watermarks, headers/footers, and page numbers. Zero code deployments for new document layouts. | Bespoke PDF backend code, Adobe Document Services |
| **Bank Statement Analysis** | In-house transaction categorization, AMB/ABB computation, EOD milestone balances (5th, 10th, 15th, 20th), outward bounce radar, un-reported loan discovery. | **Glib.ai**, Perfios, Finfort, ScoreMe |
| **Bureau Analytics** | Direct TransUnion CIBIL & Experian adapters, 36-month DPD string decoder (`000`, `030`, `SMA`, `NPA`), CMR ranking, knockout derogatory rules. | Aggregator SaaS wrappers, expensive Bureau per-hit fees |
| **Tax & GST Triangulation** | GSTR-3B Table 3.1 outward supplies, Table 6.1 cash tax ratio, multi-year ITR CAGR & cash accruals, 3-way variance verification. | Karza, Manual Underwriting Spreadsheets |
| **eSign Pipeline** | Pluggable interface for Aadhaar eSign (Digio, Leegality), Class 3 USB DSC, DocuSign, and zero-cost local Mock Simulator. | Standalone eSign portals, Leegality dashboard |

---

## ⚡ Quickstart

### 1. Installation
```bash
git clone https://github.com/saravanan-22/fingrid-doc-engine.git
cd fingrid-doc-engine
npm install
```

### 2. Run All Tests (29/29 Passing)
```bash
npm test
# ✔ Core Document Engine & Helpers (11 tests)
# ✔ Bank Statement Analysis & DPD (7 tests)
# ✔ ITR, GSTR-3B & Triangulation (6 tests)
# ✔ Bureau Engine & Scoring (5 tests)
```

### 3. Generate Sample Documents Locally
Run the end-to-end demo runner to generate all financial reports and simulate eSign workflows:
```bash
npx tsx examples/e2e-demo.ts
```
Generated reports are saved in `./output`:
* `output/cam-report-sample.html` (Credit Appraisal Memo)
* `output/bank-analysis-report-sample.html` (Institutional BSA with EOD Milestones)
* `output/profit-and-loss-sample.html` (Audited P&L Statement)
* `output/loan-closure-sample.html` (Loan Account Close NOC)
* `output/sanction-letter-sample.html` (KFS & Sanction Letter)

### 4. Start the Microservice
```bash
npm run dev
# Server running at http://localhost:4000/api/v1
```

---

## 📡 Complete REST API Guide

### 1. Document Generation
* `GET /api/v1/templates` — List all discovered document templates.
* `POST /api/v1/documents/render` — Render dynamic document HTML with anchor detection.
* `POST /api/v1/documents/generate-pdf` — Render vector PDF via Gotenberg container.

### 2. eSign Pipeline
* `POST /api/v1/esign/initiate` — Create multi-party signing session (Aadhaar/DSC/DocuSign/Mock).
* `GET /api/v1/esign/status/:esignId` — Check live signing progress across signers.
* `POST /api/v1/esign/webhook` — Webhook handler for tamper-proof audit trail.

### 3. Bank Statement Analysis (Glib.ai Replacement)
* `POST /api/v1/bsa/analyze` — Analyze raw transactions: AMB, DPD, Bounces, EOD balances.
* `POST /api/v1/bsa/cam-bridge` — Auto-hydrate Section 6 of the CAM Report.

### 4. Credit Bureau Engine
* `POST /api/v1/bureau/analyze` — Analyze CIBIL/Experian report: 36m DPD, CMR rank, knockouts.
* `POST /api/v1/bureau/cam-bridge` — Auto-hydrate Section 4 of the CAM Report.

### 5. Tax & GST Triangulation
* `POST /api/v1/tax/itr/analyze` — 3-year ITR CAGR, cash accruals, Section 139 discipline.
* `POST /api/v1/tax/gstr3b/analyze` — 12-month GSTR-3B outward supplies & cash tax ratio.
* `POST /api/v1/tax/triangulate` — Reconcile Banking vs GST vs ITR to detect circular turnover.

---

## 🐳 Docker Deployment

Run both the FinGrid Engine and the Gotenberg Chromium rendering engine with a single command:
```bash
docker-compose up --build -d
```
* **FinGrid Document Engine**: `http://localhost:4000`
* **Gotenberg Chromium Microservice**: `http://localhost:3000`

---

## 📄 License
Licensed under the [Apache-2.0 License](LICENSE). Built for enterprise digital lending infrastructure.
