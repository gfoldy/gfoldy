# Diagnostic Scoring

1. **Before Part A:** fill in `self-ratings.csv` (0-4 per domain, using the levels in `curriculum/adaptation-rules.md`).
2. `labs/week-01/grade.sh` writes `auto-scores.csv` (B, D1, M1, A2, A3, C items).
3. The coach fills in the `earned` column of `manual-scores.csv` (Q1-Q31, A1, T1, G1, S1, J1-J5).
4. `python3 progress/diagnostic/score.py` prints and writes `report.md`.

Re-running `score.py` is always safe. Items without a score are listed as incomplete and left out of the levels.

**Point totals:** Part A 62 · Part B build 35 + D-1 4 + M1 3 · admin 7 · Part C 18 · Part D 12 · speed 4 · career 10 = **155**.
