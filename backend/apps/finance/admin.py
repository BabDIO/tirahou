from django.contrib import admin
from .models import FeeType, Invoice, InvoiceItem, Payment, Scholarship, Installment


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    fields = ('fee_type', 'label', 'amount')


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    fields = ('amount', 'method', 'status', 'receipt_number', 'paid_at')
    readonly_fields = ('receipt_number',)


class InstallmentInline(admin.TabularInline):
    model = Installment
    extra = 0
    fields = ('number', 'amount', 'due_date', 'status', 'paid_at')


@admin.register(FeeType)
class FeeTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'amount', 'academic_year', 'is_mandatory', 'is_active')
    list_filter = ('category', 'academic_year', 'is_mandatory', 'is_active')
    search_fields = ('name',)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'get_student', 'academic_year', 'total_amount',
                    'paid_amount', 'get_remaining', 'status', 'due_date')
    list_filter = ('status', 'academic_year')
    search_fields = ('invoice_number', 'student__student_id', 'student__user__last_name')
    readonly_fields = ('invoice_number', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    inlines = [InvoiceItemInline, PaymentInline, InstallmentInline]
    date_hierarchy = 'created_at'
    list_select_related = ('student__user', 'academic_year')

    def get_student(self, obj):
        return f"{obj.student.student_id} — {obj.student.user.get_full_name()}"
    get_student.short_description = 'Étudiant'

    def get_remaining(self, obj):
        return f"{obj.remaining_amount:,.0f} FCFA"
    get_remaining.short_description = 'Reste'


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('receipt_number', 'get_student', 'amount', 'method', 'status', 'paid_at', 'validated_by')
    list_filter = ('status', 'method')
    search_fields = ('receipt_number', 'transaction_ref', 'invoice__student__user__last_name')
    readonly_fields = ('receipt_number', 'created_at')
    ordering = ('-paid_at',)
    date_hierarchy = 'created_at'

    def get_student(self, obj):
        return obj.invoice.student.user.get_full_name()
    get_student.short_description = 'Étudiant'


@admin.register(Scholarship)
class ScholarshipAdmin(admin.ModelAdmin):
    list_display = ('get_student', 'type', 'amount', 'percentage', 'academic_year', 'granted_by')
    list_filter = ('type', 'academic_year')
    search_fields = ('student__student_id', 'student__user__last_name')

    def get_student(self, obj):
        return obj.student.user.get_full_name()
    get_student.short_description = 'Étudiant'
