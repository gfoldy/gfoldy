# Adaptation Rules: How Diagnostic Results Change Weeks 2-12

`progress/diagnostic/score.py` applies these rules automatically and writes `report.md`. The coach then turns that report into `progress/plan.md`. **If you change a rule here, change it in `score.py` too.**

---

## 1. Domains and levels

The diagnostic scores 14 domains. Each domain's points are converted to a level:

| % of domain points | Level | Meaning |
|---|---|---|
| 0-19% | **0** None | Never done it |
| 20-39% | **1** Recognize | Knows the words, can't do it without a walkthrough |
| 40-59% | **2** Assisted | Gets there with docs, but slowly |
| 60-84% | **3** Independent | Does it unaided, inside the time box |
| 85-100% | **4** Fluent | Fast, handles edge cases, could teach it |

| ID | Domain | Diagnostic items |
|---|---|---|
| D1 | Linux & networking fundamentals | Q1-Q4 |
| D2 | Containers & images | Q5-Q6, D-1 (Dockerfile → running on kind) |
| D3 | Workloads & configuration | Q7-Q9, B1, B2, B4, B7, B10 |
| D4 | Services & cluster networking | Q10-Q12, B3, B9 |
| D5 | Storage & scheduling | Q13-Q14, B5, B6 |
| D6 | Troubleshooting | Q15-Q17, C1-C5, C7, C8 |
| D7 | RBAC & security | Q18-Q20, B8, C6 |
| D8 | Packaging (Helm/Kustomize) | Q21-Q22, B11, B12 |
| D9 | IaC & AWS | Q23-Q25, T1 (Terraform) |
| D10 | CI/CD & GitOps | Q26-Q27, G1 (GitHub Actions) |
| D11 | Observability | Q28-Q29, M1 (metrics-server) |
| D12 | Cluster administration | Q30-Q31, A1-A3 (facts, etcd snapshot, drain) |
| D13 | kubectl speed | S1 (speed drill 01) |
| D14 | Career readiness | J1-J5 (baseline audit) |

---

## 2. Week tiers

Each content week (2-9) maps to one or two domains. The **average level** of those domains sets the week's tier:

| Week | Topic | Domains |
|---|---|---|
| 2 | Core K8s I: workloads & config | D2, D3 |
| 3 | Core K8s II: networking, storage, scheduling | D4, D5 |
| 4 | Troubleshooting & RBAC | D6, D7 |
| 5 | Helm & Kustomize | D8 |
| 6 | Terraform & EKS | D9 |
| 7 | CI/CD & GitOps | D10 |
| 8 | Observability | D11 |
| 9 | Security | D7, D2 |

| Avg level | Tier | What changes | Hours |
|---|---|---|---|
| < 1.5 | **Foundation** | Adds a pre-work block (concept primer + guided lab) before the standard labs. Coach uses hint ladder steps 1-3 more freely. | 10 h |
| 1.5-2.9 | **Standard** | Runs as written. | 9 h |
| ≥ 3.0 | **Fast-track** | Opens with a 60-90 min **proof lab**. Pass (≥ 80%) and you skip the reading and core labs, then do only the stretch lab. Fail and the week reverts to Standard and nothing is banked. | 7 h (+2 h banked) |

Weeks 10-12 (CKA prep, exam, polish) aren't tiered. They take the banked hours instead.

---

## 3. Hour bank

- Each fast-track week that passes its proof lab banks **2 h**.
- Banked hours go first to **CKA weak spots**: any of D6, D12, or D13 at level ≤ 1. They become extra drill and mock sessions in weeks 10-11.
- After that, they go to the **capstone**, then the **job-search track**.
- The hard cap is 10 h in any week. Anything over the cap rolls forward.
- Foundation weeks don't borrow from the bank. They get +1 h at most and stay inside the 10 h cap by cutting optional reading.

---

## 4. Global triggers

| Condition | Adjustment |
|---|---|
| **D13 ≤ 2** (speed) | Daily 15-min kubectl drill, 5x/week, from Week 2 through the exam. Counts as 1.25 h of each week's budget. |
| **D1 ≤ 1** (Linux/networking) | 1 h fundamentals block in weeks 2, 3, and 4: systemd/journalctl, `ss`/`ip`/`dig`/`curl`, CIDR math, TLS basics. CKA troubleshooting depends on these. |
| **D14 ≤ 1** (career) | Job-search track starts in **Week 2** at 1 h/week. Default is Week 6. |
| **D9 ≥ 3** (AWS strength) | Week 6 skips Terraform basics and goes straight to modules, remote state, EKS, and Pod Identity/IRSA. |
| **Self-rating − measured ≥ 2** in any domain | **Overconfidence flag.** That domain gets a fresh timed re-test at the end of the week that covers it. The re-test score replaces the diagnostic level for later decisions. |
| **Self-rating − measured ≤ −2** | Underconfidence. No plan change. The coach points it out, because it matters for interviews. |

---

## 5. CKA timing

CKA domain weights are mapped onto the diagnostic: Troubleshooting (D6) 30%, Services & Networking (D4) 20%, Cluster Architecture (D12 15% + D7 10%), Workloads & Scheduling (D3) 15%, Storage (D5) 10%.

| Weighted baseline | Decision |
|---|---|
| ≥ 60% | Buy the voucher after the Week 4 checkpoint. Book a Week 12 slot. |
| 35-59% | Target Week 12. Book only if the **Week 8 checkpoint** is ≥ 60%. |
| < 35% | Target Week 13-14. Week 12 becomes a full mock + portfolio polish. Don't buy before Week 8. |

The pass mark is 66%. The exam purchase has historically included two killer.sh simulator sessions and one free retake. **Check the current Linux Foundation policy before buying.** Save the killer.sh sessions for Weeks 10 and 11.

---

## 6. Checkpoints (re-diagnose and re-plan)

| When | What | Can change |
|---|---|---|
| End of Week 4 | 60-min mini-diagnostic covering D3-D7 (new tasks, same grader style) | Tiers for weeks 5-9, CKA voucher decision |
| End of Week 8 | 90-min CKA-style mini-mock (D3-D7, D12) | Whether the exam is booked for Week 12 |
| End of Week 10 | killer.sh session 1 | Week 11 focus areas |

At each checkpoint the coach updates `progress/plan.md` and records what changed and why.

---

## 7. Capstone scope

The overall technical score (all domains except D14) picks the capstone tier. Details are in `capstone/README.md`.

| Overall | Tier |
|---|---|
| ≥ 70% | **Tier 3: Platform**. Terraform-built EKS + GitOps + observability + policy. |
| 40-69% | **Tier 2: Production app**. App on the homelab via GitOps, plus one EKS deploy via Terraform. |
| < 40% | **Tier 1: Solid foundation**. Well-built app on the homelab with Helm, CI, and monitoring. EKS is a stretch goal. |

You can move up a tier at the Week 8 checkpoint. You never have to move down: if time runs short, cut stretch goals instead.

---

## 8. How the coach writes `progress/plan.md`

1. Copy the week table from `report.md`, with tiers and hours.
2. List the triggered adjustments. Put each one into specific weeks.
3. Record the CKA decision and the date for the next decision point.
4. Record the capstone tier and the Week 2 capstone milestone.
5. Name the top 3 weak domains. Each one gets a named drill in `drills/`.
