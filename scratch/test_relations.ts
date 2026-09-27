import { prisma } from '@study-karnataka/database';

async function main() {
  const txn = await prisma.paymentTransaction.findFirst({
    include: {
      subscription: {
        include: {
          plan: {
            include: {
              module: {
                include: {
                  exam: true,
                },
              },
            },
          },
        },
      },
      refunds: true,
      invoice: true,
    },
  });

  console.log('Sample Txn found:', !!txn);
  if (txn) {
    console.log('Txn ID:', txn.id);
    console.log('Txn Plan ID:', txn.planId);
    console.log('Txn Plan Name:', txn.subscription?.plan?.name);
    console.log('Txn Module Name:', txn.subscription?.plan?.module?.name);
    console.log('Txn Exam Title:', txn.subscription?.plan?.module?.exam?.title);
    console.log('Txn Refunds count:', txn.refunds.length);
    console.log('Txn Invoice ID:', txn.invoice?.id);
  }

  const exams = await prisma.examCycle.findMany({ select: { id: true, titleEn: true, titleKn: true } });
  console.log('Total Exams:', exams.length, exams.map(e => e.titleEn));

  const modules = await prisma.subscriptionModule.findMany({
    select: { id: true, name: true, examId: true, exam: { select: { id: true, titleEn: true } } },
  });
  console.log('Modules with Exams:', JSON.stringify(modules, null, 2));

  const plans = await prisma.subscriptionPlan.findMany({ select: { id: true, name: true, moduleId: true, price: true } });
  console.log('Total Plans:', plans.length, plans.map(p => ({ name: p.name, price: p.price })));

  const refunds = await prisma.refund.findMany();
  console.log('Total Refunds:', refunds.length);
}

main().finally(() => prisma.$disconnect());
