import { prisma, Prisma, InvoiceStatus } from '@study-karnataka/database';
import { format } from 'date-fns';
import PDFDocument from 'pdfkit';

export interface GetInvoicesQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  planId?: string;
  moduleId?: string;
}

export class InvoiceAdminService {
  /**
   * Helper to format currency
   */
  static formatCurrency(amount: number | string | Prisma.Decimal): string {
    const num = typeof amount === 'object' && 'toNumber' in amount ? amount.toNumber() : Number(amount);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  }

  /**
   * Generate human-readable invoice number: INV-YYYYMMDD-XXXXXX
   */
  static generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomHex = Math.floor(100000 + Math.random() * 900000).toString();
    return `INV-${year}${month}${day}-${randomHex}`;
  }

  /**
   * KPI Metrics
   * 1. Total Invoices (count all invoice records)
   * 2. Paid Invoices (status === 'PAID')
   * 3. Pending Invoices (status === 'PENDING')
   * 4. Failed / Cancelled Invoices (status in ['FAILED', 'CANCELLED'])
   */
  static async getMetrics() {
    const [totalInvoices, paidInvoices, pendingInvoices, failedCancelledInvoices] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: 'PAID' } }),
      prisma.invoice.count({ where: { status: 'PENDING' } }),
      prisma.invoice.count({ where: { status: { in: ['FAILED', 'CANCELLED'] } } }),
    ]);

    return {
      totalInvoices: { value: totalInvoices, trend: 0 },
      paidInvoices: { value: paidInvoices, trend: 0 },
      pendingInvoices: { value: pendingInvoices, trend: 0 },
      failedCancelledInvoices: { value: failedCancelledInvoices, trend: 0 },
    };
  }

  /**
   * List invoices with filters, search, and pagination
   */
  static async getInvoices(query: GetInvoicesQuery) {
    const {
      page = 1,
      pageSize = 10,
      sortBy = 'invoiceDate',
      sortOrder = 'desc',
      search,
      status,
      paymentMethod,
      startDate,
      endDate,
      planId,
      moduleId,
    } = query;

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: Prisma.InvoiceWhereInput = {};

    // Server-side Search support:
    // Invoice Number, Student Name, Student Email, Subscription ID, Transaction ID, Plan Name, Module Name, Gateway Payment ID
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { invoiceNumber: { contains: term, mode: 'insensitive' } },
        { gatewayPaymentId: { contains: term, mode: 'insensitive' } },
        { gatewayOrderId: { contains: term, mode: 'insensitive' } },
        { studentNameSnapshot: { contains: term, mode: 'insensitive' } },
        { studentEmailSnapshot: { contains: term, mode: 'insensitive' } },
        { planNameSnapshot: { contains: term, mode: 'insensitive' } },
        { moduleNameSnapshot: { contains: term, mode: 'insensitive' } },
        {
          student: {
            user: {
              OR: [
                { fullName: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
                { mobile: { contains: term, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          subscription: {
            subscriptionNumber: { contains: term, mode: 'insensitive' },
          },
        },
        {
          transaction: {
            transactionNumber: { contains: term, mode: 'insensitive' },
          },
        },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status as InvoiceStatus;
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      where.paymentMethod = { equals: paymentMethod, mode: 'insensitive' };
    }

    if (planId) {
      where.planId = planId;
    }

    if (moduleId) {
      where.moduleId = moduleId;
    }

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) {
        where.invoiceDate.gte = new Date(startDate);
      }
      if (endDate) {
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        where.invoiceDate.lte = endD;
      }
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          student: {
            include: { user: true },
          },
          subscription: {
            include: {
              plan: {
                include: {
                  module: {
                    include: { exam: true },
                  },
                },
              },
            },
          },
          transaction: true,
          items: true,
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      invoices: invoices.map(inv => ({
        ...inv,
        subtotal: inv.subtotal.toNumber(),
        discountAmount: inv.discountAmount.toNumber(),
        taxAmount: inv.taxAmount.toNumber(),
        finalAmount: inv.finalAmount.toNumber(),
        items: inv.items.map(it => ({
          ...it,
          unitAmount: it.unitAmount.toNumber(),
          discountAmount: it.discountAmount.toNumber(),
          taxAmount: it.taxAmount.toNumber(),
          finalAmount: it.finalAmount.toNumber(),
        })),
      })),
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / Number(pageSize)) || 1,
    };
  }

  /**
   * Get single invoice by ID with complete relationships
   */
  static async getInvoiceById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        student: {
          include: { user: true },
        },
        subscription: {
          include: {
            plan: {
              include: {
                module: {
                  include: { exam: true },
                },
              },
            },
          },
        },
        transaction: true,
        items: true,
      },
    });

    if (!invoice) return null;

    return {
      ...invoice,
      subtotal: invoice.subtotal.toNumber(),
      discountAmount: invoice.discountAmount.toNumber(),
      taxAmount: invoice.taxAmount.toNumber(),
      finalAmount: invoice.finalAmount.toNumber(),
      taxableAmount: invoice.taxableAmount?.toNumber() ?? null,
      cgst: invoice.cgst?.toNumber() ?? null,
      sgst: invoice.sgst?.toNumber() ?? null,
      igst: invoice.igst?.toNumber() ?? null,
      totalTax: invoice.totalTax?.toNumber() ?? null,
      discountValueSnapshot: invoice.discountValueSnapshot?.toNumber() ?? null,
      items: invoice.items.map(it => ({
        ...it,
        unitAmount: it.unitAmount.toNumber(),
        discountAmount: it.discountAmount.toNumber(),
        taxAmount: it.taxAmount.toNumber(),
        finalAmount: it.finalAmount.toNumber(),
      })),
    };
  }

  /**
   * Generate Invoice for a Transaction
   * - Enforces uniqueness (prevents accidental duplicate primary invoices)
   * - Snapshots historical values (Plan name, Module name, Exam name, amounts, student info)
   */
  static async createInvoiceForTransaction(transactionId: string) {
    // 1. Check if invoice already exists for this transaction
    const existing = await prisma.invoice.findUnique({
      where: { transactionId },
      include: { items: true },
    });
    if (existing) {
      return existing;
    }

    // 2. Fetch transaction with all relations
    const txn = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: {
        student: { include: { user: true } },
        subscription: {
          include: {
            plan: {
              include: {
                module: {
                  include: { exam: true },
                },
              },
            },
          },
        },
        couponRedemptions: {
          include: { coupon: true },
        },
      },
    });

    if (!txn) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }

    // Determine status
    let invoiceStatus: InvoiceStatus = InvoiceStatus.PAID;
    if (txn.status === 'PENDING' || txn.status === 'PROCESSING') {
      invoiceStatus = InvoiceStatus.PENDING;
    } else if (txn.status === 'FAILED') {
      invoiceStatus = InvoiceStatus.FAILED;
    } else if (txn.status === 'CANCELLED') {
      invoiceStatus = InvoiceStatus.CANCELLED;
    } else if (txn.status === 'REFUNDED') {
      invoiceStatus = InvoiceStatus.REFUNDED;
    } else if (txn.status === 'PARTIALLY_REFUNDED') {
      invoiceStatus = InvoiceStatus.PARTIALLY_REFUNDED;
    }

    const sub = txn.subscription;
    const plan = sub?.plan;
    const mod = plan?.module;
    const exam = mod?.exam;

    // Snapshot plan & module names
    const planName = plan?.name || (txn.planSnapshot as any)?.name || 'Subscription Plan';
    const moduleName = mod?.name || (txn.moduleSnapshot as any)?.name || 'Access Module';
    const examName = exam?.titleEn || 'Competitive Exam';

    // Financial calculations
    const finalAmount = txn.amount.toNumber();
    let discountAmount = 0;
    let couponCode: string | undefined;
    let discountType: string | undefined;
    let discountValue: number | undefined;

    if (txn.couponRedemptions && txn.couponRedemptions.length > 0) {
      const red = txn.couponRedemptions[0];
      discountAmount = red.discountAmount.toNumber();
      couponCode = red.coupon?.code;
      discountType = red.coupon?.discountType;
      discountValue = red.coupon?.discountValue ? Number(red.coupon.discountValue) : undefined;
    }

    const subtotal = plan?.price ? Number(plan.price) : finalAmount + discountAmount;
    const taxAmount = 0;

    // Billing period
    let billingPeriodSnapshot = '';
    if (sub?.startDate && sub?.endDate) {
      billingPeriodSnapshot = `${format(new Date(sub.startDate), 'dd MMM yyyy')} - ${format(new Date(sub.endDate), 'dd MMM yyyy')}`;
    }

    const invoiceNumber = this.generateInvoiceNumber();

    // Create Invoice with Item in a transaction
    const newInvoice = await prisma.$transaction(async tx => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          studentId: txn.studentId,
          subscriptionId: txn.subscriptionId,
          transactionId: txn.id,
          planId: txn.planId || plan?.id,
          moduleId: txn.moduleId || mod?.id,
          examId: txn.examId || exam?.id,
          currency: txn.currency || 'INR',
          subtotal: new Prisma.Decimal(subtotal),
          discountAmount: new Prisma.Decimal(discountAmount),
          taxAmount: new Prisma.Decimal(taxAmount),
          finalAmount: new Prisma.Decimal(finalAmount),
          paymentStatus: invoiceStatus,
          paymentMethod: txn.paymentMethod || txn.paymentSource || 'UPI',
          paymentGateway: txn.paymentProvider || 'RAZORPAY',
          gatewayOrderId: txn.gatewayOrderId,
          gatewayPaymentId: txn.gatewayPaymentId,
          invoiceDate: txn.paidAt || txn.createdAt,
          status: invoiceStatus,
          studentNameSnapshot: txn.student.user.fullName,
          studentEmailSnapshot: txn.student.user.email,
          studentPhoneSnapshot: txn.student.user.mobile,
          planNameSnapshot: planName,
          moduleNameSnapshot: moduleName,
          examNameSnapshot: examName,
          billingPeriodSnapshot,
          couponCodeSnapshot: couponCode,
          discountTypeSnapshot: discountType,
          discountValueSnapshot: discountValue ? new Prisma.Decimal(discountValue) : null,
          items: {
            create: [
              {
                name: planName,
                description: `${moduleName} (${examName})`,
                itemType: 'SUBSCRIPTION_PLAN',
                quantity: 1,
                unitAmount: new Prisma.Decimal(subtotal),
                discountAmount: new Prisma.Decimal(discountAmount),
                taxAmount: new Prisma.Decimal(taxAmount),
                finalAmount: new Prisma.Decimal(finalAmount),
              },
            ],
          },
        },
        include: { items: true },
      });

      // Update transaction invoiceId
      await tx.paymentTransaction.update({
        where: { id: txn.id },
        data: { invoiceId: inv.id },
      });

      // Update subscription invoiceId if subscription exists
      if (txn.subscriptionId) {
        await tx.studentSubscription.update({
          where: { id: txn.subscriptionId },
          data: { invoiceId: inv.id },
        });
      }

      return inv;
    });

    return newInvoice;
  }

  /**
   * Export Invoices to CSV
   */
  static async exportInvoices(query: GetInvoicesQuery): Promise<string> {
    const result = await this.getInvoices({ ...query, page: 1, pageSize: 10000 });
    const invoices = result.invoices;

    const headers = [
      'Invoice Number',
      'Student Name',
      'Student Email',
      'Subscription ID',
      'Plan',
      'Module',
      'Exam',
      'Subtotal',
      'Discount',
      'Tax',
      'Final Amount',
      'Currency',
      'Payment Method',
      'Status',
      'Transaction ID',
      'Invoice Date',
    ];

    const rows = invoices.map(inv => {
      const subNum = inv.subscription?.subscriptionNumber || inv.subscriptionId || '';
      const txnNum = inv.transaction?.transactionNumber || inv.transactionId || '';
      const dateStr = inv.invoiceDate ? format(new Date(inv.invoiceDate), 'yyyy-MM-dd HH:mm:ss') : '';

      return [
        `"${inv.invoiceNumber}"`,
        `"${inv.studentNameSnapshot || inv.student?.user?.fullName || ''}"`,
        `"${inv.studentEmailSnapshot || inv.student?.user?.email || ''}"`,
        `"${subNum}"`,
        `"${inv.planNameSnapshot || inv.subscription?.plan?.name || ''}"`,
        `"${inv.moduleNameSnapshot || ''}"`,
        `"${inv.examNameSnapshot || ''}"`,
        inv.subtotal,
        inv.discountAmount,
        inv.taxAmount,
        inv.finalAmount,
        `"${inv.currency}"`,
        `"${inv.paymentMethod || ''}"`,
        `"${inv.status}"`,
        `"${txnNum}"`,
        `"${dateStr}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Generate Invoice PDF as a Buffer using PDFKit
   */
  static async generateInvoicePdfBuffer(id: string): Promise<Buffer> {
    const invoice = await this.getInvoiceById(id);
    if (!invoice) {
      throw new Error(`Invoice with ID ${id} not found`);
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Invoice - ${invoice.invoiceNumber}`,
          Author: 'Study Karnataka Platform',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      // Header Brand
      doc.rect(40, 40, 515, 65).fill('#1E3A8A');
      doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('STUDY KARNATAKA', 60, 52);
      doc.fontSize(10).font('Helvetica').text('Official Student Subscription Tax Invoice', 60, 80);

      // Status Badge on top-right
      const statusText = invoice.status.toUpperCase();
      doc.fontSize(12).font('Helvetica-Bold').text(statusText, 450, 65, { align: 'right' });

      // Invoice Details Block
      doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('INVOICE TO:', 40, 125);
      doc.fontSize(10).font('Helvetica')
        .text(invoice.studentNameSnapshot || invoice.student?.user?.fullName || 'Student', 40, 142)
        .text(invoice.studentEmailSnapshot || invoice.student?.user?.email || '', 40, 157)
        .text(invoice.studentPhoneSnapshot || invoice.student?.user?.mobile || '', 40, 172);

      doc.fontSize(11).font('Helvetica-Bold').text('INVOICE DETAILS:', 340, 125);
      doc.fontSize(10).font('Helvetica')
        .text(`Invoice No: ${invoice.invoiceNumber}`, 340, 142)
        .text(`Invoice Date: ${format(new Date(invoice.invoiceDate), 'dd MMM yyyy, hh:mm a')}`, 340, 157)
        .text(`Payment Method: ${invoice.paymentMethod || 'Online'}`, 340, 172)
        .text(`Transaction Ref: ${invoice.transaction?.transactionNumber || invoice.gatewayPaymentId || 'N/A'}`, 340, 187);

      // Subscription & Academic Info Box
      doc.rect(40, 215, 515, 50).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text('SUBSCRIPTION & ACCESS DETAILS', 50, 223);
      doc.fontSize(9).font('Helvetica')
        .text(`Exam: ${invoice.examNameSnapshot || 'State Exams'}`, 50, 238)
        .text(`Module: ${invoice.moduleNameSnapshot || 'Comprehensive Preparation'}`, 50, 250);
      if (invoice.billingPeriodSnapshot) {
        doc.text(`Billing Period: ${invoice.billingPeriodSnapshot}`, 300, 238);
      }
      if (invoice.subscription?.subscriptionNumber) {
        doc.text(`Subscription ID: ${invoice.subscription.subscriptionNumber}`, 300, 250);
      }

      // Items Table Header
      const tableTop = 285;
      doc.rect(40, tableTop, 515, 24).fill('#2563EB');
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
        .text('#', 50, tableTop + 7)
        .text('DESCRIPTION / ITEM', 75, tableTop + 7)
        .text('QTY', 330, tableTop + 7, { align: 'center', width: 30 })
        .text('UNIT PRICE', 380, tableTop + 7, { align: 'right', width: 70 })
        .text('AMOUNT', 460, tableTop + 7, { align: 'right', width: 85 });

      // Table Row
      const rowTop = tableTop + 30;
      doc.rect(40, rowTop - 5, 515, 30).fill('#FFFFFF').stroke('#E2E8F0');
      doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold')
        .text('1', 50, rowTop)
        .text(invoice.planNameSnapshot || 'Student Subscription Plan', 75, rowTop);
      doc.fontSize(8).font('Helvetica').fillColor('#64748B')
        .text(invoice.moduleNameSnapshot ? `Access to ${invoice.moduleNameSnapshot}` : 'Digital Study Course', 75, rowTop + 12);

      doc.fillColor('#0F172A').fontSize(9).font('Helvetica')
        .text('1', 330, rowTop, { align: 'center', width: 30 })
        .text(`Rs. ${invoice.subtotal.toFixed(2)}`, 380, rowTop, { align: 'right', width: 70 })
        .text(`Rs. ${invoice.subtotal.toFixed(2)}`, 460, rowTop, { align: 'right', width: 85 });

      // Summary Breakdown
      const summaryTop = rowTop + 50;
      const rightX = 350;
      const width = 195;

      doc.fillColor('#475569').fontSize(9).font('Helvetica')
        .text('Subtotal (Plan Price):', rightX, summaryTop)
        .text(`Rs. ${invoice.subtotal.toFixed(2)}`, rightX, summaryTop, { align: 'right', width });

      if (invoice.discountAmount > 0) {
        const discountLabel = invoice.couponCodeSnapshot
          ? `Coupon Discount (${invoice.couponCodeSnapshot}):`
          : 'Discount Applied:';
        doc.text(discountLabel, rightX, summaryTop + 16)
          .text(`- Rs. ${invoice.discountAmount.toFixed(2)}`, rightX, summaryTop + 16, { align: 'right', width });
      }

      doc.text('Taxes (GST 0% - Educational):', rightX, summaryTop + 32)
        .text(`Rs. ${invoice.taxAmount.toFixed(2)}`, rightX, summaryTop + 32, { align: 'right', width });

      // Total Line
      doc.rect(rightX - 10, summaryTop + 48, width + 20, 28).fill('#EFF6FF').stroke('#BFDBFE');
      doc.fillColor('#1D4ED8').fontSize(11).font('Helvetica-Bold')
        .text('Total Paid:', rightX, summaryTop + 56)
        .text(`Rs. ${invoice.finalAmount.toFixed(2)} INR`, rightX, summaryTop + 56, { align: 'right', width });

      // Terms & Footer
      doc.fillColor('#94A3B8').fontSize(8).font('Helvetica')
        .text('Terms & Conditions:', 40, 680)
        .text('1. This is a computer generated invoice and does not require a physical signature.', 40, 692)
        .text('2. Subscription access is granted digitally according to the plan terms.', 40, 704)
        .text('Study Karnataka • Empowering aspirants across Karnataka with premier exam prep', 40, 750, {
          align: 'center',
          width: 515,
        });

      doc.end();
    });
  }
}
