import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { PrismaClient } from '@prisma/client';
import { StudyPlanGenerationService } from './src/services/study-plan-generation.service';

const prisma = new PrismaClient();

async function fix() {
  const plans = await prisma.studentStudyPlan.findMany({
    where: { status: 'ACTIVE' }
  });
  
  for (const plan of plans) {
    console.log(`Regenerating schedule for ${plan.id}`);
    try {
      await prisma.studyPlanDay.deleteMany({ where: { studyPlanId: plan.id } });
      await StudyPlanGenerationService.generateInitial30DayPlan(plan.id, plan.planStartDate);
      console.log(`Success for ${plan.id}`);
    } catch (err: any) {
      console.error(`Error for ${plan.id}:`, err.message);
    }
  }
}

fix().then(() => console.log('Done')).catch(console.error);
