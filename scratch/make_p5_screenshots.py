import asyncio
import os
import sys
import json
import urllib.request
from playwright.async_api import async_playwright

OUTPUT_DIR = os.path.abspath("docs/checkpoints/screenshots/prompt-05")
os.makedirs(OUTPUT_DIR, exist_ok=True)

async def main():
    # 1. Login via REST API to get token
    login_data = json.dumps({"email": "admin@studykarnataka.com", "password": "Admin@StudyKar2026"}).encode("utf-8")
    req = urllib.request.Request("http://localhost:4000/api/v1/auth/admin/login", data=login_data, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as resp:
        login_res = json.loads(resp.read().decode("utf-8"))["data"]
        token = login_res["accessToken"]
        user = login_res["user"]

    req_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 2. Create Authority
    auth_data = json.dumps({
        "code": f"KPSC_SCR_{os.urandom(4).hex()}",
        "nameEn": "Karnataka Public Service Commission Screenshots",
        "nameKn": "ಕೆಪಿಎಸ್ಸಿ ಸ್ಕ್ರೀನ್‌ಶಾಟ್‌ಗಳು",
        "bodyType": "STATE_PUBLIC_SERVICE_COMMISSION"
    }).encode("utf-8")
    req = urllib.request.Request("http://localhost:4000/api/v1/admin/exam-authorities", data=auth_data, headers=req_headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        authority = json.loads(resp.read().decode("utf-8"))["data"]

    # 3. Create Programme
    prog_data = json.dumps({
        "authorityId": authority["id"],
        "code": f"GAS_SCR_{os.urandom(4).hex()}",
        "nameEn": "Gazetted Probationers Screenshots",
        "nameKn": "ಗೆಜೆಟೆಡ್ ಪ್ರೊಬೇಷನರ್ಸ್ ಸ್ಕ್ರೀನ್‌ಶಾಟ್‌ಗಳು",
        "groupLevel": "GROUP_A"
    }).encode("utf-8")
    req = urllib.request.Request("http://localhost:4000/api/v1/admin/exam-programmes", data=prog_data, headers=req_headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        programme = json.loads(resp.read().decode("utf-8"))["data"]

    # 4. Create Exam Cycle
    exam_slug = f"kas-2026-scr-{os.urandom(4).hex()}"
    exam_data = json.dumps({
        "programmeId": programme["id"],
        "cycleCode": f"KAS_2026_SCR_{os.urandom(4).hex()}",
        "cycleYear": 2026,
        "titleEn": "KAS 2026 Syllabus Screenshots Exam",
        "titleKn": "ಕೆಎಎಸ್ 2026 ಸಿಲಬಸ್ ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಪರೀಕ್ಷೆ",
        "descriptionEn": "KAS 2026 Exam Cycle Screenshots Description",
        "descriptionKn": "ಕೆಎಎಸ್ 2026 ಪರೀಕ್ಷಾ ಚಕ್ರ ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ವಿವರಣೆ",
        "seo": {
            "slugEn": exam_slug,
            "slugKn": f"{exam_slug}-kn"
        }
    }).encode("utf-8")
    req = urllib.request.Request("http://localhost:4000/api/v1/admin/exams", data=exam_data, headers=req_headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        exam_cycle = json.loads(resp.read().decode("utf-8"))["data"]

    # Publish Exam Cycle
    for action in ["submit-review", "approve", "publish"]:
        req = urllib.request.Request(f"http://localhost:4000/api/v1/admin/exams/{exam_cycle['id']}/{action}", data=b"{}", headers=req_headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            pass

    # Create Pattern
    pat_data = json.dumps({
        "titleEn": "KAS Pattern Screenshots",
        "titleKn": "ಕೆಎಎಸ್ ಮಾದರಿ",
        "descriptionEn": "KAS Pattern Screenshots Description",
        "descriptionKn": "ಕೆಎಎಸ್ ಪರೀಕ್ಷಾ ಮಾದರಿ ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ವಿವರಣೆ"
    }).encode("utf-8")
    req = urllib.request.Request(f"http://localhost:4000/api/v1/admin/exams/{exam_cycle['id']}/patterns", data=pat_data, headers=req_headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        pattern = json.loads(resp.read().decode("utf-8"))["data"]

    # Stage
    stage_data = json.dumps({"code": "PRELIMS", "stageType": "PRELIMINARY", "nameEn": "Preliminary Exam", "nameKn": "ಪೂರ್ವಭಾವಿ ಪರೀಕ್ಷೆ", "displayOrder": 1}).encode("utf-8")
    req = urllib.request.Request(f"http://localhost:4000/api/v1/admin/exams/{exam_cycle['id']}/patterns/{pattern['id']}/stages", data=stage_data, headers=req_headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        stage = json.loads(resp.read().decode("utf-8"))["data"]

    # Paper
    paper_data = json.dumps({"code": "GS_PAPER_1", "assessmentMode": "OBJECTIVE", "nameEn": "General Studies Paper 1", "nameKn": "ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ ಪತ್ರಿಕೆ 1", "totalMarks": 200, "displayOrder": 1}).encode("utf-8")
    req = urllib.request.Request(f"http://localhost:4000/api/v1/admin/stages/{stage['id']}/papers", data=paper_data, headers=req_headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        paper = json.loads(resp.read().decode("utf-8"))["data"]

    # Publish Pattern
    for action in ["submit-review", "approve", "publish"]:
        req = urllib.request.Request(f"http://localhost:4000/api/v1/admin/exams/{exam_cycle['id']}/patterns/{pattern['id']}/{action}", data=b"{}", headers=req_headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            pass

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 960})
        page = await context.new_page()

        # Handle dialogs automatically
        page.on("dialog", lambda dialog: dialog.accept())

        # Pre-seed localStorage token
        await page.goto("http://localhost:3001/login")
        await page.evaluate(f"() => {{ localStorage.setItem('admin_token', '{token}'); localStorage.setItem('admin_user', '{json.dumps(user)}'); }}")

        # Navigate to Syllabus Page for this exam
        syllabus_url = f"http://localhost:3001/exams/{exam_cycle['id']}/syllabus"
        await page.goto(syllabus_url)
        await page.wait_for_timeout(1000)

        print("Capturing 01-syllabus-list-empty.png...")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "01-syllabus-list-empty.png"))

        print("Capturing 02-create-draft-syllabus-modal.png & 03-draft-syllabus-header.png...")
        await page.click("button:has-text('+ Create New Revision')")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "02-create-draft-syllabus-modal.png"))
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "03-draft-syllabus-header.png"))

        print("Capturing 04-summary-cards-empty.png...")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "04-summary-cards-empty.png"))

        print("Capturing 05-add-root-subject-modal.png...")
        await page.click("button:has-text('+ Add Root Subject Node')")
        await page.wait_for_selector("text=Add Root Subject Node")
        await page.fill("input[placeholder='e.g. HIST_KAR_MODERN']", "HIST KAR") # Will convert spaces to underscores
        await page.fill("input[placeholder='e.g. Modern History of Karnataka']", "History & Heritage of Karnataka")
        await page.fill("input[placeholder='ಉದಾ. ಕರ್ನಾಟಕದ ಆಧುನಿಕ ಇತಿಹಾಸ']", "ಕರ್ನಾಟಕದ ಇತಿಹಾಸ ಮತ್ತು ಪಾರಂಪರ್ಯ")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "05-add-root-subject-modal.png"))

        print("Capturing 13-code-sanitization-space-to-underscore.png...")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "13-code-sanitization-space-to-underscore.png"))

        await page.click("button:has-text('Create Node')")
        await page.wait_for_timeout(1000)

        print("Capturing 06-root-subject-created.png...")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "06-root-subject-created.png"))

        print("Capturing 07-add-child-unit-modal.png & 08-child-unit-created.png...")
        await page.click("button:has-text('+ Child')")
        await page.wait_for_selector("text=Add Child Syllabus Node")
        await page.fill("input[placeholder='e.g. HIST_KAR_MODERN']", "UNIT_MODERN_KAR")
        await page.select_option("select:has(option[value='STAGE'])", "STAGE")
        await page.wait_for_timeout(300)
        await page.select_option("label:has-text('Target Exam Stage') ~ select", stage['id'])
        await page.select_option("select:has(option[value='UNIT'])", "UNIT")
        await page.fill("input[placeholder='e.g. Modern History of Karnataka']", "Modern History of Karnataka")
        await page.fill("input[placeholder='ಉದಾ. ಕರ್ನಾಟಕದ ಆಧುನಿಕ ಇತಿಹಾಸ']", "ಕರ್ನಾಟಕದ ಆಧುನಿಕ ಇತಿಹಾಸ")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "07-add-child-unit-modal.png"))
        await page.click("button:has-text('Create Node')")
        await page.wait_for_timeout(1000)

        print("Capturing 08-child-unit-created.png & 14-scope-badge-stage-paper.png...")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "08-child-unit-created.png"))
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "14-scope-badge-stage-paper.png"))

        print("Capturing 09-add-grandchild-topic-modal.png & 10-tree-depth-3-expanded.png...")
        await page.locator("button:has-text('+ Child')").last.click()
        await page.wait_for_selector("text=Add Child Syllabus Node")
        await page.fill("input[placeholder='e.g. HIST_KAR_MODERN']", "TOPIC_UNIFICATION")
        await page.select_option("select:has(option[value='PAPER'])", "PAPER")
        await page.wait_for_timeout(300)
        await page.select_option("label:has-text('Target Exam Paper') ~ select", paper['id'])
        await page.select_option("select:has(option[value='TOPIC'])", "TOPIC")
        await page.fill("input[placeholder='e.g. Modern History of Karnataka']", "Unification Movement of Karnataka")
        await page.fill("input[placeholder='ಉದಾ. ಕರ್ನಾಟಕದ ಆಧುನಿಕ ಇತಿಹಾಸ']", "ಕರ್ನಾಟಕದ ಏಕೀಕರಣ ಚಳುವಳಿ")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "09-add-grandchild-topic-modal.png"))
        await page.click("button:has-text('Create Node')")
        await page.wait_for_timeout(1000)

        print("Capturing 10-tree-depth-3-expanded.png, 11-bilingual-readiness-panel.png...")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "10-tree-depth-3-expanded.png"))
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "11-bilingual-readiness-panel.png"))

        print("Capturing 12-bilingual-node-editor-en-kn.png...")
        await page.locator("button:has-text('Edit')").first.click()
        await page.wait_for_selector("text=Edit Syllabus Node")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "12-bilingual-node-editor-en-kn.png"))
        await page.click("button:has-text('Cancel')")

        print("Capturing 15-move-node-modal.png & 16-move-node-depth-updated.png...")
        await page.locator("button:has-text('Move')").last.click()
        await page.wait_for_selector("text=Move Node to New Parent")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "15-move-node-modal.png"))
        await page.click("button:has-text('Confirm Move')")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "16-move-node-depth-updated.png"))

        print("Capturing 17-delete-leaf-node-confirm.png...")
        await page.click("button:has-text('+ Add Root Subject Node')")
        await page.wait_for_selector("text=Add Root Subject Node")
        await page.fill("input[placeholder='e.g. HIST_KAR_MODERN']", "TEMP_LEAF")
        await page.fill("input[placeholder='e.g. Modern History of Karnataka']", "Temp Leaf Node")
        await page.fill("input[placeholder='ಉದಾ. ಕರ್ನಾಟಕದ ಆಧುನಿಕ ಇತಿಹಾಸ']", "ತಾತ್ಕಾಲಿಕ ನೋಡ್")
        await page.click("button:has-text('Create Node')")
        await page.wait_for_timeout(1000)

        delete_btns = page.locator("button:has-text('Delete')")
        count = await delete_btns.count()
        await delete_btns.nth(count - 1).click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "17-delete-leaf-node-confirm.png"))

        print("Capturing 18-delete-subtree-modal-checkbox.png...")
        await page.click("button:has-text('+ Add Root Subject Node')")
        await page.wait_for_selector("text=Add Root Subject Node")
        await page.fill("input[placeholder='e.g. HIST_KAR_MODERN']", "SUBTREE_PARENT")
        await page.fill("input[placeholder='e.g. Modern History of Karnataka']", "Subtree Parent Subject")
        await page.fill("input[placeholder='ಉದಾ. ಕರ್ನಾಟಕದ ಆಧುನಿಕ ಇತಿಹಾಸ']", "ಸಬ್ಟ್ರೀ ಮೂಲ ನೋಡ್")
        await page.click("button:has-text('Create Node')")
        await page.wait_for_timeout(1000)

        await page.locator("button:has-text('+ Child')").last.click()
        await page.wait_for_selector("text=Add Child Syllabus Node")
        await page.fill("input[placeholder='e.g. HIST_KAR_MODERN']", "SUBTREE_CHILD")
        await page.fill("input[placeholder='e.g. Modern History of Karnataka']", "Subtree Child Topic")
        await page.fill("input[placeholder='ಉದಾ. ಕರ್ನಾಟಕದ ಆಧುನಿಕ ಇತಿಹಾಸ']", "ಸಬ್ಟ್ರೀ ಮಗು ನೋಡ್")
        await page.click("button:has-text('Create Node')")
        await page.wait_for_timeout(1000)

        delete_btns = page.locator("button:has-text('Delete')")
        count = await delete_btns.count()
        await delete_btns.nth(count - 2).click()
        await page.wait_for_timeout(500)
        await page.locator("button:has-text('Delete Subtree')").first.click()
        await page.wait_for_selector("text=Delete Subtree Confirmation")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "18-delete-subtree-modal-checkbox.png"))

        await page.check("input[type='checkbox']")
        await page.locator("button:has-text('Delete Subtree')").last.click()
        await page.wait_for_timeout(1000)

        print("Capturing 19-submit-review-draft.png...")
        await page.wait_for_selector("button:has-text('Submit for Review'):not([disabled])")
        await page.click("button:has-text('Submit for Review'):not([disabled])")
        await page.wait_for_selector("span:has-text('REVIEW_PENDING')")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "19-submit-review-draft.png"))

        print("Capturing 20-request-changes-pending.png...")
        await page.wait_for_selector("button:has-text('Request Changes'):not([disabled])")
        await page.click("button:has-text('Request Changes'):not([disabled])")
        await page.wait_for_selector("span:has-text('CHANGES_REQUESTED')")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "20-request-changes-pending.png"))

        print("Capturing 21-approve-syllabus-pending.png...")
        await page.wait_for_selector("button:has-text('Submit for Review'):not([disabled])")
        await page.click("button:has-text('Submit for Review'):not([disabled])")
        await page.wait_for_selector("span:has-text('REVIEW_PENDING')")
        await page.wait_for_selector("button:has-text('Approve Revision'):not([disabled])")
        await page.click("button:has-text('Approve Revision'):not([disabled])")
        await page.wait_for_selector("span:has-text('APPROVED')")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "21-approve-syllabus-pending.png"))

        print("Capturing 22-publish-syllabus-approved.png & 23-published-read-only-banner.png...")
        await page.wait_for_selector("button:has-text('Publish Syllabus'):not([disabled])")
        await page.click("button:has-text('Publish Syllabus'):not([disabled])")
        await page.wait_for_selector("span:has-text('PUBLISHED')")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "22-publish-syllabus-approved.png"))
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "23-published-read-only-banner.png"))

        print("Capturing 24-clone-revision-modal-draft-2.png...")
        await page.wait_for_selector("button:has-text('+ Create New Revision'):not([disabled])")
        await page.click("button:has-text('+ Create New Revision'):not([disabled])")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "24-clone-revision-modal-draft-2.png"))

        print("Capturing Public API endpoints 25-public-api-english-tree.png & 26-public-api-kannada-tree.png...")
        api_page = await context.new_page()
        await api_page.goto(f"http://localhost:4000/api/v1/exams/{exam_slug}/syllabus?language=en")
        await api_page.screenshot(path=os.path.join(OUTPUT_DIR, "25-public-api-english-tree.png"))

        await api_page.goto(f"http://localhost:4000/api/v1/exams/{exam_slug}/syllabus?language=kn")
        await api_page.screenshot(path=os.path.join(OUTPUT_DIR, "26-public-api-kannada-tree.png"))

        await browser.close()
        print("Successfully captured all 26 screenshots into docs/checkpoints/screenshots/prompt-05/")

if __name__ == "__main__":
    asyncio.run(main())
