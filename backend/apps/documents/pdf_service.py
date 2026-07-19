import io
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.platypus import Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from django.conf import settings
from django.utils import timezone


PRIMARY = colors.HexColor('#2563eb')
DARK = colors.HexColor('#1e3a8a')
LIGHT_BLUE = colors.HexColor('#dbeafe')
GRAY = colors.HexColor('#6b7280')
LIGHT_GRAY = colors.HexColor('#f9fafb')
SUCCESS = colors.HexColor('#059669')
WARNING = colors.HexColor('#d97706')
DANGER = colors.HexColor('#dc2626')


def verify_url(verification_code: str) -> str:
    """Lien de vérification embarqué dans le QR code de chaque document."""
    base = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    return f'{base}/verify/{verification_code}'


def format_fcfa(amount) -> str:
    """Formate un montant avec séparateur de milliers (espace, convention FR) — ex: '350 000 FCFA'."""
    try:
        value = float(amount or 0)
    except (TypeError, ValueError):
        value = 0
    return f"{value:,.0f}".replace(',', ' ') + ' FCFA'


def generate_qr_code(data: str) -> io.BytesIO:
    qr = qrcode.QRCode(version=1, box_size=4, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf


def _header_footer(canvas, doc, university_name, doc_title, ref_value='', ref_label='Code'):
    canvas.saveState()
    w, h = A4

    # Header line
    canvas.setStrokeColor(PRIMARY)
    canvas.setLineWidth(2)
    canvas.line(2*cm, h - 2.5*cm, w - 2*cm, h - 2.5*cm)

    # University name
    canvas.setFont('Helvetica-Bold', 14)
    canvas.setFillColor(DARK)
    canvas.drawString(2*cm, h - 2*cm, university_name)

    # Doc title
    canvas.setFont('Helvetica', 9)
    canvas.setFillColor(GRAY)
    canvas.drawRightString(w - 2*cm, h - 2*cm, doc_title)

    # Footer
    canvas.setStrokeColor(colors.HexColor('#e5e7eb'))
    canvas.setLineWidth(0.5)
    canvas.line(2*cm, 2*cm, w - 2*cm, 2*cm)
    canvas.setFont('Helvetica', 7)
    canvas.setFillColor(GRAY)
    canvas.drawString(2*cm, 1.5*cm, f'Document généré par TIRAHOU · {timezone.now().strftime("%d/%m/%Y %H:%M")}')
    if ref_value:
        canvas.drawRightString(w - 2*cm, 1.5*cm, f'{ref_label}: {ref_value}')
    canvas.drawCentredString(w / 2, 1.5*cm, f'Page {doc.page}')

    canvas.restoreState()


def generate_certificat_scolarite(student, enrollment, university_name, verification_code):
    """Génère un certificat de scolarité PDF."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=3.5*cm, bottomMargin=3*cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('title', fontSize=16, fontName='Helvetica-Bold',
                                  textColor=DARK, alignment=TA_CENTER, spaceAfter=20)
    label_style = ParagraphStyle('label', fontSize=10, fontName='Helvetica-Bold',
                                  textColor=GRAY, spaceBefore=4)
    value_style = ParagraphStyle('value', fontSize=10, fontName='Helvetica', spaceBefore=2)
    body_style = ParagraphStyle('body', fontSize=10, fontName='Helvetica',
                                 leading=16, spaceAfter=8)

    story = []

    # Title
    story.append(Paragraph('CERTIFICAT DE SCOLARITÉ', title_style))
    story.append(HRFlowable(width='100%', thickness=1, color=LIGHT_BLUE, spaceAfter=20))

    # Info table
    data = [
        ['Nom complet', student.user.get_full_name()],
        ['Matricule', student.student_id],
        ['Nationalité', student.nationality],
        ['Date de naissance', student.birth_date.strftime('%d/%m/%Y') if student.birth_date else '—'],
        ['Programme', enrollment.program.name],
        ['Niveau', f'Licence {student.current_level}'],
        ['Année académique', enrollment.academic_year.label],
    ]

    table = Table(data, colWidths=[5*cm, 12*cm])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), GRAY),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, LIGHT_GRAY]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    story.append(table)
    story.append(Spacer(1, 20))

    # Body text
    text = (
        f"Le présent certificat atteste que l'étudiant(e) <b>{student.user.get_full_name()}</b> "
        f"est régulièrement inscrit(e) à <b>{university_name}</b> pour l'année académique "
        f"<b>{enrollment.academic_year.label}</b>, en <b>{enrollment.program.name}</b>, "
        f"niveau <b>Licence {student.current_level}</b>."
    )
    story.append(Paragraph(text, body_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Ce certificat est délivré pour servir et valoir ce que de droit.",
        body_style
    ))
    story.append(Spacer(1, 30))

    # QR Code
    verify_link = verify_url(verification_code)
    qr_buf = generate_qr_code(verify_link)
    qr_img = RLImage(qr_buf, width=3*cm, height=3*cm)

    qr_table = Table([[qr_img, Paragraph(
        f'<b>Code de vérification</b><br/>'
        f'<font size="14" color="#2563eb"><b>{verification_code}</b></font><br/>'
        f'<font size="8" color="#6b7280">{verify_link}</font>',
        ParagraphStyle('qr', fontSize=10, leading=16)
    )]], colWidths=[4*cm, 13*cm])
    qr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(qr_table)

    doc.build(
        story,
        onFirstPage=lambda c, d: _header_footer(c, d, university_name, 'Certificat de Scolarité', verification_code),
        onLaterPages=lambda c, d: _header_footer(c, d, university_name, 'Certificat de Scolarité', verification_code),
    )
    buf.seek(0)
    return buf


def generate_releve_notes(student, ue_results, semester_result, university_name, verification_code):
    """Génère un relevé de notes PDF."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=3.5*cm, bottomMargin=3*cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('title', fontSize=16, fontName='Helvetica-Bold',
                                  textColor=DARK, alignment=TA_CENTER, spaceAfter=20)
    section_style = ParagraphStyle('section', fontSize=11, fontName='Helvetica-Bold',
                                    textColor=PRIMARY, spaceBefore=16, spaceAfter=8)

    story = []
    story.append(Paragraph('RELEVÉ DE NOTES', title_style))
    if semester_result:
        story.append(Paragraph(semester_result.semester.label.upper(), ParagraphStyle(
            'sub', fontSize=12, fontName='Helvetica', textColor=GRAY, alignment=TA_CENTER, spaceAfter=16
        )))
    story.append(HRFlowable(width='100%', thickness=1, color=LIGHT_BLUE, spaceAfter=16))

    # Student info
    story.append(Paragraph('Informations étudiant', section_style))
    info_data = [
        ['Nom', student.user.get_full_name(), 'Matricule', student.student_id],
    ]
    info_table = Table(info_data, colWidths=[3*cm, 8*cm, 3*cm, 4*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), GRAY),
        ('TEXTCOLOR', (2, 0), (2, -1), GRAY),
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 16))

    # Grades table
    story.append(Paragraph('Résultats par Unité d\'Enseignement', section_style))
    headers = ['Code UE', 'Intitulé', 'Crédits', 'Moyenne', 'Décision']
    table_data = [headers]

    for r in ue_results:
        avg_str = f"{float(r.average):.2f}/20" if r.average is not None else '—'
        decision_str = (r.decision or '—').upper()
        table_data.append([
            r.ue.code, r.ue.name[:40], str(r.ue.credits), avg_str, decision_str
        ])

    grades_table = Table(table_data, colWidths=[2.5*cm, 8*cm, 2*cm, 2.5*cm, 2.5*cm])
    grade_styles = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]
    for i, r in enumerate(ue_results, 1):
        if i < len(table_data):
            bg = colors.white if i % 2 == 0 else LIGHT_GRAY
            grade_styles.append(('BACKGROUND', (0, i), (-1, i), bg))
            avg = r.average
            if avg is not None:
                color = SUCCESS if float(avg) >= 10 else DANGER
                grade_styles.append(('TEXTCOLOR', (3, i), (3, i), color))
                grade_styles.append(('FONTNAME', (3, i), (3, i), 'Helvetica-Bold'))
            decision = r.decision or ''
            dec_color = SUCCESS if decision in ['valide', 'compense'] else DANGER
            grade_styles.append(('TEXTCOLOR', (4, i), (4, i), dec_color))

    grades_table.setStyle(TableStyle(grade_styles))
    story.append(grades_table)
    story.append(Spacer(1, 20))

    # Summary
    if semester_result:
        avg_val = float(semester_result.average) if semester_result.average else 0
        summary_data = [
            ['Moyenne générale', f'{avg_val:.2f}/20',
             'Crédits validés', f'{semester_result.credits_obtained}/{semester_result.total_credits}',
             'Décision', (semester_result.decision or '—').upper()],
        ]
        summary_table = Table(summary_data, colWidths=[3.5*cm, 3*cm, 3*cm, 3*cm, 2.5*cm, 2.5*cm])
        summary_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTNAME', (4, 0), (4, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), GRAY),
            ('TEXTCOLOR', (2, 0), (2, -1), GRAY),
            ('TEXTCOLOR', (4, 0), (4, -1), GRAY),
            ('TEXTCOLOR', (1, 0), (1, -1), PRIMARY),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0f9ff')),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#bfdbfe')),
        ]))
        story.append(summary_table)

    doc.build(
        story,
        onFirstPage=lambda c, d: _header_footer(c, d, university_name, 'Relevé de Notes', verification_code),
        onLaterPages=lambda c, d: _header_footer(c, d, university_name, 'Relevé de Notes', verification_code),
    )
    buf.seek(0)
    return buf


def generate_fiche_inscription(student, enrollment, university_name, verification_code):
    """Génère une fiche d'inscription PDF."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=3.5*cm, bottomMargin=3*cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('title', fontSize=16, fontName='Helvetica-Bold',
                                 textColor=DARK, alignment=TA_CENTER, spaceAfter=16)
    body_style = ParagraphStyle('body', fontSize=10, fontName='Helvetica', leading=16)

    story = []
    story.append(Paragraph("FICHE D'INSCRIPTION", title_style))
    story.append(HRFlowable(width='100%', thickness=1, color=LIGHT_BLUE, spaceAfter=16))

    data = [
        ['N° inscription', enrollment.enrollment_number],
        ['Année académique', enrollment.academic_year.label],
        ['Programme', enrollment.program.name],
        ['Type', enrollment.get_type_display() if hasattr(enrollment, 'get_type_display') else enrollment.type],
        ['Statut', enrollment.get_status_display() if hasattr(enrollment, 'get_status_display') else enrollment.status],
        ['Étudiant', student.user.get_full_name()],
        ['Matricule', student.student_id],
        ['Email', student.user.email],
        ['Téléphone', student.user.phone or '—'],
        ['Nationalité', student.nationality],
        ['Date de naissance', student.birth_date.strftime('%d/%m/%Y') if student.birth_date else '—'],
        ['Lieu de naissance', student.birth_place or '—'],
        ['Adresse', student.address or '—'],
    ]

    table = Table(data, colWidths=[5.2*cm, 11.8*cm])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (0, -1), GRAY),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, LIGHT_GRAY]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    story.append(table)
    story.append(Spacer(1, 18))

    verify_link = verify_url(verification_code)
    qr_buf = generate_qr_code(verify_link)
    qr_img = RLImage(qr_buf, width=3*cm, height=3*cm)
    qr_table = Table([[qr_img, Paragraph(
        f"<b>Vérification</b><br/>"
        f"<font size='14' color='#2563eb'><b>{verification_code}</b></font><br/>"
        f"<font size='8' color='#6b7280'>{verify_link}</font>",
        ParagraphStyle('qr', fontSize=10, leading=16),
    )]], colWidths=[4*cm, 13*cm])
    qr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(qr_table)
    story.append(Spacer(1, 18))
    story.append(Paragraph(
        "Fiche générée par le système TIRAHOU. Toute falsification est passible de sanctions.",
        body_style,
    ))

    doc.build(
        story,
        onFirstPage=lambda c, d: _header_footer(c, d, university_name, "Fiche d'inscription", verification_code),
        onLaterPages=lambda c, d: _header_footer(c, d, university_name, "Fiche d'inscription", verification_code),
    )
    buf.seek(0)
    return buf


VIOLET = colors.HexColor('#7c3aed')


def _gradient_rect(c, x, y, w, h, radius, color_start=PRIMARY, color_end=VIOLET, horizontal=True):
    """Rectangle (coins arrondis) rempli d'un dégradé — bandeaux de la carte étudiant."""
    c.saveState()
    p = c.beginPath()
    p.roundRect(x, y, w, h, radius)
    c.clipPath(p, stroke=0, fill=0)
    if horizontal:
        c.linearGradient(x, y, x + w, y, [color_start, color_end], [0, 1])
    else:
        c.linearGradient(x, y + h, x, y, [color_start, color_end], [0, 1])
    c.restoreState()


def _card_logo_badge(c, x, y, size):
    """Pastille de marque (carré arrondi blanc, lettre T colorée) — mini logo TIRAHOU."""
    c.saveState()
    c.setFillColor(colors.white)
    c.roundRect(x, y, size, size, size * 0.28, stroke=0, fill=1)
    c.setFillColor(PRIMARY)
    c.setFont('Helvetica-Bold', (size / cm) * 18)
    c.drawCentredString(x + size / 2, y + size * 0.32, 'T')
    c.restoreState()


def _fit_text(c, text, font_name, font_size, max_width):
    """Tronque `text` (avec ellipse) pour qu'il tienne dans `max_width` points."""
    if c.stringWidth(text, font_name, font_size) <= max_width:
        return text
    ellipsis = '…'
    while text and c.stringWidth(text + ellipsis, font_name, font_size) > max_width:
        text = text[:-1]
    return (text + ellipsis) if text else ellipsis


def _card_watermark(c, card_w, card_h, text='TIRAHOU'):
    """Filigrane discret en fond de carte (aspect infalsifiable)."""
    c.saveState()
    c.setFillColor(PRIMARY)
    c.setFillAlpha(0.06)
    c.setFont('Helvetica-Bold', 34)
    c.translate(card_w / 2, card_h * 0.42)
    c.rotate(18)
    c.drawCentredString(0, 0, text)
    c.restoreState()


def _card_qr_block(c, card_w, x_right, y, size, verification_code, caption='Scanner pour vérifier'):
    """Bloc QR code encadré, avec légende et code — recto et verso."""
    box_pad = 0.12 * cm
    box_x, box_y = x_right - size - box_pad, y - box_pad
    box_w, box_h = size + 2 * box_pad, size + 2 * box_pad
    c.setFillColor(colors.white)
    c.setStrokeColor(colors.HexColor('#e5e7eb'))
    c.roundRect(box_x, box_y, box_w, box_h, 0.08 * cm, stroke=1, fill=1)
    verify_link = verify_url(verification_code)
    qr_buf = generate_qr_code(verify_link)
    RLImage(qr_buf, width=size, height=size).drawOn(c, x_right - size, y)
    c.setFont('Helvetica', 5)
    c.setFillColor(GRAY)
    c.drawCentredString(x_right - size / 2, y - 0.32 * cm, caption)
    c.setFont('Helvetica-Bold', 5.5)
    c.setFillColor(DARK)
    c.drawCentredString(x_right - size / 2, y - 0.58 * cm, verification_code)


def generate_carte_etudiant(student, enrollment, university_name, verification_code):
    """Génère une carte d'étudiant PDF (format ID-1 standard, recto + verso)."""
    buf = io.BytesIO()

    from reportlab.pdfgen import canvas
    card_w, card_h = (8.6*cm, 5.4*cm)
    c = canvas.Canvas(buf, pagesize=(card_w, card_h))
    radius = 0.22 * cm
    header_h = 1.55 * cm

    # ═══════════════════════════════════════════ RECTO ═══════════════════════
    # Fond carte (coins arrondis, léger contour)
    c.setFillColor(colors.white)
    c.roundRect(0, 0, card_w, card_h, radius, stroke=0, fill=1)
    c.setStrokeColor(colors.HexColor('#e5e7eb'))
    c.setLineWidth(0.75)
    c.roundRect(0.05*cm, 0.05*cm, card_w-0.1*cm, card_h-0.1*cm, radius, stroke=1, fill=0)

    _card_watermark(c, card_w, card_h)

    # Bandeau d'en-tête dégradé
    _gradient_rect(c, 0, card_h - header_h, card_w, header_h, radius)
    _card_logo_badge(c, 0.3*cm, card_h - 1.2*cm, 0.62*cm)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 7.5)
    uni_label = _fit_text(c, university_name, 'Helvetica-Bold', 7.5, card_w - 1.1*cm - 0.3*cm)
    c.drawString(1.1*cm, card_h - 0.65*cm, uni_label)
    c.setFont('Helvetica-Bold', 11)
    c.drawString(1.1*cm, card_h - 1.15*cm, "CARTE D'ÉTUDIANT")

    # Photo (encadrée, coins arrondis)
    photo_x, photo_y = 0.4*cm, 1.05*cm
    photo_w, photo_h = 2.0*cm, 2.5*cm
    c.setFillColor(colors.white)
    c.setStrokeColor(PRIMARY)
    c.setLineWidth(1.1)
    c.roundRect(photo_x - 0.06*cm, photo_y - 0.06*cm, photo_w + 0.12*cm, photo_h + 0.12*cm, 0.1*cm, stroke=1, fill=1)
    try:
        if student.photo and hasattr(student.photo, 'path'):
            c.drawImage(student.photo.path, photo_x, photo_y, width=photo_w, height=photo_h,
                        preserveAspectRatio=True, anchor='c', mask='auto')
        else:
            raise FileNotFoundError("no photo")
    except Exception:
        c.setFillColor(LIGHT_GRAY)
        c.rect(photo_x, photo_y, photo_w, photo_h, fill=1, stroke=0)
        c.setFillColor(GRAY)
        c.setFont('Helvetica', 6)
        c.drawCentredString(photo_x + photo_w/2, photo_y + photo_h/2, "PHOTO")

    # Bloc d'informations
    info_x = photo_x + photo_w + 0.4*cm
    y = card_h - header_h - 0.4*cm
    c.setFillColor(DARK)
    c.setFont('Helvetica-Bold', 9.5)
    c.drawString(info_x, y, student.user.get_full_name()[:26])
    y -= 0.5*cm

    def field(label, value):
        nonlocal y
        c.setFont('Helvetica-Bold', 5.5)
        c.setFillColor(PRIMARY)
        c.drawString(info_x, y, label.upper())
        c.setFont('Helvetica', 7.5)
        c.setFillColor(colors.black)
        c.drawString(info_x, y - 0.28*cm, value)
        y -= 0.66*cm

    field('Matricule', student.student_id)
    field('Programme', enrollment.program.name[:24])
    field('Niveau · Année', f"Licence {student.current_level} · {enrollment.academic_year.label}")

    if enrollment.academic_year.end_date:
        c.setFont('Helvetica-Oblique', 5.5)
        c.setFillColor(GRAY)
        c.drawString(info_x, 0.35*cm, f"Valable jusqu'au {enrollment.academic_year.end_date.strftime('%d/%m/%Y')}")

    _card_qr_block(c, card_w, card_w - 0.35*cm, 0.75*cm, 1.55*cm, verification_code)

    # Liseré d'accent en pied de carte
    _gradient_rect(c, 0, 0, card_w, 0.1*cm, 0)

    c.showPage()

    # ═══════════════════════════════════════════ VERSO ═══════════════════════
    c.setFillColor(colors.white)
    c.roundRect(0, 0, card_w, card_h, radius, stroke=0, fill=1)
    c.setStrokeColor(colors.HexColor('#e5e7eb'))
    c.setLineWidth(0.75)
    c.roundRect(0.05*cm, 0.05*cm, card_w-0.1*cm, card_h-0.1*cm, radius, stroke=1, fill=0)

    back_header_h = 0.95*cm
    _gradient_rect(c, 0, card_h - back_header_h, card_w, back_header_h, radius)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 8)
    c.drawCentredString(card_w/2, card_h - 0.42*cm, 'TIRAHOU')
    c.setFont('Helvetica', 5.5)
    c.drawCentredString(card_w/2, card_h - 0.72*cm, 'Système Intégré de Gestion Universitaire')

    rules = [
        "Cette carte est strictement personnelle, non transférable et doit être présentée",
        "à toute demande d'un membre du personnel habilité de l'établissement.",
        "En cas de perte ou de vol, le signaler immédiatement au service de la scolarité.",
    ]
    ry = card_h - back_header_h - 0.35*cm
    c.setFont('Helvetica', 6)
    c.setFillColor(GRAY)
    for line in rules:
        c.drawString(0.4*cm, ry, line)
        ry -= 0.32*cm

    # Zones de signature
    sig_y, sig_w, sig_h = 1.55*cm, 2.85*cm, 1.0*cm
    for i, label in enumerate(["Signature de l'étudiant", "Cachet de l'établissement"]):
        sx = 0.4*cm + i * (sig_w + 0.3*cm)
        c.setStrokeColor(colors.HexColor('#d1d5db'))
        c.setLineWidth(0.6)
        c.roundRect(sx, sig_y, sig_w, sig_h, 0.08*cm, stroke=1, fill=0)
        c.setFont('Helvetica', 5.2)
        c.setFillColor(GRAY)
        c.drawCentredString(sx + sig_w/2, sig_y - 0.28*cm, label)

    _card_qr_block(c, card_w, card_w - 0.35*cm, 0.75*cm, 1.1*cm, verification_code, caption='Vérification')
    c.setFont('Helvetica', 5)
    c.setFillColor(GRAY)
    c.drawString(0.4*cm, 0.4*cm, f"Émise le {timezone.now().strftime('%d/%m/%Y')}")

    _gradient_rect(c, 0, 0, card_w, 0.1*cm, 0)

    c.showPage()
    c.save()
    buf.seek(0)
    return buf


def generate_convocation(recipient_name, event_title, event_date, event_location, university_name, verification_code, extra_notes=''):
    """Génère une convocation PDF (soutenance, examen, entretien...)."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=3.5*cm, bottomMargin=3*cm,
    )

    title_style = ParagraphStyle('title', fontSize=16, fontName='Helvetica-Bold',
                                  textColor=DARK, alignment=TA_CENTER, spaceAfter=20)
    body_style = ParagraphStyle('body', fontSize=10, fontName='Helvetica', leading=16, spaceAfter=8)
    label_style = ParagraphStyle('label', fontSize=10, fontName='Helvetica-Bold', textColor=GRAY)

    story = [
        Paragraph('CONVOCATION', title_style),
        HRFlowable(width='100%', thickness=1, color=LIGHT_BLUE, spaceAfter=20),
    ]

    data = [
        ['Destinataire', recipient_name],
        ['Objet', event_title],
        ['Date', event_date],
        ['Lieu', event_location or '—'],
    ]
    table = Table(data, colWidths=[5*cm, 12*cm])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), GRAY),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, LIGHT_GRAY]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(table)
    story.append(Spacer(1, 20))

    text = (
        f"Vous êtes convoqué(e) à <b>{event_title}</b>, prévu(e) le <b>{event_date}</b>"
        + (f" à <b>{event_location}</b>" if event_location else '') + ". "
        "Merci de vous présenter avec une pièce d'identité valide."
    )
    story.append(Paragraph(text, body_style))
    if extra_notes:
        story.append(Spacer(1, 8))
        story.append(Paragraph(extra_notes, body_style))
    story.append(Spacer(1, 30))

    verify_link = verify_url(verification_code)
    qr_buf = generate_qr_code(verify_link)
    qr_img = RLImage(qr_buf, width=3*cm, height=3*cm)
    qr_table = Table([[qr_img, Paragraph(
        f'<b>Code de vérification</b><br/>'
        f'<font size="14" color="#2563eb"><b>{verification_code}</b></font>',
        ParagraphStyle('qr', fontSize=10, leading=16)
    )]], colWidths=[4*cm, 13*cm])
    qr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(qr_table)

    doc.build(
        story,
        onFirstPage=lambda c, d: _header_footer(c, d, university_name, 'Convocation', verification_code),
        onLaterPages=lambda c, d: _header_footer(c, d, university_name, 'Convocation', verification_code),
    )
    buf.seek(0)
    return buf


def generate_diplome(student, program, academic_year, university_name, verification_code, mention='', is_final_cycle_attestation=False):
    """Génère un diplôme (ou attestation de fin de cycle) PDF, en paysage."""
    buf = io.BytesIO()
    from reportlab.lib.pagesizes import landscape
    doc = SimpleDocTemplate(
        buf, pagesize=landscape(A4),
        leftMargin=2.5*cm, rightMargin=2.5*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm,
    )

    title_style = ParagraphStyle('title', fontSize=22, fontName='Helvetica-Bold',
                                  textColor=DARK, alignment=TA_CENTER, spaceAfter=16)
    subtitle_style = ParagraphStyle('subtitle', fontSize=13, fontName='Helvetica',
                                     textColor=GRAY, alignment=TA_CENTER, spaceAfter=24)
    name_style = ParagraphStyle('name', fontSize=20, fontName='Helvetica-Bold',
                                 textColor=PRIMARY, alignment=TA_CENTER, spaceAfter=16)
    body_style = ParagraphStyle('body', fontSize=12, fontName='Helvetica',
                                 alignment=TA_CENTER, leading=20, spaceAfter=10)

    doc_label = "ATTESTATION DE FIN DE CYCLE" if is_final_cycle_attestation else "DIPLÔME"

    story = [
        Spacer(1, 20),
        Paragraph(university_name, subtitle_style),
        Paragraph(doc_label, title_style),
        HRFlowable(width='60%', thickness=1.5, color=PRIMARY, spaceAfter=30, hAlign='CENTER'),
        Paragraph("Le présent document est délivré à", body_style),
        Paragraph(student.user.get_full_name(), name_style),
        Paragraph(
            f"Né(e) le {student.birth_date.strftime('%d/%m/%Y') if student.birth_date else '—'}, "
            f"matricule <b>{student.student_id}</b>", body_style
        ),
        Paragraph(
            f"pour avoir satisfait aux exigences du programme <b>{program.name}</b> "
            f"au titre de l'année académique <b>{academic_year.label}</b>"
            + (f", avec la mention <b>{mention}</b>" if mention else "") + ".",
            body_style
        ),
        Spacer(1, 40),
    ]

    verify_link = verify_url(verification_code)
    qr_buf = generate_qr_code(verify_link)
    qr_img = RLImage(qr_buf, width=2.8*cm, height=2.8*cm)
    footer_table = Table([[
        qr_img,
        Paragraph(
            f'<font size="9" color="#6b7280">Code de vérification</font><br/>'
            f'<font size="12" color="#2563eb"><b>{verification_code}</b></font>',
            ParagraphStyle('qr', fontSize=9, leading=14, alignment=TA_LEFT)
        ),
        Paragraph(
            f'<font size="9" color="#6b7280">Fait le</font><br/>'
            f'<font size="11"><b>{timezone.now().strftime("%d/%m/%Y")}</b></font>',
            ParagraphStyle('date', fontSize=9, leading=14, alignment=TA_RIGHT)
        ),
    ]], colWidths=[3.5*cm, 8*cm, 8*cm])
    footer_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
    story.append(footer_table)

    doc.build(
        story,
        onFirstPage=lambda c, d: _header_footer(c, d, university_name, doc_label, verification_code),
        onLaterPages=lambda c, d: _header_footer(c, d, university_name, doc_label, verification_code),
    )
    buf.seek(0)
    return buf


def generate_pv_deliberation(rows, semester_label, session_label, university_name):
    """
    Génère un PV de délibération PDF (liste des résultats semestriels d'une
    session, avec décision par étudiant et zones de signature du jury).
    `rows` : itérable d'objets SemesterResult (student, average, credits_obtained,
    total_credits, decision).
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=3.5*cm, bottomMargin=3*cm,
    )

    title_style = ParagraphStyle('title', fontSize=16, fontName='Helvetica-Bold',
                                  textColor=DARK, alignment=TA_CENTER, spaceAfter=4)
    sub_style = ParagraphStyle('sub', fontSize=11, fontName='Helvetica', textColor=GRAY,
                                alignment=TA_CENTER, spaceAfter=16)
    section_style = ParagraphStyle('section', fontSize=10, fontName='Helvetica',
                                    textColor=GRAY, spaceAfter=8)

    rows = list(rows)
    story = [
        Paragraph('PROCÈS-VERBAL DE DÉLIBÉRATION', title_style),
        Paragraph(' · '.join(x for x in [semester_label, session_label] if x) or 'Tous semestres', sub_style),
        HRFlowable(width='100%', thickness=1, color=LIGHT_BLUE, spaceAfter=12),
        Paragraph(
            f"Généré le {timezone.now().strftime('%d/%m/%Y à %H:%M')} · {len(rows)} étudiant(s)",
            section_style
        ),
    ]

    headers = ['Matricule', 'Étudiant', 'Moyenne', 'Crédits', 'Décision']
    table_data = [headers]
    for r in rows:
        avg_str = f"{float(r.average):.2f}/20" if r.average is not None else '—'
        credits_str = f"{r.credits_obtained}/{r.total_credits}" if r.total_credits is not None else '—'
        full_name = r.student.user.get_full_name() if getattr(r.student, 'user', None) else str(r.student)
        table_data.append([r.student.student_id, full_name[:35], avg_str, credits_str, (r.decision or '—').upper()])

    results_table = Table(table_data, colWidths=[3*cm, 6.5*cm, 2.5*cm, 2.5*cm, 2.5*cm], repeatRows=1)
    row_styles = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]
    for i in range(1, len(table_data)):
        bg = colors.white if i % 2 == 0 else LIGHT_GRAY
        row_styles.append(('BACKGROUND', (0, i), (-1, i), bg))
        decision = (rows[i-1].decision or '').lower()
        dec_color = SUCCESS if decision in ('valide', 'compense', 'admis') else DANGER if decision else GRAY
        row_styles.append(('TEXTCOLOR', (4, i), (4, i), dec_color))
        row_styles.append(('FONTNAME', (4, i), (4, i), 'Helvetica-Bold'))
    results_table.setStyle(TableStyle(row_styles))
    story.append(results_table)
    story.append(Spacer(1, 30))

    # Zones de signature du jury
    sig_style = ParagraphStyle('sig', fontSize=9, fontName='Helvetica', textColor=GRAY, alignment=TA_CENTER)
    sig_table = Table(
        [[HRFlowable(width='90%', thickness=0.75, color=colors.HexColor('#9ca3af'), hAlign='CENTER')] * 2,
         [Paragraph('Le Président du Jury', sig_style), Paragraph('Les Membres du Jury', sig_style)]],
        colWidths=[8.5*cm, 8.5*cm],
    )
    sig_table.setStyle(TableStyle([('TOPPADDING', (0, 1), (-1, 1), 4)]))
    story.append(sig_table)

    doc.build(
        story,
        onFirstPage=lambda c, d: _header_footer(c, d, university_name, 'PV de Délibération'),
        onLaterPages=lambda c, d: _header_footer(c, d, university_name, 'PV de Délibération'),
    )
    buf.seek(0)
    return buf


STATUS_COLOR = {
    'payee': SUCCESS, 'valide': SUCCESS,
    'partiellement_payee': WARNING, 'en_attente': WARNING,
    'emise': GRAY, 'brouillon': GRAY,
    'annulee': DANGER, 'rejete': DANGER, 'rembourse': DANGER,
}


def generate_facture(invoice, items, university_name):
    """Génère une facture PDF (même design system que les autres documents officiels)."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=3.5*cm, bottomMargin=3*cm,
    )

    title_style = ParagraphStyle('title', fontSize=16, fontName='Helvetica-Bold',
                                  textColor=DARK, alignment=TA_CENTER, spaceAfter=4)
    sub_style = ParagraphStyle('sub', fontSize=12, fontName='Helvetica', textColor=GRAY,
                                alignment=TA_CENTER, spaceAfter=16)
    section_style = ParagraphStyle('section', fontSize=11, fontName='Helvetica-Bold',
                                    textColor=PRIMARY, spaceBefore=16, spaceAfter=8)

    status_color = STATUS_COLOR.get(invoice.status, GRAY)
    status_label = invoice.get_status_display()

    story = [
        Paragraph('FACTURE', title_style),
        Paragraph(invoice.invoice_number, sub_style),
        HRFlowable(width='100%', thickness=1, color=LIGHT_BLUE, spaceAfter=16),
        Paragraph('Informations', section_style),
    ]

    info_data = [
        ['Étudiant', invoice.student.user.get_full_name(), 'Matricule', invoice.student.student_id],
        ['Année académique', invoice.academic_year.label,
         'Échéance', invoice.due_date.strftime('%d/%m/%Y') if invoice.due_date else '—'],
    ]
    info_table = Table(info_data, colWidths=[3.2*cm, 6.8*cm, 3*cm, 4*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), GRAY),
        ('TEXTCOLOR', (2, 0), (2, -1), GRAY),
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f'<font color="#{status_color.hexval()[2:]}"><b>Statut : {status_label}</b></font>',
        ParagraphStyle('status', fontSize=10, fontName='Helvetica')
    ))
    story.append(Spacer(1, 16))

    # Lignes de facturation
    story.append(Paragraph('Détail', section_style))
    headers = ['Libellé', 'Montant']
    table_data = [headers]
    for it in items:
        table_data.append([it.label, format_fcfa(it.amount)])
    if not items:
        table_data.append(['— (aucune ligne) —', ''])

    items_table = Table(table_data, colWidths=[13*cm, 4*cm])
    item_styles = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]
    for i in range(1, len(table_data)):
        bg = colors.white if i % 2 == 0 else LIGHT_GRAY
        item_styles.append(('BACKGROUND', (0, i), (-1, i), bg))
    items_table.setStyle(TableStyle(item_styles))
    story.append(items_table)
    story.append(Spacer(1, 20))

    # Totaux
    summary_data = [
        ['Total', format_fcfa(invoice.total_amount)],
        ['Remise', format_fcfa(invoice.discount_amount)],
        ['Payé', format_fcfa(invoice.paid_amount)],
        ['Reste à payer', format_fcfa(invoice.remaining_amount)],
    ]
    summary_table = Table(summary_data, colWidths=[13*cm, 4*cm])
    summary_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTSIZE', (0, -1), (-1, -1), 11),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('TEXTCOLOR', (0, 0), (0, -1), GRAY),
        ('TEXTCOLOR', (1, -1), (1, -1), PRIMARY),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0f9ff')),
        ('LINEABOVE', (0, -1), (-1, -1), 0.75, colors.HexColor('#bfdbfe')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#bfdbfe')),
    ]))
    story.append(summary_table)

    doc.build(
        story,
        onFirstPage=lambda c, d: _header_footer(c, d, university_name, 'Facture', invoice.invoice_number, 'Facture'),
        onLaterPages=lambda c, d: _header_footer(c, d, university_name, 'Facture', invoice.invoice_number, 'Facture'),
    )
    buf.seek(0)
    return buf


def generate_recu_paiement(payment, invoice, university_name):
    """Génère un reçu (quittance) de paiement PDF (même design system que les autres documents officiels)."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=3.5*cm, bottomMargin=3*cm,
    )

    title_style = ParagraphStyle('title', fontSize=16, fontName='Helvetica-Bold',
                                  textColor=DARK, alignment=TA_CENTER, spaceAfter=4)
    sub_style = ParagraphStyle('sub', fontSize=12, fontName='Helvetica', textColor=GRAY,
                                alignment=TA_CENTER, spaceAfter=16)
    section_style = ParagraphStyle('section', fontSize=11, fontName='Helvetica-Bold',
                                    textColor=PRIMARY, spaceBefore=16, spaceAfter=8)
    body_style = ParagraphStyle('body', fontSize=10, fontName='Helvetica', leading=16, spaceAfter=8)

    student = invoice.student
    status_color = STATUS_COLOR.get(payment.status, GRAY)

    story = [
        Paragraph('REÇU DE PAIEMENT', title_style),
        Paragraph(payment.receipt_number or '—', sub_style),
        HRFlowable(width='100%', thickness=1, color=LIGHT_BLUE, spaceAfter=16),
        Paragraph('Informations', section_style),
    ]

    info_data = [
        ['Étudiant', student.user.get_full_name(), 'Matricule', student.student_id],
        ['Facture', invoice.invoice_number, 'Année académique', invoice.academic_year.label],
        ['Date de paiement', (payment.paid_at or timezone.now()).strftime('%d/%m/%Y %H:%M'),
         'Mode', payment.get_method_display()],
    ]
    info_table = Table(info_data, colWidths=[3.5*cm, 6.5*cm, 3.5*cm, 3.5*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), GRAY),
        ('TEXTCOLOR', (2, 0), (2, -1), GRAY),
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f'<font color="#{status_color.hexval()[2:]}"><b>Statut du paiement : {payment.get_status_display()}</b></font>',
        ParagraphStyle('status', fontSize=10, fontName='Helvetica')
    ))
    story.append(Spacer(1, 16))

    # Montant payé (mis en avant)
    amount_table = Table([['Montant reçu', format_fcfa(payment.amount)]], colWidths=[13*cm, 4*cm])
    amount_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (0, 0), 11),
        ('FONTSIZE', (1, 0), (1, 0), 14),
        ('TEXTCOLOR', (0, 0), (0, 0), GRAY),
        ('TEXTCOLOR', (1, 0), (1, 0), SUCCESS),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdf4')),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#bbf7d0')),
    ]))
    story.append(amount_table)
    story.append(Spacer(1, 20))

    # Récapitulatif facture
    story.append(Paragraph('Récapitulatif de la facture', section_style))
    summary_data = [
        ['Total facture', format_fcfa(invoice.total_amount),
         'Remise', format_fcfa(invoice.discount_amount)],
        ['Total payé à ce jour', format_fcfa(invoice.paid_amount),
         'Reste à payer', format_fcfa(invoice.remaining_amount)],
    ]
    summary_table = Table(summary_data, colWidths=[4.5*cm, 4*cm, 4*cm, 4*cm])
    summary_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), GRAY),
        ('TEXTCOLOR', (2, 0), (2, -1), GRAY),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ALIGN', (3, 0), (3, -1), 'RIGHT'),
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 24))
    story.append(Paragraph("Ce reçu fait foi de paiement et doit être conservé par l'étudiant.", body_style))

    doc.build(
        story,
        onFirstPage=lambda c, d: _header_footer(c, d, university_name, 'Reçu de Paiement', payment.receipt_number, 'Reçu'),
        onLaterPages=lambda c, d: _header_footer(c, d, university_name, 'Reçu de Paiement', payment.receipt_number, 'Reçu'),
    )
    buf.seek(0)
    return buf
