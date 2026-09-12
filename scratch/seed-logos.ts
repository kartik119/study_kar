import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const kpscSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%238B0000" stroke="%23FFD700" stroke-width="3"/><circle cx="50" cy="50" r="40" fill="%23B22222"/><path d="M50 20 L58 36 L75 38 L62 50 L66 68 L50 58 L34 68 L38 50 L25 38 L42 36 Z" fill="%23FFD700"/><circle cx="50" cy="46" r="8" fill="%238B0000"/><text x="50" y="82" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="%23FFFFFF" text-anchor="middle">KPSC</text></svg>`;

const upscSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23084B7A" stroke="%23E2A03F" stroke-width="3"/><circle cx="50" cy="50" r="40" fill="%230A3656"/><path d="M50 22 L55 35 L68 37 L58 46 L61 60 L50 52 L39 60 L42 46 L32 37 L45 35 Z" fill="%23E2A03F"/><text x="50" y="80" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="%23FFFFFF" text-anchor="middle">UPSC</text></svg>`;

const kspSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%231E3A8A" stroke="%23F59E0B" stroke-width="3"/><polygon points="50,15 61,38 85,38 66,54 73,78 50,63 27,78 34,54 15,38 39,38" fill="%23F59E0B"/><text x="50" y="60" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="%231E3A8A" text-anchor="middle">POLICE</text><text x="50" y="90" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="%23FFFFFF" text-anchor="middle">KSP</text></svg>`;

const smSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" fill="%23084B7A"/><path d="M22 28 L50 18 L78 28 L78 74 L50 84 L22 74 Z" fill="%23FFFFFF" opacity="0.95"/><path d="M50 18 L50 84" stroke="%23084B7A" stroke-width="3"/><text x="50" y="55" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="%23084B7A" text-anchor="middle">NOTE</text></svg>`;

async function main() {
  await prisma.examAuthority.updateMany({
    where: { code: 'KPSC' },
    data: { logoUrl: kpscSvg }
  });
  await prisma.examAuthority.updateMany({
    where: { code: 'DEMO_KPSC' },
    data: { logoUrl: kpscSvg }
  });
  await prisma.examAuthority.updateMany({
    where: { code: 'UPSC' },
    data: { logoUrl: upscSvg }
  });
  await prisma.examAuthority.updateMany({
    where: { code: { contains: 'POLICE' } },
    data: { logoUrl: kspSvg }
  });
  await prisma.examAuthority.updateMany({
    where: { code: 'PSI' },
    data: { logoUrl: kspSvg }
  });

  // Update cycles with appropriate authority logo
  await prisma.examCycle.updateMany({
    where: { cycleCode: { contains: 'KAS' } },
    data: { logoUrl: kpscSvg }
  });
  await prisma.examCycle.updateMany({
    where: { cycleCode: { contains: 'KARTIK' } },
    data: { logoUrl: upscSvg }
  });
  await prisma.examCycle.updateMany({
    where: { cycleCode: { contains: 'PSI' } },
    data: { logoUrl: kspSvg }
  });

  // Seed study material logos
  await prisma.studyMaterial.updateMany({
    where: { logoUrl: null },
    data: { logoUrl: smSvg }
  });

  console.log('Successfully updated logos in DB!');
}

main().finally(() => process.exit(0));
