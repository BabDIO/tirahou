import io
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.platypus import Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from django.utils import timezone


PRIMARY = colors.HexColor('#2563eb')
DARK = colors.HexColor('#1e3a8a')
LIGHT_BLUE = colors.HexColor('#dbeafe')
GRAY = colors.HexColor('#6b7280')
LIGHT_GRAY = colors.HexColor('#f9fafb')
SUCCESS = colors.HexColor('#059669')
DANGER = colors.HexColor('#dc2626')


def generate_qr_code(data: str) -> io.BytesIO:
    qr = qrcode.QRCode(version=1, box_size=4, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf


def _header_footer(canvas, doc, university_name, doc_title, verification_code):
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
    canvas.drawString(2*cm, 1.5*cm, f'Document généré par SIGUVH · {timezone.now().strftime("%d/%m/%Y %H:%M")}')
    canvas.drawRightString(w - 2*cm, 1.5*cm, f'Code: {verification_code}')
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
    verify_url = f'http://siguvh.edu/verify/{verification_code}'
    qr_buf = generate_qr_code(verify_url)
    qr_img = RLImage(qr_buf, width=3*cm, height=3*cm)

    qr_table = Table([[qr_img, Paragraph(
        f'<b>Code de vérification</b><br/>'
        f'<font size="14" color="#2563eb"><b>{verification_code}</b></font><br/>'
        f'<font size="8" color="#6b7280">{verify_url}</font>',
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

    verify_url = f'http://siguvh.edu/verify/{verification_code}'
    qr_buf = generate_qr_code(verify_url)
    qr_img = RLImage(qr_buf, width=3*cm, height=3*cm)
    qr_table = Table([[qr_img, Paragraph(
        f"<b>Vérification</b><br/>"
        f"<font size='14' color='#2563eb'><b>{verification_code}</b></font><br/>"
        f"<font size='8' color='#6b7280'>{verify_url}</font>",
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
        "Fiche générée par le système SIGUVH. Toute falsification est passible de sanctions.",
        body_style,
    ))

    doc.build(
        story,
        onFirstPage=lambda c, d: _header_footer(c, d, university_name, "Fiche d'inscription", verification_code),
        onLaterPages=lambda c, d: _header_footer(c, d, university_name, "Fiche d'inscription", verification_code),
    )
    buf.seek(0)
    return buf


def generate_carte_etudiant(student, enrollment, university_name, verification_code):
    """Génère une carte d'étudiant PDF (format carte simple)."""
    buf = io.BytesIO()

    from reportlab.pdfgen import canvas
    card_w, card_h = (9.0*cm, 5.6*cm)
    c = canvas.Canvas(buf, pagesize=(card_w, card_h))

    # Fond
    c.setFillColor(colors.white)
    c.rect(0, 0, card_w, card_h, fill=1, stroke=0)
    c.setStrokeColor(PRIMARY)
    c.setLineWidth(2)
    c.rect(0.2*cm, 0.2*cm, card_w-0.4*cm, card_h-0.4*cm, fill=0, stroke=1)

    # Header
    c.setFont('Helvetica-Bold', 10)
    c.setFillColor(DARK)
    c.drawString(0.6*cm, card_h - 0.9*cm, university_name[:28])
    c.setFont('Helvetica', 8)
    c.setFillColor(GRAY)
    c.drawString(0.6*cm, card_h - 1.35*cm, "CARTE D'ÉTUDIANT")

    # Photo (optionnelle)
    photo_x, photo_y = 0.6*cm, card_h - 4.9*cm
    photo_w, photo_h = 2.2*cm, 2.8*cm
    try:
        if student.photo and hasattr(student.photo, 'path'):
            c.drawImage(student.photo.path, photo_x, photo_y, width=photo_w, height=photo_h, preserveAspectRatio=True, mask='auto')
        else:
            raise Exception("no photo")
    except Exception:
        c.setStrokeColor(colors.HexColor('#e5e7eb'))
        c.setFillColor(LIGHT_GRAY)
        c.rect(photo_x, photo_y, photo_w, photo_h, fill=1, stroke=1)
        c.setFillColor(GRAY)
        c.setFont('Helvetica', 6)
        c.drawCentredString(photo_x + photo_w/2, photo_y + photo_h/2, "PHOTO")

    # Infos
    c.setFillColor(colors.black)
    c.setFont('Helvetica-Bold', 8)
    c.drawString(3.1*cm, card_h - 2.1*cm, student.user.get_full_name()[:28])
    c.setFont('Helvetica', 7)
    c.setFillColor(GRAY)
    c.drawString(3.1*cm, card_h - 2.55*cm, f"Matricule: {student.student_id}")
    c.drawString(3.1*cm, card_h - 2.95*cm, f"Programme: {enrollment.program.name[:22]}")
    c.drawString(3.1*cm, card_h - 3.35*cm, f"Année: {enrollment.academic_year.label}")
    c.drawString(3.1*cm, card_h - 3.75*cm, f"Niveau: L{student.current_level}")

    # QR
    verify_url = f'http://siguvh.edu/verify/{verification_code}'
    qr_buf = generate_qr_code(verify_url)
    qr_img = RLImage(qr_buf, width=1.8*cm, height=1.8*cm)
    qr_img.drawOn(c, card_w - 2.5*cm, 0.6*cm)
    c.setFont('Helvetica', 5.5)
    c.setFillColor(GRAY)
    c.drawRightString(card_w - 0.6*cm, 0.4*cm, verification_code)

    c.showPage()
    c.save()
    buf.seek(0)
    return buf
