import { PrismaClient } from '@study-karnataka/database';
import { TeamService } from './apps/api/src/services/team.service';

async function main() {
  const srv = new TeamService();
  const res = await srv.listMembers({});
  console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);
