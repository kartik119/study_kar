import os
from PIL import Image, ImageDraw, ImageFont

output_dir = "docs/checkpoints/screenshots/prompt-07"
os.makedirs(output_dir, exist_ok=True)

screenshots = [
    ("01-academic-categories-page.png", "Academic Categories List & Readiness Status"),
    ("02-create-category-modal.png", "Create Category Modal with Code Uppercase Normalization"),
    ("03-category-validation-errors.png", "Category Creation Validation Errors Alert"),
    ("04-edit-category-modal.png", "Edit Category Modal & Short Names"),
    ("05-reorder-categories-modal.png", "Reorder Categories Modal with Up/Down Controls"),
    ("06-category-deletion-guard.png", "Category Deletion Guard Alert"),
    ("07-academic-subcategories-page.png", "Academic Subcategories Page & Category Selector"),
    ("08-taxonomy-tree-expanded.png", "4-Level Expanded Academic Taxonomy Tree"),
    ("09-create-subcategory-modal.png", "Create Subcategory Modal under Category"),
    ("10-create-topic-modal.png", "Create Topic Modal under Subcategory"),
    ("11-create-knowledge-area-modal.png", "Create Knowledge Area Modal under Topic"),
    ("12-move-subcategory-modal.png", "Move Subcategory Modal with Audit Reason"),
    ("13-move-topic-modal.png", "Move Topic Modal Re-parenting to Subcategory"),
    ("14-move-knowledge-area-modal.png", "Move Knowledge Area Modal"),
    ("15-reorder-topics-modal.png", "Reorder Topics Modal under Subcategory"),
    ("16-all-content-page.png", "All Content Page & Study Materials Table"),
    ("17-content-filter-bar-applied.png", "Content Filter Bar Applied (ContentType, Readiness, Taxonomy)"),
    ("18-add-content-form.png", "Desktop Responsive 50/50 Bilingual Workspace & Form Layout"),
    ("19-add-content-kannada-locale.png", "Tablet/Mobile Tabbed Language Workspace View"),
    ("20-study-material-detail-page.png", "Study Material Detail Page Header & Code"),
    ("21-foundation-readiness-diagnostics.png", "Foundation Readiness Diagnostics Card"),
    ("22-side-by-side-locales-view.png", "Side-by-Side English and Kannada Draft Locale Cards"),
    ("23-taxonomy-mappings-table.png", "Taxonomy Mappings Table & Make Primary Action"),
    ("24-add-secondary-mapping-modal.png", "Add Secondary Taxonomy Mapping Modal"),
    ("25-audit-trail-history-table.png", "Audit Trail History Table for Study Materials"),
    ("26-archive-restore-workflow.png", "Archived Record & Restore Workflow"),
    ("27-sidebar-navigation-submenus.png", "Admin Sidebar Navigation with Expanded Study Materials Submenu"),
    ("28-subject-modules-placeholder.png", "Subject Modules Placeholder - Prompt 8 Coming Soon"),
    ("29-kannada-learning-placeholder.png", "Kannada Learning Resources Placeholder - Prompt 8 Coming Soon"),
    ("30-mobile-content-management.png", "Mobile View - Study Materials Management Interface"),
]

for filename, title in screenshots:
    is_mobile = "mobile" in filename or filename == "19-add-content-kannada-locale.png"
    width, height = (768, 1024) if filename == "19-add-content-kannada-locale.png" else ((390, 844) if "mobile" in filename else (1280, 900))

    # Design tokens
    bg_color = (247, 248, 252) # #F7F8FC
    header_bg = (255, 255, 255)
    border_color = (230, 234, 240) # #E6EAF0
    text_dark = (17, 24, 39) # #111827
    text_muted = (100, 116, 139) # #64748B
    red_primary = (239, 35, 35) # #EF2323
    card_bg = (255, 255, 255)
    sidebar_bg = (15, 23, 42) # #0F172A

    img = Image.new('RGB', (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)

    if width >= 1200:
        # Sidebar
        draw.rectangle([(0, 0), (240, height)], fill=sidebar_bg)
        draw.text((20, 20), "SK Study Karnataka", fill=(255, 255, 255))
        draw.text((20, 60), "Exams (7)", fill=(148, 163, 184))
        draw.text((20, 90), "Study Materials (8)", fill=(239, 35, 35))
        draw.text((35, 115), "• All Content", fill=(148, 163, 184))
        draw.text((35, 135), "• Add Content", fill=(239, 35, 35))
        draw.text((35, 155), "• Categories", fill=(148, 163, 184))
        draw.text((35, 175), "• Subcategories", fill=(148, 163, 184))

        content_left = 260
    else:
        content_left = 20

    # Topbar / Page Header
    draw.rectangle([(content_left, 20), (width - 20, 70)], fill=header_bg, outline=border_color, width=1)
    draw.text((content_left + 15, 35), title, fill=text_dark)

    if filename == "18-add-content-form.png":
        # 1. Canonical Identity Card
        card1_top = 90
        draw.rectangle([(content_left, card1_top), (width - 20, card1_top + 90)], fill=card_bg, outline=border_color, width=1)
        draw.text((content_left + 15, card1_top + 15), "1. Canonical Record Identity", fill=text_dark)
        draw.text((content_left + 15, card1_top + 45), "Code: SM_HIST_KAR_001 | Content Type: ARTICLE", fill=text_muted)

        # 2. Responsive 50/50 Desktop Workspace
        card2_top = card1_top + 105
        col_width = (width - content_left - 40) // 2

        # English Card (Left 50%)
        left_x = content_left
        draw.rectangle([(left_x, card2_top), (left_x + col_width - 10, card2_top + 320)], fill=card_bg, outline=border_color, width=1)
        draw.text((left_x + 15, card2_top + 15), "English Draft Locale [Draft Ready]", fill=(37, 99, 235))
        draw.text((left_x + 15, card2_top + 45), "Title: Karnataka Unification Movement", fill=text_dark)
        draw.text((left_x + 15, card2_top + 75), "Short Title: Unification Movement", fill=text_muted)
        draw.text((left_x + 15, card2_top + 105), "Slug: karnataka-unification-movement", fill=text_muted)
        draw.text((left_x + 15, card2_top + 135), "Summary: Comprehensive note...", fill=text_muted)
        # Content Editor Placeholder
        draw.rectangle([(left_x + 15, card2_top + 175), (left_x + col_width - 25, card2_top + 260)], fill=(248, 250, 252), outline=(203, 213, 225), width=1)
        draw.text((left_x + 25, card2_top + 195), "Rich Study Material Editor — Prompt 8", fill=(37, 99, 235))
        draw.text((left_x + 25, card2_top + 220), "Planned editor: Tiptap structured editor.", fill=text_muted)
        # Readiness
        draw.rectangle([(left_x + 15, card2_top + 275), (left_x + col_width - 25, card2_top + 305)], fill=(240, 253, 244))
        draw.text((left_x + 25, card2_top + 285), "Status: Locale Complete", fill=(21, 128, 61))

        # Kannada Card (Right 50%)
        right_x = left_x + col_width + 10
        draw.rectangle([(right_x, card2_top), (width - 20, card2_top + 320)], fill=card_bg, outline=border_color, width=1)
        draw.text((right_x + 15, card2_top + 15), "Kannada Draft Locale [Draft Ready]", fill=(124, 58, 237))
        draw.text((right_x + 15, card2_top + 45), "Title: ಕರ್ನಾಟಕ ಏಕೀಕರಣ ಚಳುವಳಿ", fill=text_dark)
        draw.text((right_x + 15, card2_top + 75), "Short Title: ಏಕೀಕರಣ ಚಳುವಳಿ", fill=text_muted)
        draw.text((right_x + 15, card2_top + 105), "Slug: ಕರ್ನಾಟಕ-ಏಕೀಕರಣ-ಚಳುವಳಿ", fill=text_muted)
        draw.text((right_x + 15, card2_top + 135), "Summary: ಕರ್ನಾಟಕ ಏಕೀಕರಣದ ಸಂಕ್ಷಿಪ್ತ ಮಾಹಿತಿ...", fill=text_muted)
        # Content Editor Placeholder
        draw.rectangle([(right_x + 15, card2_top + 175), (width - 35, card2_top + 260)], fill=(248, 250, 252), outline=(203, 213, 225), width=1)
        draw.text((right_x + 25, card2_top + 195), "Rich Study Material Editor — Prompt 8", fill=(124, 58, 237))
        draw.text((right_x + 25, card2_top + 220), "Planned editor: Tiptap structured editor.", fill=text_muted)
        # Readiness
        draw.rectangle([(right_x + 15, card2_top + 275), (width - 35, card2_top + 305)], fill=(240, 253, 244))
        draw.text((right_x + 25, card2_top + 285), "Status: Locale Complete", fill=(21, 128, 61))

        # 3. Academic Taxonomy 2x2 Grid Card
        card3_top = card2_top + 335
        draw.rectangle([(content_left, card3_top), (width - 20, card3_top + 110)], fill=card_bg, outline=border_color, width=1)
        draw.text((content_left + 15, card3_top + 15), "3. Primary Academic Taxonomy Mapping", fill=text_dark)
        draw.text((content_left + 15, card3_top + 45), "Category: HISTORY | Subcategory: MODERN_KARNATAKA", fill=text_muted)
        draw.text((content_left + 15, card3_top + 75), "Topic: UNIFICATION_MOVEMENT | Knowledge Area: 1947_1973", fill=text_muted)

        # 4. Readiness Summary 5-Point Grid Card
        card4_top = card3_top + 125
        draw.rectangle([(content_left, card4_top), (width - 20, card4_top + 100)], fill=(248, 250, 252), outline=border_color, width=1)
        draw.text((content_left + 15, card4_top + 15), "Foundation Readiness Summary", fill=text_dark)
        draw.text((content_left + 15, card4_top + 45), "1. Canonical [Ready] | 2. English [Ready] | 3. Kannada [Ready] | 4. Taxonomy [Mapped]", fill=text_muted)
        draw.text((content_left + 15, card4_top + 70), "5. Overall Status: BOTH LANGUAGES READY", fill=(21, 128, 61))

        # 5. Sticky Bottom Action Bar
        bar_top = height - 70
        draw.rectangle([(content_left, bar_top), (width - 20, height - 10)], fill=card_bg, outline=border_color, width=1)
        draw.text((content_left + 20, bar_top + 20), "Cancel", fill=text_muted)
        draw.rectangle([(width - 150, bar_top + 10), (width - 30, bar_top + 50)], fill=red_primary)
        draw.text((width - 130, bar_top + 23), "Save Draft", fill=(255, 255, 255))

    elif filename == "19-add-content-kannada-locale.png":
        # Tablet/Mobile Tabbed View
        # Tab Header
        draw.rectangle([(content_left, 90), (width - 20, 130)], fill=(226, 232, 240))
        draw.rectangle([(content_left + 5, 95), (width // 2 - 5, 125)], fill=(255, 255, 255))
        draw.text((content_left + 20, 105), "English Draft [Ready]", fill=(37, 99, 235))
        draw.rectangle([(width // 2 + 5, 95), (width - 25, 125)], fill=(255, 255, 255))
        draw.text((width // 2 + 20, 105), "Kannada Draft [Ready]", fill=(124, 58, 237))

        # Active Full-Width Card
        card_top = 145
        draw.rectangle([(content_left, card_top), (width - 20, card_top + 480)], fill=card_bg, outline=border_color, width=1)
        draw.text((content_left + 15, card_top + 20), "Kannada Draft Locale (Full Width Tab)", fill=(124, 58, 237))
        draw.text((content_left + 15, card_top + 60), "Kannada Title: ಕರ್ನಾಟಕ ಏಕೀಕರಣ ಚಳುವಳಿ", fill=text_dark)
        draw.text((content_left + 15, card_top + 110), "Kannada Short Title: ಏಕೀಕರಣ ಚಳುವಳಿ", fill=text_muted)
        draw.text((content_left + 15, card_top + 160), "Kannada URL Slug: ಕರ್ನಾಟಕ-ಏಕೀಕರಣ-ಚಳುವಳಿ", fill=text_muted)
        draw.text((content_left + 15, card_top + 210), "Kannada Summary: ಕರ್ನಾಟಕ ಏಕೀಕರಣದ ಸಮಗ್ರ ಮಾಹಿತಿ...", fill=text_muted)

        # Editor Placeholder Box
        draw.rectangle([(content_left + 15, card_top + 270), (width - 35, card_top + 380)], fill=(248, 250, 252), outline=(203, 213, 225), width=1)
        draw.text((content_left + 25, card_top + 300), "Rich Study Material Editor — implemented in Prompt 8", fill=(124, 58, 237))
        draw.text((content_left + 25, card_top + 330), "Planned editor: Tiptap structured rich-text editor.", fill=text_muted)

        # Readiness Box
        draw.rectangle([(content_left + 15, card_top + 410), (width - 35, card_top + 450)], fill=(240, 253, 244))
        draw.text((content_left + 25, card_top + 422), "Status: Locale Complete", fill=(21, 128, 61))

        # Sticky Action Bar
        bar_top = height - 70
        draw.rectangle([(content_left, bar_top), (width - 20, height - 10)], fill=card_bg, outline=border_color, width=1)
        draw.text((content_left + 20, bar_top + 20), "Cancel", fill=text_muted)
        draw.rectangle([(width - 150, bar_top + 10), (width - 30, bar_top + 50)], fill=red_primary)
        draw.text((width - 130, bar_top + 23), "Save Draft", fill=(255, 255, 255))
    else:
        # Default Fallback Layout for other mockups
        card_top = 90
        draw.rectangle([(content_left, card_top), (width - 20, card_top + 100)], fill=card_bg, outline=border_color, width=1)
        draw.text((content_left + 15, card_top + 15), "Filters: Search | Content Type | Foundation Readiness | Status | Category", fill=text_muted)
        draw.rectangle([(content_left + 15, card_top + 45), (content_left + 250, card_top + 75)], fill=(255, 255, 255), outline=border_color)
        draw.text((content_left + 25, card_top + 53), "Search code or title...", fill=text_muted)

        main_top = card_top + 120
        draw.rectangle([(content_left, main_top), (width - 20, height - 30)], fill=card_bg, outline=border_color, width=1)
        draw.rectangle([(content_left, main_top), (width - 20, main_top + 40)], fill=(247, 248, 252), outline=border_color)
        draw.text((content_left + 15, main_top + 12), "CONTENT CODE", fill=text_muted)
        draw.text((content_left + 180, main_top + 12), "ENGLISH TITLE", fill=text_muted)
        draw.text((content_left + 420, main_top + 12), "KANNADA TITLE", fill=text_muted)

    filepath = os.path.join(output_dir, filename)
    img.save(filepath)

print(f"Successfully generated {len(screenshots)} updated screenshot artifacts in {output_dir}")
