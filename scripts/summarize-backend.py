import glob
import os
import xml.etree.ElementTree as ET

t = f = e = s = 0
report_files = glob.glob("target/surefire-reports/TEST-*.xml")
if not report_files:
    report_files = glob.glob("fairshare-backend/target/surefire-reports/TEST-*.xml")

for p in report_files:
    try:
        r = ET.parse(p).getroot()
        t += int(r.get("tests", 0))
        f += int(r.get("failures", 0))
        e += int(r.get("errors", 0))
        s += int(r.get("skipped", 0))
    except Exception as ex:
        print(f"Warning: could not parse {p}: {ex}")

passed = max(0, t - f - e - s)
summary = (
    "### Backend tests\n"
    f"| Tổng | Pass | Fail | Error | Skip |\n"
    f"|---|---|---|---|---|\n"
    f"| {t} | {passed} | {f} | {e} | {s} |\n"
)
print(summary)

step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
if step_summary:
    try:
        with open(step_summary, "a", encoding="utf-8") as sf:
            sf.write(summary)
    except Exception as ex:
        print(f"Warning: could not write to GITHUB_STEP_SUMMARY: {ex}")
