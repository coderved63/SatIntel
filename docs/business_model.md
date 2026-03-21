# SatIntel — Business Model & Stakeholder Analysis

## 1. Stakeholders

### Primary Users (Paying Customers)

| # | Stakeholder | Role | Use Case | Pain Point Solved |
|---|-------------|------|----------|-------------------|
| 1 | **Municipal Corporations** (AMC, SMC, VMC) | City administration | UHI monitoring, green cover tracking, action plan generation | No satellite-based evidence for policy decisions |
| 2 | **State Pollution Control Boards** (GPCB, CPCB) | Environmental regulation | NO₂/SO₂/CO monitoring, industrial emission tracking | Manual air quality monitoring is sparse & expensive |
| 3 | **Urban Development Authorities** (AUDA, SUDA) | Urban planning | Land use change detection, urban sprawl analysis | Outdated survey-based planning |
| 4 | **District Collectors / DM Offices** | Disaster management | Wildfire tracking, drought monitoring, flood risk | Reactive instead of proactive response |
| 5 | **Smart City Mission SPVs** | Digital governance | City dashboards, KPI tracking, citizen transparency | Lack of real-time environmental data |
| 6 | **Industrial Estate Associations** (GIDC) | Compliance management | Emission monitoring, environmental audit support | Costly manual audits |

### Secondary Users (Freemium / Research)

| # | Stakeholder | Use Case |
|---|-------------|----------|
| 7 | **Academic Institutions** (IITs, NITs, universities) | Research, thesis projects, student training |
| 8 | **NGOs & Environmental Groups** | Advocacy, public awareness, policy lobbying |
| 9 | **Real Estate Developers** | Green compliance, site assessment |
| 10 | **Insurance Companies** | Climate risk assessment, underwriting |
| 11 | **Media & Journalists** | Data-driven environmental reporting |

### Data Partners (Revenue-neutral)

| # | Partner | Contribution |
|---|---------|-------------|
| 12 | **ISRO / NRSC** | Indian satellite data (Cartosat, Resourcesat) |
| 13 | **NASA / ESA** | Free satellite missions (MODIS, Sentinel, SMAP) |
| 14 | **India Meteorological Department** | Ground-truth weather data |

---

## 2. Cloud Resource Cost Estimation (Monthly)

### Current Stack Costs

| Resource | Service | Free Tier | Paid Tier (Production) |
|----------|---------|-----------|----------------------|
| Backend Hosting | Render.com | Free (spins down) | **₹600/mo** (Starter — always on, 512MB RAM) |
| Frontend Hosting | Vercel / Netlify | Free (100GB BW) | **₹0** (free tier sufficient) |
| Database | Neon PostgreSQL | Free (0.5GB, 190h compute) | **₹1,500/mo** (Launch — 10GB, always on) |
| Satellite Data | Google Earth Engine | Free (non-commercial) | **₹0** (free for registered projects) |
| Wildfire Data | NASA FIRMS | Free API | **₹0** |
| Domain + SSL | Cloudflare | Free SSL | **₹800/yr** (~₹67/mo) |
| Monitoring | UptimeRobot + Sentry | Free tier | **₹0** |

### Total Infrastructure Cost

| Scenario | Monthly Cost |
|----------|-------------|
| **MVP / Hackathon** | **₹0** (all free tiers) |
| **Production (1 city)** | **~₹2,200/mo** |
| **Production (14 cities, Gujarat)** | **~₹4,500/mo** |
| **Scale (50+ cities, India)** | **~₹12,000/mo** (upgraded DB + compute) |

---

## 3. Pricing Model

### Tier Structure

| Tier | Target | Features | Price |
|------|--------|----------|-------|
| **Free** | Researchers, students, NGOs | 1 city, basic dashboard, 30-day data, no export | **₹0** |
| **Starter** | Small municipalities, consultants | 3 cities, all parameters, PDF export, 1-year data | **₹4,999/mo** |
| **Professional** | Municipal corporations, SPCB | 15 cities, action plans, API access, 2-year data, priority support | **₹14,999/mo** |
| **Enterprise** | State govts, Smart City SPVs | Unlimited cities, custom reports, dedicated support, SLA, white-label | **₹49,999/mo** |

### Per-Feature Add-ons

| Add-on | Price |
|--------|-------|
| Additional city (beyond tier limit) | ₹1,500/mo per city |
| AI-generated action plan (Anthropic) | ₹500 per report |
| Historical data (5+ years) | ₹3,000/mo |
| Custom satellite parameter integration | ₹10,000 one-time |
| On-premise deployment | ₹2,00,000 one-time + ₹25,000/mo support |

### Revenue Projection (Year 1)

| Quarter | Customers | MRR | ARR |
|---------|-----------|-----|-----|
| Q1 | 5 Free + 2 Starter | ₹9,998 | ₹1.2L |
| Q2 | 10 Free + 5 Starter + 1 Pro | ₹39,994 | ₹4.8L |
| Q3 | 20 Free + 8 Starter + 3 Pro + 1 Enterprise | ₹1,34,989 | ₹16.2L |
| Q4 | 30 Free + 12 Starter + 5 Pro + 2 Enterprise | ₹2,34,983 | ₹28.2L |

### Unit Economics

| Metric | Value |
|--------|-------|
| Gross Margin | ~85% (low infra cost) |
| CAC (Customer Acquisition) | ~₹15,000 (gov procurement cycles) |
| LTV (3-year avg) | ~₹5,40,000 (Professional tier) |
| LTV:CAC Ratio | 36:1 |
| Payback Period | < 2 months |

---

## 4. Go-To-Market Strategy

1. **Phase 1 (0-3 months):** Free tier for Gujarat municipalities — build case studies
2. **Phase 2 (3-6 months):** Paid pilots with 3-5 municipal corporations via GEM portal
3. **Phase 3 (6-12 months):** Expand to other states, partner with Smart City Mission
4. **Phase 4 (12-24 months):** Enterprise deals with state pollution boards, white-label for consultancies
