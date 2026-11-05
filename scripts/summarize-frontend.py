import os
import xml.etree.ElementTree as ET

paths = ["test-results/junit.xml", "frontend/test-results/junit.xml"]
p = next((x for x in paths if os.path.exists(x)), None)

if not p:
    summary = "### Frontend tests\nKhông có file kết quả (test chưa chạy tới bước này).\n"
else:
    try:
        r = ET.parse(p).getroot()
        t = int(r.get("tests", 0))
        f = int(r.get("failures", 0))
        e = int(r.get("errors", 0))
        s = int(r.get("skipped", 0))
        passed = max(0, t - f - e - s)
        summary = (
            "### Frontend tests\n"
            f"| Tổng | Pass | Fail | Error | Skip |\n"
            f"|---|---|---|---|---|\n"
            f"| {t} | {passed} | {f} | {e} | {s} |\n"
        )
    except Exception as ex:
        summary = f"### Frontend tests\nLỗi đọc kết quả test: {ex}\n"

print(summary)

step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
if step_summary:
    try:
        with open(step_summary, "a", encoding="utf-8") as sf:
            sf.write(summary)
    except Exception as ex:
        print(f"Warning: could not write to GITHUB_STEP_SUMMARY: {ex}")
